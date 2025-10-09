from decimal import Decimal
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from ..models import (
    PedidoCompra,
    PedidoCompraItem,
)
from .pedido_compra_serializers import (
    PedidoCompraListSerializer,
    PedidoCompraDetailSerializer,
    PedidoCompraItemSerializer,
    PedidoCompraEntregaSerializer,
)

# Códigos de status
STATUS_ABERTO = "AB"
STATUS_APROVADO = "AP"
STATUS_CANCELADO = "CA"

# Transições
TRANSICOES = {
    STATUS_ABERTO: {STATUS_APROVADO, STATUS_CANCELADO},
    STATUS_APROVADO: {STATUS_CANCELADO},
    STATUS_CANCELADO: {STATUS_ABERTO},
}

# Campos permitidos na ordenação
ORDERING_WHITELIST = {"Datapedido", "Dataentrega", "Valorpedido", "Idpedidocompra", "Status"}


class PedidoCompraViewSet(viewsets.ModelViewSet):
    """
    CRUD + fluxo + filtros/ordenação.
    Filtros aceitos (querystring):
      - status=AB|AP|CA
      - fornecedor=<id exato>
      - q_fornecedor=<nome icontains>
      - loja=<id exato> (opcional, manter compat.)
      - q_loja=<nome icontains>
      - emissao_de=YYYY-MM-DD
      - emissao_ate=YYYY-MM-DD
      - entrega_de=YYYY-MM-DD
      - entrega_ate=YYYY-MM-DD
      - total_min=<decimal>
      - total_max=<decimal>
      - ordering=ex.: -Datapedido,Idpedidocompra
    """
    permission_classes = [permissions.IsAuthenticated]
    queryset = PedidoCompra.objects.all().select_related("Idfornecedor", "Idloja")
    serializer_class = PedidoCompraDetailSerializer

    def get_serializer_class(self):
        if self.action in ("list",):
            return PedidoCompraListSerializer
        return super().get_serializer_class()

    # --------------------
    # Helpers
    # --------------------
    def _pode_mudar(self, de, para) -> bool:
        if de is None:
            return True
        return para in TRANSICOES.get(de, set())

    def _agora_data(self):
        return timezone.localdate()

    def _parse_decimal(self, v):
        if v is None or v == "":
            return None
        try:
            return Decimal(str(v))
        except Exception:
            return None

    def _safe_ordering(self, raw: str) -> str:
        if not raw:
            return "-Datapedido,Idpedidocompra"
        parts = []
        for token in (t.strip() for t in raw.split(",") if t.strip()):
            desc = token.startswith("-")
            key = token[1:] if desc else token
            if key in ORDERING_WHITELIST:
                parts.append(("-" if desc else "") + key)
        if not parts:
            return "-Datapedido,Idpedidocompra"
        # garante desempate por Idpedidocompra
        if "Idpedidocompra" not in [p.lstrip("-") for p in parts]:
            parts.append("Idpedidocompra")
        return ",".join(parts)

    # --------------------
    # Filtros / list
    # --------------------
    def get_queryset(self):
        qs = super().get_queryset()
        p = self.request.query_params

        status_val = p.get("status")
        if status_val:
            qs = qs.filter(Status=status_val)

        fornecedor_id = p.get("fornecedor")
        if fornecedor_id:
            qs = qs.filter(Idfornecedor_id=fornecedor_id)

        q_fornecedor = p.get("q_fornecedor")
        if q_fornecedor:
            qs = qs.filter(Idfornecedor__Nome_fornecedor__icontains=q_fornecedor)

        # Loja: manter compat por id, mas preferir por nome (q_loja)
        loja_id = p.get("loja")
        if loja_id:
            qs = qs.filter(Idloja_id=loja_id)

        q_loja = p.get("q_loja")
        if q_loja:
            qs = qs.filter(Idloja__nome_loja__icontains=q_loja)

        # Datas de emissão (Datapedido)
        emis_de = p.get("emissao_de")
        emis_ate = p.get("emissao_ate")
        if emis_de:
            qs = qs.filter(Datapedido__gte=emis_de)
        if emis_ate:
            qs = qs.filter(Datapedido__lte=emis_ate)

        # Datas de entrega (Dataentrega)
        ent_de = p.get("entrega_de")
        ent_ate = p.get("entrega_ate")
        if ent_de:
            qs = qs.filter(Dataentrega__gte=ent_de)
        if ent_ate:
            qs = qs.filter(Dataentrega__lte=ent_ate)

        # Totais
        tmin = self._parse_decimal(p.get("total_min"))
        if tmin is not None:
            qs = qs.filter(Valorpedido__gte=tmin)

        tmax = self._parse_decimal(p.get("total_max"))
        if tmax is not None:
            qs = qs.filter(Valorpedido__lte=tmax)

        # Ordenação
        ordering = self._safe_ordering(p.get("ordering", ""))
        qs = qs.order_by(*[t.strip() for t in ordering.split(",") if t.strip()])
        return qs

    # --------------------
    # Ações de fluxo
    # --------------------
    @transaction.atomic
    @action(detail=True, methods=["post"])
    def aprovar(self, request, pk=None):
        pedido: PedidoCompra = self.get_object()
        if not self._pode_mudar(pedido.Status, STATUS_APROVADO):
            return Response(
                {"detail": f"Transição não permitida: {pedido.Status or 'None'} → {STATUS_APROVADO}."},
                status=status.HTTP_409_CONFLICT,
            )
        tem_itens = PedidoCompraItem.objects.filter(Idpedidocompra=pedido).exists()
        if not tem_itens:
            return Response({"detail": "Não é possível aprovar um pedido sem itens."}, status=status.HTTP_400_BAD_REQUEST)
        if not pedido.Datapedido:
            pedido.Datapedido = self._agora_data()
        pedido.Status = STATUS_APROVADO
        pedido.save(update_fields=["Datapedido", "Status"])
        ser = PedidoCompraDetailSerializer(pedido, context={"request": request})
        return Response(ser.data)

    @transaction.atomic
    @action(detail=True, methods=["post"])
    def cancelar(self, request, pk=None):
        pedido: PedidoCompra = self.get_object()
        if not self._pode_mudar(pedido.Status, STATUS_CANCELADO):
            return Response(
                {"detail": f"Transição não permitida: {pedido.Status or 'None'} → {STATUS_CANCELADO}."},
                status=status.HTTP_409_CONFLICT,
            )
        _ = (request.data or {}).get("motivo")  # reservado
        pedido.Status = STATUS_CANCELADO
        pedido.save(update_fields=["Status"])
        ser = PedidoCompraDetailSerializer(pedido, context={"request": request})
        return Response(ser.data)

    @transaction.atomic
    @action(detail=True, methods=["post"])
    def reabrir(self, request, pk=None):
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
        from django.db.models import F, Sum

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

        novos = []
        total = Decimal("0.00")
        for it in itens:
            q = it["Qtp_pc"]
            pu = it["valorunitario"]
            desc = it.get("Desconto") or Decimal("0")
            total_item = q * pu - desc
            if total_item < 0:
                total_item = Decimal("0.00")

            novos.append(
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

        if novos:
            PedidoCompraItem.objects.bulk_create(novos)

        if total != novo.Valorpedido:
            PedidoCompra.objects.filter(pk=novo.pk).update(Valorpedido=total)

        ser = PedidoCompraDetailSerializer(novo, context={"request": request})
        return Response(ser.data, status=status.HTTP_201_CREATED)


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
    queryset = ...  # mantido conforme seu projeto
    serializer_class = PedidoCompraEntregaSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        pedido_id = self.request.query_params.get("pedido")
        if pedido_id:
            qs = qs.filter(pedido_id=pedido_id)
        return qs
