from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from .models import (
    User, Loja, Cliente, Fornecedor, Vendedor, Funcionarios, Tamanho, Cor,
    Nat_Lancamento, ContaBancaria, Produto, ProdutoDetalhe, Tabelapreco, Estoque,
    Venda, VendaItem, MovimentacaoFinanceira, MovimentacaoProdutos, Inventario,
    InventarioItem, Receber, ReceberItens, Pagar, PagarItem, Compra, CompraItem,
    PedidoCompra, PedidoCompraItem, Grupo, Unidade, Material, Familia, Colecao,
    Grade, Ncm, Subgrupo, Codigos, TabelaPrecoItem, Imposto, Caixa, Despesa
)

# =========================
#  Admin do Usuário (custom)
# =========================


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('id', 'username', 'email', 'first_name', 'last_name',
                    'type', 'Idloja', 'is_staff', 'is_active', 'last_login', 'date_joined')
    list_filter = ('type', 'is_staff', 'is_superuser', 'is_active')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('id',)

    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Informações pessoais', {'fields': ('first_name', 'last_name', 'email')}),
        ('Perfil', {'fields': ('type', 'Idloja')}),  # <<< Loja aqui
        ('Permissões', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Datas importantes', {'fields': ('last_login', 'date_joined')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'first_name', 'last_name',
                       'type', 'Idloja', 'password1', 'password2', 'is_staff', 'is_active'),
        }),
    )


# ============
#  Loja Admin
# ============
@admin.register(Loja)
class LojaAdmin(admin.ModelAdmin):
    list_display = ('Idloja', 'nome_loja', 'Apelido_loja', 'cnpj', 'Cidade', 'Telefone1', 'data_cadastro')
    search_fields = ('nome_loja', 'Apelido_loja', 'cnpj', 'Cidade', 'email', 'Telefone1')
    list_filter = ('Cidade', 'data_cadastro')
    ordering = ('-data_cadastro',)
    date_hierarchy = 'data_cadastro'

# ===============
#  Cliente Admin
# ===============
@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ('Idcliente', 'Nome_cliente', 'Apelido', 'cpf', 'email', 'Cidade', 'Bairro', 'Telefone1', 'Bloqueio', 'data_cadastro')
    search_fields = ('Nome_cliente', 'Apelido', 'cpf', 'email', 'Cidade', 'Bairro', 'Telefone1')
    list_filter = ('Cidade', 'Bairro', 'Bloqueio', 'data_cadastro')
    ordering = ('-data_cadastro',)
    date_hierarchy = 'data_cadastro'

# ===============
#  Produto Admin
# ===============
@admin.register(Produto)
class ProdutoAdmin(admin.ModelAdmin):
    list_display = ('Idproduto', 'Descricao', 'referencia', 'grupo', 'subgrupo', 'familia', 'colecao', 'unidade', 'data_cadastro')
    search_fields = ('Descricao', 'referencia', 'grupo', 'subgrupo', 'familia', 'colecao')
    list_filter = ('grupo', 'subgrupo', 'familia', 'colecao', 'data_cadastro')
    ordering = ('-data_cadastro',)
    date_hierarchy = 'data_cadastro'

# ======================
#  ProdutoDetalhe Admin
# ======================
@admin.register(ProdutoDetalhe)
class ProdutoDetalheAdmin(admin.ModelAdmin):
    list_display = ('Idprodutodetalhe', 'CodigodeBarra', 'Codigoproduto', 'Idproduto', 'Idtamanho', 'Idcor', 'Item', 'data_cadastro')
    search_fields = ('CodigodeBarra', 'Codigoproduto', 'Idproduto__Descricao')
    list_filter = ('Idtamanho', 'Idcor', 'data_cadastro')
    ordering = ('-data_cadastro',)
    date_hierarchy = 'data_cadastro'
    list_select_related = ('Idproduto', 'Idtamanho', 'Idcor')

# ===============
#  Estoque Admin
# ===============
@admin.register(Estoque)
class EstoqueAdmin(admin.ModelAdmin):
    list_display = ('Idestoque', 'CodigodeBarra', 'codigoproduto', 'Idloja', 'Estoque', 'reserva', 'valorestoque')
    search_fields = ('CodigodeBarra', 'codigoproduto', 'Idloja__nome_loja')
    list_filter = ('Idloja',)
    ordering = ('CodigodeBarra',)
    list_select_related = ('Idloja',)

# ===========================================================
#  Registro "em massa" para os modelos menos usados no admin
# ===========================================================
_bulk_models = [
    Fornecedor, Vendedor, Funcionarios, Tamanho, Cor,
    Nat_Lancamento, ContaBancaria, Tabelapreco, Venda, VendaItem,
    MovimentacaoFinanceira, MovimentacaoProdutos, Inventario, InventarioItem,
    Receber, ReceberItens, Pagar, PagarItem, Compra, CompraItem,
    PedidoCompra, PedidoCompraItem, Grupo, Unidade, Material, Familia, Colecao,
    Grade, Ncm, Subgrupo, Codigos, TabelaPrecoItem, Imposto, Caixa, Despesa
]

for m in _bulk_models:
    try:
        admin.site.register(m)
    except admin.sites.AlreadyRegistered:
        pass
