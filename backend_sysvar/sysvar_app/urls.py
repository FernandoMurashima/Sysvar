from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    health, register, me, logout_view,
    LojaViewSet, ClienteViewSet, ProdutoViewSet, ProdutoDetalheViewSet, EstoqueViewSet,
    FornecedorViewSet, VendedorViewSet, FuncionariosViewSet, GradeViewSet, TamanhoViewSet,
    CorViewSet, ColecaoViewSet, FamiliaViewSet, UnidadeViewSet, GrupoViewSet, SubgrupoViewSet,
    CodigosViewSet,
)

router = DefaultRouter()
router.register(r'lojas', LojaViewSet)
router.register(r'clientes', ClienteViewSet)
router.register(r'produtos', ProdutoViewSet)
router.register(r'produtos-detalhes', ProdutoDetalheViewSet)
router.register(r'estoques', EstoqueViewSet)

router.register(r'fornecedores', FornecedorViewSet)
router.register(r'veendedores', VendedorViewSet)
router.register(r'funcionarios', FuncionariosViewSet)
router.register(r'grades', GradeViewSet)
router.register(r'tamanhos', TamanhoViewSet)
router.register(r'cores', CorViewSet)
router.register(r'colecoes', ColecaoViewSet)
router.register(r'familias', FamiliaViewSet)
router.register(r'unidades', UnidadeViewSet)
router.register(r'grupos', GrupoViewSet)
router.register(r'subgrupos', SubgrupoViewSet)
router.register(r'codigos', CodigosViewSet)   # <<< novo

urlpatterns = [
    path('health/', health, name='health'),
    path('auth/register/', register, name='register'),
    path('auth/logout/', logout_view, name='logout'),
    path('me/', me, name='me'),
    path('', include(router.urls)),
]
