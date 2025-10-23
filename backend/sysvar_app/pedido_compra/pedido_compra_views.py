from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.utils import timezone
from django.db.models import Sum, F
from rest_framework import viewsets, permissions, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
import django_filters

from ..models import (
    PedidoCompra,
    PedidoCompraItem,
    PedidoCompraEntrega,
    PedidoCompraParcela,
    FormaPagamento,
    FormaPagamentoParcela,
)

from .pedido_compra_serializers import (
    PedidoCompraListSerializer,
    PedidoCompraDetailSerializer,
    PedidoCompraItemSerializer,
    PedidoCompraEntregaSerializer,
    PedidoCompraParcelaSerializer,
)

# =========================
# [AUDITORIA] helpers
# =========================
try:
    from auditoria.utils import write_audit, snapshot_instance  # type: ignore
except Exception:
    def write_audit(*args, **kwargs):
        return
    def snapshot_instance(obj):
        return {}

def _audit_pc(request, pedido_or_id, action, before=None, after=None, reason=None, extra=None):
    pid = int(getattr(pedido_or_id, "Idpedidocompra", pedido_or_id))
    try:
        write_audit(
            request=request,
            model_name="PedidoCompra",
            object_id=pid,
            action=str(action),
            before=before,
            after=after,
            reason=reason,
            extra=extra,
        )
        return
    except TypeError:
        try:
            diff = {}
            if before is not None: diff["before"] = before
            if after  is not None: diff["after"]  = after
            if extra  is not None: diff["extra"]  = extra
            write_audit(
                request=request,
                model="PedidoCompra",
                object_id=pid,
                verb=str(action),
                diff=diff if diff else None,
                note=reason,
            )
        except Exception:
            pass
    except Exception:
        pass


# Códigos de status (2 chars)
STATUS_ABERTO = "AB"
STATUS_APROVADO = "AP"
STATUS_CANCELADO = "CA"
STATUS_ATENDIDO = "AT"
STATUS_PARCIAL_ABERTO = "PA"
STATUS_PARCIAL_ENCERRADO = "PE"

# Transições permitidas (⚠️ agora permite AP -> AB)
# Mapa simples de transições permitidas
TRANSICOES = {
    STATUS_ABERTO: {STATUS_APROVADO, STATUS_CANCELADO},
    STATUS_APROVADO: set(),          # ⬅️ antes permitia CA; agora AP não sai para lugar nenhum via "reabrir"
    STATUS_CANCELADO: {STATUS_ABERTO},
}


