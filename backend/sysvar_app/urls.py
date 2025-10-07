from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter

# seus viewsets existentes
from sysvar_app.views import (
    UserViewSet, LojaViewSet, ClienteViewSet, ProdutoViewSet, ProdutoDetalheViewSet,
    EstoqueViewSet, FornecedorViewSet, VendedorViewSet, FuncionariosViewSet,
    GradeViewSet, TamanhoViewSet, CorViewSet, ColecaoViewSet, FamiliaViewSet,
    UnidadeViewSet, GrupoViewSet, SubgrupoViewSet, CodigosViewSet, TabelaprecoViewSet,
    NcmViewSet, TabelaPrecoItemViewSet, FornecedorSkuMapViewSet,
    NFeEntradaViewSet, health, register, login_view, me, logout_view
)

# >>> auditoria <<<
from auditoria.views import AuditoriaLogViewSet

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='users')
router.register(r'lojas', LojaViewSet, basename='lojas')
router.register(r'clientes', ClienteViewSet, basename='clientes')
router.register(r'produtos', ProdutoViewSet, basename='produtos')
router.register(r'produtos-detalhes', ProdutoDetalheViewSet, basename='produtos-detalhes')
router.register(r'estoques', EstoqueViewSet, basename='estoques')
router.register(r'fornecedores', FornecedorViewSet, basename='fornecedores')
router.register(r'vendedores', VendedorViewSet, basename='vendedores')
router.register(r'funcionarios', FuncionariosViewSet, basename='funcionarios')
router.register(r'grades', GradeViewSet, basename='grades')
router.register(r'tamanhos', TamanhoViewSet, basename='tamanhos')
router.register(r'cores', CorViewSet, basename='cores')
router.register(r'colecoes', ColecaoViewSet, basename='colecoes')
router.register(r'familias', FamiliaViewSet, basename='familias')
router.register(r'unidades', UnidadeViewSet, basename='unidades')
router.register(r'grupos', GrupoViewSet, basename='grupos')
router.register(r'subgrupos', SubgrupoViewSet, basename='subgrupos')
router.register(r'codigos', CodigosViewSet, basename='codigos')
router.register(r'tabelaprecos', TabelaprecoViewSet, basename='tabelaprecos')
router.register(r'tabelaprecoitem', TabelaPrecoItemViewSet, basename='tabelaprecoitem')
router.register(r'fornecedor-sku-map', FornecedorSkuMapViewSet, basename='fornecedor-sku-map')
router.register(r'nfe-entradas', NFeEntradaViewSet, basename='nfe-entradas')

# >>> NOVO endpoint público de leitura da auditoria:
router.register(r'auditoria-logs', AuditoriaLogViewSet, basename='auditoria-logs')

urlpatterns = [
    
    path('api/health/', health),
    path('api/register/', register),
    path('api/login/', login_view),
    path('api/me/', me),
    path('api/auth/logout/', logout_view),
    path('api/', include(router.urls)),
]
