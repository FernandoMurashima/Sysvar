from django.contrib import admin
from .models import (
    User, Loja, Cliente, Fornecedor, Vendedor, Funcionarios, Tamanho, Cor,
    Nat_Lancamento, ContaBancaria, Produto, ProdutoDetalhe, Tabelapreco, Estoque,
    Venda, VendaItem, MovimentacaoFinanceira, MovimentacaoProdutos, Inventario,
    InventarioItem, Receber, ReceberItens, Pagar, PagarItem, Compra, CompraItem,
    PedidoCompra, PedidoCompraItem, Grupo, Unidade, Material, Familia, Colecao,
    Grade, Ncm, Subgrupo, GrupoDetalhe, Codigos, TabelaPrecoItem, Imposto, Caixa, Despesa
)

models = [
    User, Loja, Cliente, Fornecedor, Vendedor, Funcionarios, Tamanho, Cor,
    Nat_Lancamento, ContaBancaria, Produto, ProdutoDetalhe, Tabelapreco, Estoque,
    Venda, VendaItem, MovimentacaoFinanceira, MovimentacaoProdutos, Inventario,
    InventarioItem, Receber, ReceberItens, Pagar, PagarItem, Compra, CompraItem,
    PedidoCompra, PedidoCompraItem, Grupo, Unidade, Material, Familia, Colecao,
    Grade, Ncm, Subgrupo, GrupoDetalhe, Codigos, TabelaPrecoItem, Imposto, Caixa, Despesa
]

for m in models:
    try:
        admin.site.register(m)
    except admin.sites.AlreadyRegistered:
        pass
