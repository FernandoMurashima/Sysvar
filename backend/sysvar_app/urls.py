from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    health, register, me, logout_view, login_view,
    UserViewSet,
    LojaViewSet, ClienteViewSet, ProdutoViewSet, ProdutoDetalheViewSet, EstoqueViewSet,
    FornecedorViewSet, VendedorViewSet, FuncionariosViewSet, GradeViewSet, TamanhoViewSet,
    CorViewSet, ColecaoViewSet, FamiliaViewSet, UnidadeViewSet, GrupoViewSet, SubgrupoViewSet,
    CodigosViewSet, TabelaprecoViewSet, NcmViewSet,
    FornecedorSkuMapViewSet, TabelaPrecoItemViewSet,
    NFeEntradaViewSet
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'lojas', LojaViewSet)
router.register(r'clientes', ClienteViewSet)
router.register(r'produtos', ProdutoViewSet, basename='produtos')
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
router.register(r'codigos', CodigosViewSet)
router.register(r'tabelas-preco', TabelaprecoViewSet)
router.register(r'ncms', NcmViewSet)
router.register(r'tabelaprecoitem', TabelaPrecoItemViewSet, basename='tabelaprecoitem')
# novos
router.register(r'fornecedor-sku-map', FornecedorSkuMapViewSet)
router.register(r'nfe-entradas', NFeEntradaViewSet, basename='nfe-entrada')

urlpatterns = [
    path('health/', health, name='health'),
    path('auth/register/', register, name='register'),
    path('auth/login/', login_view, name='login'),
    path('auth/logout/', logout_view, name='logout'),
    path('me/', me, name='me'),
    # IMPORTANTE: mantenha apenas este include; o prefixo /api/ já é feito no urls.py do projeto
    path('', include(router.urls)),
]
