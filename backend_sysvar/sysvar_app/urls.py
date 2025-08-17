from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    health, me, logout_view,
    LojaViewSet, ClienteViewSet, ProdutoViewSet, ProdutoDetalheViewSet, EstoqueViewSet,
)

router = DefaultRouter()
router.register(r'lojas', LojaViewSet)
router.register(r'clientes', ClienteViewSet)
router.register(r'produtos', ProdutoViewSet)
router.register(r'produtos-detalhes', ProdutoDetalheViewSet)
router.register(r'estoques', EstoqueViewSet)

urlpatterns = [
    path('health/', health, name='health'),           # público
    path('me/', me, name='me'),                       # requer Token
    path('auth/logout/', logout_view, name='logout'), # requer Token
    path('', include(router.urls)),
]
