from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .pedido_compra_views import (
    PedidoCompraViewSet,
    PedidoCompraItemViewSet,
    PedidoCompraEntregaViewSet,
    PedidoCompraParcelaViewSet,
)

router = DefaultRouter()

router.register(r"pedidos-compra", PedidoCompraViewSet, basename="pedido-compra")
router.register(r"pedidos-compra-itens", PedidoCompraItemViewSet, basename="pedido-compra-item")
router.register(r"pedidos-compra-entregas", PedidoCompraEntregaViewSet, basename="pedido-compra-entrega")
router.register(r'pedidos-compra-parcelas', PedidoCompraParcelaViewSet, basename='pedido-compra-parcelas')  # ⬅️ rota


urlpatterns = [
    path("", include(router.urls)),
]