# =========================
# FUNÇÕES GLOBAIS (reuso)
# =========================
def _quantize(v: Decimal) -> Decimal:
    return (v or Decimal("0")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

def aplicar_forma_pagamento(pedido: PedidoCompra, forma: FormaPagamento):
    pedido.condicao_pagamento = forma.codigo
    pedido.condicao_pagamento_detalhe = forma.descricao
    pedido.parcelas = forma.num_parcelas
    pedido.save(update_fields=["condicao_pagamento", "condicao_pagamento_detalhe", "parcelas"])

    PedidoCompraParcela.objects.filter(pedido=pedido).delete()

    total = pedido.Valorpedido or Decimal("0")
    base_dt = pedido.Datapedido or timezone.localdate()

    defs = list(
        FormaPagamentoParcela.objects
        .filter(forma=forma)
        .order_by("ordem")
        .values("ordem", "dias", "percentual", "valor_fixo")
    )
    if not defs:
        defs = [{"ordem": 1, "dias": 0, "percentual": Decimal("100"), "valor_fixo": Decimal("0")}]

    valores = []
    for d in defs:
        perc = Decimal(str(d.get("percentual") or "0"))
        fixo = Decimal(str(d.get("valor_fixo") or "0"))
        if perc > 0:
            val = _quantize(total * (perc / Decimal("100")))
        elif fixo > 0:
            val = _quantize(fixo)
        else:
            val = Decimal("0.00")
        valores.append(val)

    if total > 0 and valores:
        diff = _quantize(total - sum(valores))
        valores[-1] = _quantize(valores[-1] + diff)

    linhas = []
    for i, d in enumerate(defs):
        prazo = int(d.get("dias") or 0)
        venc = base_dt + timedelta(days=prazo)
        linhas.append(PedidoCompraParcela(
            pedido=pedido,
            parcela=int(d.get("ordem") or (i + 1)),
            prazo_dias=prazo,
            vencimento=venc,
            valor=valores[i],
            forma=forma.codigo,
            observacao=None,
        ))
    if linhas:
        PedidoCompraParcela.objects.bulk_create(linhas)

def regen_parcelas_if_needed(pedido: PedidoCompra, *, request=None, motivo: str | None = None):
    if not pedido or pedido.Status != PedidoCompra.StatusChoices.AB:
        return
    if not pedido.condicao_pagamento:
        return
    try:
        forma = FormaPagamento.objects.get(codigo=pedido.condicao_pagamento)
    except FormaPagamento.DoesNotExist:
        return

    soma_antes = (PedidoCompraParcela.objects
                  .filter(pedido=pedido).aggregate(s=Sum("valor"))["s"] or Decimal("0.00"))

    aplicar_forma_pagamento(pedido, forma)

    soma_depois = (PedidoCompraParcela.objects
                   .filter(pedido=pedido).aggregate(s=Sum("valor"))["s"] or Decimal("0.00"))

    _audit_pc(
        request=request,
        pedido_or_id=pedido,
        action="regen_parcelas_auto",
        before={"soma_parcelas": float(soma_antes)},
        after={"soma_parcelas": float(soma_depois), "valorpedido": float(pedido.Valorpedido or 0)},
        reason=motivo or "Total do pedido alterado com Status=AB",
        extra={"condicao_pagamento": pedido.condicao_pagamento}
    )


# =========================
# Filters
# =========================
class PedidoCompraFilter(django_filters.FilterSet):
    status = django_filters.CharFilter(field_name="Status", lookup_expr="exact")
    tipo_pedido = django_filters.CharFilter(field_name="tipo_pedido", lookup_expr="exact")

    emissao_de = django_filters.DateFilter(field_name="Datapedido", lookup_expr="gte")
    emissao_ate = django_filters.DateFilter(field_name="Datapedido", lookup_expr="lte")

    entrega_de = django_filters.DateFilter(field_name="Dataentrega", lookup_expr="gte")
    entrega_ate = django_filters.DateFilter(field_name="Dataentrega", lookup_expr="lte")

    fornecedor = django_filters.NumberFilter(field_name="Idfornecedor_id", lookup_expr="exact")
    q_fornecedor = django_filters.CharFilter(method="filter_q_fornecedor")

    loja = django_filters.NumberFilter(field_name="Idloja_id", lookup_expr="exact")
    q_loja = django_filters.CharFilter(method="filter_q_loja")

    ordering = django_filters.OrderingFilter(
        fields=(
            ("Datapedido", "Datapedido"),
            ("Dataentrega", "Dataentrega"),
            ("Idpedidocompra", "Idpedidocompra"),
            ("Valorpedido", "Valorpedido"),
        )
    )

    class Meta:
        model = PedidoCompra
        fields = []

    def filter_q_fornecedor(self, queryset, name, value):
        if not value:
            return queryset
        return queryset.filter(Idfornecedor__Nome_fornecedor__icontains=value)

    def filter_q_loja(self, queryset, name, value):
        if not value:
            return queryset
        return queryset.filter(Idloja__nome_loja__icontains=value)


# =========================
# ViewSets
# =========================
class PedidoCompraViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = PedidoCompra.objects.all().select_related("Idfornecedor", "Idloja")
    serializer_class = PedidoCompraDetailSerializer
    filterset_class = PedidoCompraFilter
    search_fields = []
    ordering_fields = ["Datapedido", "Dataentrega", "Idpedidocompra", "Valorpedido"]
    ordering = ["-Datapedido", "Idpedidocompra"]

    def get_serializer_class(self):
        if self.action in ("list",):
            return PedidoCompraListSerializer
        return super().get_serializer_class()

    def _pode_mudar(self, de, para) -> bool:
        if de is None:
            return True
        return para in TRANSICOES.get(de, set())

    def _agora_data(self):
        return timezone.localdate()

    @transaction.atomic
    @action(detail=True, methods=["post"])
    def aprovar(self, request, pk=None):
        from .pedido_compra_serializers import PedidoCompraDetailSerializer
        pedido: PedidoCompra = self.get_object()

        if not self._pode_mudar(pedido.Status, STATUS_APROVADO):
            return Response(
                {"detail": f"Transição não permitida: {pedido.Status or 'None'} → {STATUS_APROVADO}."},
                status=status.HTTP_409_CONFLICT,
            )

        tem_itens = PedidoCompraItem.objects.filter(Idpedidocompra=pedido).exists()
        if not tem_itens:
            return Response({"detail": "Não é possível aprovar um pedido sem itens."},
                            status=status.HTTP_400_BAD_REQUEST)

        if not pedido.condicao_pagamento:
            return Response({"detail": "Defina a forma de pagamento antes de aprovar."},
                            status=status.HTTP_400_BAD_REQUEST)

        soma = (PedidoCompraParcela.objects.filter(pedido=pedido)
                .aggregate(s=Sum("valor"))["s"] or Decimal("0.00"))
        if (pedido.Valorpedido or Decimal("0.00")).quantize(Decimal("0.01")) != (soma or Decimal("0.00")).quantize(Decimal("0.01")):
            return Response({"detail": "Parcelas não somam ao Valorpedido."},
                            status=status.HTTP_400_BAD_REQUEST)

        if not pedido.Datapedido:
            pedido.Datapedido = self._agora_data()

        before = {"Status": pedido.Status, "Datapedido": str(pedido.Datapedido or "")}
        pedido.Status = STATUS_APROVADO
        pedido.save(update_fields=["Datapedido", "Status"])

        _audit_pc(
            request=request,
            pedido_or_id=pedido,
            action="aprovar",
            before=before,
            after={"Status": pedido.Status, "Datapedido": str(pedido.Datapedido)},
            reason=(request.data or {}).get("motivo") or None
        )

        ser = PedidoCompraDetailSerializer(pedido, context={"request": request})
        return Response(ser.data)

    @transaction.atomic
    @action(detail=True, methods=["post"])
    def cancelar(self, request, pk=None):
        from .pedido_compra_serializers import PedidoCompraDetailSerializer
        pedido: PedidoCompra = self.get_object()

        if not self._pode_mudar(pedido.Status, STATUS_CANCELADO):
            return Response(
                {"detail": f"Transição não permitida: {pedido.Status or 'None'} → {STATUS_CANCELADO}."},
                status=status.HTTP_409_CONFLICT,
            )

        motivo = (request.data or {}).get("motivo")

        before = {"Status": pedido.Status}
        pedido.Status = STATUS_CANCELADO
        pedido.save(update_fields=["Status"])

        _audit_pc(
            request=request,
            pedido_or_id=pedido,
            action="cancelar",
            before=before,
            after={"Status": pedido.Status},
            reason=motivo or None
        )

        ser = PedidoCompraDetailSerializer(pedido, context={"request": request})
        return Response(ser.data)

    @transaction.atomic
    @action(detail=True, methods=["post"])
    def reabrir(self, request, pk=None):
        from .pedido_compra_serializers import PedidoCompraDetailSerializer
        pedido: PedidoCompra = self.get_object()

        if not self._pode_mudar(pedido.Status, STATUS_ABERTO):
            return Response(
                {"detail": f"Transição não permitida: {pedido.Status or 'None'} → {STATUS_ABERTO}."},
                status=status.HTTP_409_CONFLICT,
            )

        before = {"Status": pedido.Status}
        pedido.Status = STATUS_ABERTO
        pedido.save(update_fields=["Status"])

        _audit_pc(
            request=request,
            pedido_or_id=pedido,
            action="reabrir",
            before=before,
            after={"Status": pedido.Status},
            reason=(request.data or {}).get("motivo") or None
        )

        ser = PedidoCompraDetailSerializer(pedido, context={"request": request})
        return Response(ser.data)

    @transaction.atomic
    @action(detail=True, methods=["post"])
    def duplicar(self, request, pk=None):
        from .pedido_compra_serializers import PedidoCompraDetailSerializer
        pedido: PedidoCompra = self.get_object()

        novo = PedidoCompra.objects.create(
            Idfornecedor=pedido.Idfornecedor,
            Idloja=pedido.Idloja,
            Datapedido=timezone.localdate(),
            Dataentrega=pedido.Dataentrega,
            Valorpedido=Decimal("0.00"),
            Status=STATUS_ABERTO,
            Documento=None,
            data_nf=None,
            Chave=None,
            tolerancia_qtd_percent=pedido.tolerancia_qtd_percent,
            tolerancia_preco_percent=pedido.tolerancia_preco_percent,
            tipo_pedido=pedido.tipo_pedido,
        )

        itens = PedidoCompraItem.objects.filter(Idpedidocompra=pedido)

        novos_itens = []
        total = Decimal("0.00")
        for src in itens:
            q = src.Qtp_pc
            pu = src.valorunitario
            desc = src.Desconto or Decimal("0")
            total_item = q * pu - desc
            if total_item < 0:
                total_item = Decimal("0.00")

            novos_itens.append(
                PedidoCompraItem(
                    Idpedidocompra=novo,
                    Idproduto=src.Idproduto,
                    Qtp_pc=q,
                    valorunitario=pu,
                    Desconto=desc,
                    Total_item=total_item,
                    Qtd_recebida=0,
                    unid_compra=src.unid_compra,
                    fator_conv=src.fator_conv or Decimal("1"),
                    Idprodutodetalhe=src.Idprodutodetalhe,
                    pack=src.pack,
                    n_packs=src.n_packs,
                    qtd_total_pack=src.qtd_total_pack,
                    data_entrega_prevista=src.data_entrega_prevista,
                )
            )
            total += total_item

        if novos_itens:
            PedidoCompraItem.objects.bulk_create(novos_itens)

        if total != novo.Valorpedido:
            PedidoCompra.objects.filter(pk=novo.pk).update(Valorpedido=total)

        _audit_pc(
            request=request,
            pedido_or_id=novo,
            action="duplicar",
            before=None,
            after={"Valorpedido": float(total), "itens": len(novos_itens)},
            reason=f"Duplicado do pedido {pedido.Idpedidocompra}",
            extra={"source_id": pedido.Idpedidocompra}
        )

        ser = PedidoCompraDetailSerializer(novo, context={"request": request})
        return Response(ser.data, status=status.HTTP_201_CREATED)

    @transaction.atomic
    @action(detail=True, methods=["post"], url_path="set-forma-pagamento")
    def set_forma_pagamento(self, request, pk=None):
        from .pedido_compra_serializers import PedidoCompraDetailSerializer
        pedido: PedidoCompra = self.get_object()
        data = request.data or {}

        forma = None
        codigo = data.get("codigo")
        forma_id = data.get("Idformapagamento")

        if codigo:
            try:
                forma = FormaPagamento.objects.get(codigo=codigo)
            except FormaPagamento.DoesNotExist:
                return Response({"detail": f"Forma com código '{codigo}' não encontrada."},
                                status=status.HTTP_400_BAD_REQUEST)
        elif forma_id:
            try:
                forma = FormaPagamento.objects.get(pk=forma_id)
            except FormaPagamento.DoesNotExist:
                return Response({"detail": f"Forma com ID {forma_id} não encontrada."},
                                status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({"detail": "Informe 'codigo' ou 'Idformapagamento'."},
                            status=status.HTTP_400_BAD_REQUEST)

        before = {
            "condicao_pagamento": pedido.condicao_pagamento,
            "parcelas": pedido.parcelas,
        }

        aplicar_forma_pagamento(pedido, forma)

        soma = (PedidoCompraParcela.objects.filter(pedido=pedido)
                .aggregate(s=Sum("valor"))["s"] or Decimal("0.00"))

        _audit_pc(
            request=request,
            pedido_or_id=pedido,
            action="set_forma_pagamento",
            before=before,
            after={
                "condicao_pagamento": forma.codigo,
                "parcelas": forma.num_parcelas,
                "soma_parcelas": float(soma),
                "valorpedido": float(pedido.Valorpedido or 0)
            },
            reason=data.get("motivo") or None
        )

        ser = PedidoCompraDetailSerializer(pedido, context={"request": request})
        return Response(ser.data, status=status.HTTP_200_OK)


class PedidoCompraItemViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = PedidoCompraItem.objects.select_related("Idpedidocompra", "Idproduto", "pack")
    serializer_class = PedidoCompraItemSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        pedido_id = self.request.query_params.get("pedido")
        if pedido_id:
            qs = qs.filter(Idpedidocompra_id=pedido_id)
        return qs

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        """
        Só permite exclusão quando o pedido está em AB.
        Se excluir, recalcula total e (se houver forma) regenera parcelas.
        """
        instance: PedidoCompraItem = self.get_object()
        pedido = instance.Idpedidocompra  # objeto já carregado via select_related?

        # Bloqueio de exclusão se NÃO estiver AB
        if pedido and pedido.Status != PedidoCompra.StatusChoices.AB:
            return Response(
                {"detail": "Itens só podem ser excluídos quando o pedido está em AB."},
                status=status.HTTP_400_BAD_REQUEST
            )

        pedido_id = instance.Idpedidocompra_id

        _audit_pc(
            request=request,
            pedido_or_id=pedido_id,
            action="delete_item",
            before={"item_id": instance.Idpedidocompraitem, "total_item": float(instance.Total_item or 0)},
            after=None,
            reason="Exclusão de item do pedido"
        )

        response = super().destroy(request, *args, **kwargs)

        total = (
            PedidoCompraItem.objects.filter(Idpedidocompra_id=pedido_id)
            .aggregate(s=Sum(F("Qtp_pc") * F("valorunitario") - F("Desconto")))["s"] or Decimal("0.00")
        )
        PedidoCompra.objects.filter(pk=pedido_id).update(Valorpedido=total)

        try:
            pedido = PedidoCompra.objects.get(pk=pedido_id)
            if pedido.Status == PedidoCompra.StatusChoices.AB and pedido.condicao_pagamento:
                regen_parcelas_if_needed(pedido, request=request, motivo="Regerado após exclusão de item")
        except PedidoCompra.DoesNotExist:
            pass

        return response


class PedidoCompraEntregaViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = PedidoCompraEntrega.objects.select_related("pedido")
    serializer_class = PedidoCompraEntregaSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        pedido_id = self.request.query_params.get("pedido")
        if pedido_id:
            qs = qs.filter(pedido_id=pedido_id)
        return qs


class PedidoCompraParcelaViewSet(mixins.ListModelMixin,
                                 mixins.RetrieveModelMixin,
                                 viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = PedidoCompraParcela.objects.select_related("pedido").all()
    serializer_class = PedidoCompraParcelaSerializer
    lookup_field = "pk"

    def get_queryset(self):
        qs = super().get_queryset()
        pedido_id = self.request.query_params.get("pedido")
        if pedido_id:
            qs = qs.filter(pedido_id=pedido_id)
        return qs
