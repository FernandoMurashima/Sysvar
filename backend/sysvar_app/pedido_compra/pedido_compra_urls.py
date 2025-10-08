from django.urls import path, include
from rest_framework.routers import DefaultRouter

# como os arquivos estão dentro do pacote, o nome correto é este:
from .pedido_compra_views import (
    PedidoCompraViewSet,
    PedidoCompraItemViewSet,
    PedidoCompraEntregaViewSet,
)

router = DefaultRouter()  # <<< FALTAVA ISTO

router.register(r"pedidos-compra", PedidoCompraViewSet, basename="pedido-compra")
router.register(r"pedidos-compra-itens", PedidoCompraItemViewSet, basename="pedido-compra-item")
router.register(r"pedidos-compra-entregas", PedidoCompraEntregaViewSet, basename="pedido-compra-entrega")

urlpatterns = [
    path("", include(router.urls)),
]
