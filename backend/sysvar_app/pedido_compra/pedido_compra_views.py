from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.utils import timezone
from django.db.models import Q
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
import django_filters

from ..models import (
    PedidoCompra,
    PedidoCompraItem,
    PedidoCompraEntrega,
    PedidoCompraParcela,  # ⬅️ NOVO
)

# Importa formas de pagamento para aplicar na action
from sysvar_app.models import FormaPagamento, FormaPagamentoParcela

# NOTE: mantemos o nome do módulo conforme seu projeto
from .pedido_compra_serializers import (
    PedidoCompraListSerializer,
    PedidoCompraDetailSerializer,
    PedidoCompraItemSerializer,
    PedidoCompraEntregaSerializer,
)

# Códigos de status sugeridos (2 chars)
STATUS_ABERTO = "AB"
STATUS_APROVADO = "AP"
STATUS_CANCELADO = "CA"
STATUS_ATENDIDO = "AT"
STATUS_PARCIAL_ABERTO = "PA"
STATUS_PARCIAL_ENCERRADO = "PE"


# Mapa simples de transições permitidas
TRANSICOES = {
    STATUS_ABERTO: {STATUS_APROVADO, STATUS_CANCELADO},
    STATUS_APROVADO: {STATUS_CANCELADO},
    STATUS_CANCELADO: {STATUS_ABERTO},
}


class PedidoCompraFilter(django_filters.FilterSet):
    """
    Filtros amigáveis:
      - status=AB|AP|CA
      - tipo_pedido=revenda|consumo
      - emissao_de=YYYY-MM-DD
      - emissao_ate=YYYY-MM-DD
      - entrega_de=YYYY-MM-DD
      - entrega_ate=YYYY-MM-DD
      - fornecedor=<id>  (filtra por Idfornecedor_id)
      - q_fornecedor=<texto> (icontains em Nome_fornecedor)
      - loja=<id>  (filtra por Idloja_id)
      - q_loja=<texto> (icontains em nome_loja)
      - ordering= -Datapedido,Idpedidocompra  (qualquer campo de listagem/detalhe)
    """
    status = django_filters.CharFilter(field_name="Status", lookup_expr="exact")
    # <— adicionado: filtro por enum do modelo
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
        fields = []  # mantido conforme seu arquivo original

    def filter_q_fornecedor(self, queryset, name, value):
        if not value:
            return queryset
        return queryset.filter(Idfornecedor__Nome_fornecedor__icontains=value)

    def filter_q_loja(self, queryset, name, value):
        if not value:
            return queryset
        return queryset.filter(Idloja__nome_loja__icontains=value)


