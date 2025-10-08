from decimal import Decimal
from django.db import transaction
from django.utils import timezone

from rest_framework import viewsets, permissions, status, filters as drf_filters
from rest_framework.decorators import action
from rest_framework.response import Response

import django_filters as df
from django_filters.rest_framework import DjangoFilterBackend

from ..models import (
    PedidoCompra,
    PedidoCompraItem,
    PedidoCompraEntrega,
)
from .pedido_compra_serializers import (  # <<< AJUSTE: import correto do arquivo do pacote
    PedidoCompraListSerializer,
    PedidoCompraDetailSerializer,
    PedidoCompraItemSerializer,
    PedidoCompraEntregaSerializer,
)

# Códigos de status sugeridos (2 chars)
STATUS_ABERTO = "AB"
STATUS_APROVADO = "AP"
STATUS_CANCELADO = "CA"

# Mapa simples de transições permitidas
TRANSICOES = {
    STATUS_ABERTO: {STATUS_APROVADO, STATUS_CANCELADO},
    STATUS_APROVADO: {STATUS_CANCELADO},
    STATUS_CANCELADO: {STATUS_ABERTO},
}


# --------------------
# Filtros server-side
# --------------------
class PedidoCompraFilter(df.FilterSet):
    # Datas
    emissao_de = df.DateFilter(field_name="Datapedido", lookup_expr="gte")
    emissao_ate = df.DateFilter(field_name="Datapedido", lookup_expr="lte")
    entrega_de = df.DateFilter(field_name="Dataentrega", lookup_expr="gte")
    entrega_ate = df.DateFilter(field_name="Dataentrega", lookup_expr="lte")

    # Básicos
    status = df.CharFilter(field_name="Status", lookup_expr="exact")
    fornecedor = df.NumberFilter(field_name="Idfornecedor_id", lookup_expr="exact")
    q_fornecedor = df.CharFilter(field_name="Idfornecedor__Nome_fornecedor", lookup_expr="icontains")
    loja = df.NumberFilter(field_name="Idloja_id", lookup_expr="exact")
    doc = df.CharFilter(field_name="Documento", lookup_expr="icontains")

    # Faixa de total
    total_min = df.NumberFilter(field_name="Valorpedido", lookup_expr="gte")
    total_max = df.NumberFilter(field_name="Valorpedido", lookup_expr="lte")

    class Meta:
        model = PedidoCompra
        fields = [
            "status", "fornecedor", "q_fornecedor", "loja", "doc",
            "emissao_de", "emissao_ate", "entrega_de", "entrega_ate",
            "total_min", "total_max",
        ]


class PedidoCompraViewSet(viewsets.ModelViewSet):
    """
    CRUD + ações de fluxo para Pedido de Compra.
    Ações extras (POST):
      - /pedidos-compra/{id}/aprovar/
      - /pedidos-compra/{id}/cancelar/
      - /pedidos-compra/{id}/reabrir/
      - /pedidos-compra/{id}/duplicar/
    """
    permission_classes = [permissions.IsAuthenticated]
    queryset = PedidoCompra.objects.all().select_related("Idfornecedor", "Idloja")
    serializer_class = PedidoCompraDetailSerializer

    # >>> Filtros e Ordenação
    filter_backends = [DjangoFilterBackend, drf_filters.OrderingFilter]
    filterset_class = PedidoCompraFilter
    ordering_fields = [
        "Datapedido",
        "Dataentrega",
        "Documento",
        "Valorpedido",
        "Status",
        "Idfornecedor__Nome_fornecedor",
        "Idloja__nome_loja",
        "Idpedidocompra",
    ]
    ordering = ["-Datapedido", "Idpedidocompra"]  # padrão: mais recentes primeiro

    def get_serializer_class(self):
        if self.action in ("list",):
            return PedidoCompraListSerializer
        return super().get_serializer_class()

    # --------------------
    # Helpers de domínio
    # --------------------
    def _pode_mudar(self, de, para) -> bool:
        if de is None:
            return True
        return para in TRANSICOES.get(de, set())

    def _agora_data(self):
        return timezone.localdate()

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
        """
        Cria um novo pedido com mesmo fornecedor/loja/tolerâncias
        e clona itens. Novo pedido sai em ABERTO.
        """
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
