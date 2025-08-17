from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    health, register, me, logout_view, change_password,
    LojaViewSet, ClienteViewSet, ProdutoViewSet, ProdutoDetalheViewSet, EstoqueViewSet
)

router = DefaultRouter()
router.register(r'lojas', LojaViewSet)
router.register(r'clientes', ClienteViewSet)
router.register(r'produtos', ProdutoViewSet)
router.register(r'produtos-detalhes', ProdutoDetalheViewSet)
router.register(r'estoques', EstoqueViewSet)

urlpatterns = [
    path('health/', health, name='health'),
    path('auth/register/', register, name='register'),
    path('auth/logout/', logout_view, name='logout'),
    path('auth/change-password/', change_password, name='change-password'),  # ← novo
    path('me/', me, name='me'),
    path('', include(router.urls)),
]