class PedidoCompraViewSet(viewsets.ModelViewSet):
    """
    CRUD + ações de fluxo para Pedido de Compra.
    Ações extras (POST):
      - /pedidos-compra/{id}/aprovar/
      - /pedidos-compra/{id}/cancelar/   (body opcional: {"motivo": "..."} — somente informativo por ora)
      - /pedidos-compra/{id}/reabrir/
      - /pedidos-compra/{id}/duplicar/   (cria novo pedido com mesmos itens)
      - /pedidos-compra/{id}/set-forma-pagamento/  (aplica forma por código ou Id e gera parcelas)
    """
    permission_classes = [permissions.IsAuthenticated]
    queryset = PedidoCompra.objects.all().select_related("Idfornecedor", "Idloja")
    serializer_class = PedidoCompraDetailSerializer
    filterset_class = PedidoCompraFilter  # <<— ativa os filtros acima
    search_fields = []  # mantemos vazio por enquanto
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

    def _quantize(self, v: Decimal) -> Decimal:
        return (v or Decimal("0")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    @transaction.atomic
    @action(detail=True, methods=["post"])
    def aprovar(self, request, pk=None):
        from .pedido_compra_serializers import PedidoCompraDetailSerializer  # evitar confusão de import circular

        pedido: PedidoCompra = self.get_object()

        if not self._pode_mudar(pedido.Status, STATUS_APROVADO):
            return Response(
                {"detail": f"Transição não permitida: {pedido.Status or 'None'} → {STATUS_APROVADO}."},
                status=status.HTTP_409_CONFLICT,
            )

        tem_itens = PedidoCompraItem.objects.filter(Idpedidocompra=pedido).exists()
        if not tem_itens:
            return Response(
                {"detail": "Não é possível aprovar um pedido sem itens."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not pedido.Datapedido:
            pedido.Datapedido = self._agora_data()

        pedido.Status = STATUS_APROVADO
        pedido.save(update_fields=["Datapedido", "Status"])

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

        motivo = (request.data or {}).get("motivo")  # noqa: F841

        pedido.Status = STATUS_CANCELADO
        pedido.save(update_fields=["Status"])

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

        pedido.Status = STATUS_ABERTO
        pedido.save(update_fields=["Status"])

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
            Datapedido=self._agora_data(),
            Dataentrega=pedido.Dataentrega,
            Valorpedido=Decimal("0.00"),
            Status=STATUS_ABERTO,
            Documento=None,
            data_nf=None,
            Chave=None,
            tolerancia_qtd_percent=pedido.tolerancia_qtd_percent,
            tolerancia_preco_percent=pedido.tolerancia_preco_percent,
        )

        itens = PedidoCompraItem.objects.filter(Idpedidocompra=pedido).values(
            "Idproduto_id",
            "Qtp_pc",
            "valorunitario",
            "Desconto",
            "unid_compra",
            "fator_conv",
            "Idprodutodetalhe_id",
        )

        novos_itens = []
        total = Decimal("0.00")
        for it in itens:
            q = it["Qtp_pc"]
            pu = it["valorunitario"]
            desc = it.get("Desconto") or Decimal("0")
            total_item = q * pu - desc
            if total_item < 0:
                total_item = Decimal("0.00")

            novos_itens.append(
                PedidoCompraItem(
                    Idpedidocompra=novo,
                    Idproduto_id=it["Idproduto_id"],
                    Qtp_pc=q,
                    valorunitario=pu,
                    Desconto=desc,
                    Total_item=total_item,
                    Qtd_recebida=0,
                    unid_compra=it.get("unid_compra"),
                    fator_conv=it.get("fator_conv") or Decimal("1"),
                    Idprodutodetalhe_id=it.get("Idprodutodetalhe_id"),
                )
            )
            total += total_item

        if novos_itens:
            PedidoCompraItem.objects.bulk_create(novos_itens)

        if total != novo.Valorpedido:
            PedidoCompra.objects.filter(pk=novo.pk).update(Valorpedido=total)

        ser = PedidoCompraDetailSerializer(novo, context={"request": request})
        return Response(ser.data, status=status.HTTP_201_CREATED)

    # ------------------------------
    # Helpers de forma de pagamento
    # ------------------------------
    def _aplicar_forma_pagamento(self, pedido: PedidoCompra, forma: FormaPagamento):
        """
        Sincroniza cabeçalho e gera PedidoCompraParcela a partir da FormaPagamentoParcela.
        """
        # Atualiza cabeçalho
        pedido.condicao_pagamento = forma.codigo
        pedido.condicao_pagamento_detalhe = forma.descricao
        pedido.parcelas = forma.num_parcelas
        pedido.save(update_fields=["condicao_pagamento", "condicao_pagamento_detalhe", "parcelas"])

        # Limpa parcelas antigas
        PedidoCompraParcela.objects.filter(pedido=pedido).delete()

        # Base para cálculo
        total = pedido.Valorpedido or Decimal("0")
        base_dt = pedido.Datapedido or self._agora_data()

        linhas = []

        defs = list(
            FormaPagamentoParcela.objects
            .filter(forma=forma)
            .order_by("ordem")
            .values("ordem", "dias", "percentual", "valor_fixo")
        )

        # Se não existir definição de parcelas, cria 1 parcela à vista
        if not defs:
            defs = [{"ordem": 1, "dias": 0, "percentual": Decimal("100"), "valor_fixo": Decimal("0")}]

        # primeiro passa: calcula valores por percentual/fixo
        valores = []
        for d in defs:
            perc = Decimal(str(d.get("percentual") or "0"))
            fixo = Decimal(str(d.get("valor_fixo") or "0"))
            if perc > 0:
                val = self._quantize(total * (perc / Decimal("100")))
            elif fixo > 0:
                val = self._quantize(fixo)
            else:
                val = Decimal("0.00")
            valores.append(val)

        # Ajuste da última parcela para fechar com total (se total > 0)
        if total > 0 and valores:
            diff = self._quantize(total - sum(valores))
            valores[-1] = self._quantize(valores[-1] + diff)

        # monta linhas
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

    # ------------------------------
    # Action: aplicar forma por código ou id
    # ------------------------------
    @transaction.atomic
    @action(detail=True, methods=["post"], url_path="set-forma-pagamento")
    def set_forma_pagamento(self, request, pk=None):
        """
        Body aceito:
          {"codigo": "99"}  ou  {"Idformapagamento": 15}
        Aplica forma no pedido, atualiza cabeçalho e gera parcelas.
        """
        from .pedido_compra_serializers import PedidoCompraDetailSerializer  # local para evitar ciclos

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

        self._aplicar_forma_pagamento(pedido, forma)

        # retorna detalhe completo (com parcelas)
        ser = PedidoCompraDetailSerializer(pedido, context={"request": request})
        return Response(ser.data, status=status.HTTP_200_OK)


class PedidoCompraItemViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = PedidoCompraItem.objects.select_related("Idpedidocompra", "Idproduto")
    serializer_class = PedidoCompraItemSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        pedido_id = self.request.query_params.get("pedido")
        if pedido_id:
            qs = qs.filter(Idpedidocompra_id=pedido_id)
        return qs


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
