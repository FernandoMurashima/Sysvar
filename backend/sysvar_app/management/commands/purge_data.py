# seu_app/management/commands/purge_data.py
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.authtoken.models import Token

from ...models import (
    # básicos
    Loja, Cliente, Fornecedor, Vendedor, Funcionarios, Ncm, Grade, Tamanho, Cor,
    Material, Colecao, Familia, Unidade, Nat_Lancamento, ContaBancaria,
    # produtos/preços/estoque
    Produto, ProdutoDetalhe, Tabelapreco, TabelaPrecoItem, Estoque, Codigos, Grupo, Subgrupo,
    # vendas/movimentações
    Venda, VendaItem, MovimentacaoFinanceira, MovimentacaoProdutos,
    Inventario, InventarioItem,
    Receber, ReceberItens, ReceberCartao,
    Pagar, PagarItem,
    # compras
    Compra, CompraItem, PedidoCompra, PedidoCompraItem,
    # impostos/caixa/despesas
    Imposto, Caixa, Despesa
)

def _del(qs, label, out):
    num, _ = qs.delete()
    out.append(f"{label:<28} -> {num}")

class Command(BaseCommand):
    help = "Apaga dados de teste/seed em ordem segura. Padrão mantém Usuários e Lojas. Use --hard para apagar também."

    def add_arguments(self, parser):
        parser.add_argument("--hard", action="store_true", help="Além dos dados, apaga Lojas e usuários não-superuser.")
        parser.add_argument("--keep-users", action="store_true", help="Mesmo com --hard, mantém todos os usuários.")
        parser.add_argument("--keep-lojas", action="store_true", help="Mesmo com --hard, mantém todas as lojas.")

    @transaction.atomic
    def handle(self, *args, **opts):
        out = []
        self.stdout.write(self.style.MIGRATE_HEADING("==> PURGE — iniciando limpeza"))

        # ---- filhos primeiro (ordem de FK) ----
        _del(ReceberCartao.objects.all(),           "ReceberCartao", out)
        _del(VendaItem.objects.all(),               "VendaItem", out)
        _del(Venda.objects.all(),                   "Venda", out)

        _del(InventarioItem.objects.all(),          "InventarioItem", out)
        _del(Inventario.objects.all(),              "Inventario", out)

        _del(MovimentacaoProdutos.objects.all(),    "MovimentacaoProdutos", out)
        _del(MovimentacaoFinanceira.objects.all(),  "MovimentacaoFinanceira", out)

        _del(CompraItem.objects.all(),              "CompraItem", out)
        _del(Compra.objects.all(),                  "Compra", out)

        _del(PedidoCompraItem.objects.all(),        "PedidoCompraItem", out)
        _del(PedidoCompra.objects.all(),            "PedidoCompra", out)

        _del(PagarItem.objects.all(),               "PagarItem", out)
        _del(Pagar.objects.all(),                   "Pagar", out)

        _del(ReceberItens.objects.all(),            "ReceberItens", out)
        _del(Receber.objects.all(),                 "Receber", out)

        _del(Estoque.objects.all(),                 "Estoque", out)
        _del(TabelaPrecoItem.objects.all(),         "TabelaPrecoItem", out)
        _del(ProdutoDetalhe.objects.all(),          "ProdutoDetalhe", out)

        _del(Produto.objects.all(),                 "Produto", out)

        # preços/tabelas e códigos
        _del(Tabelapreco.objects.all(),             "Tabelapreco", out)
        _del(Codigos.objects.all(),                 "Codigos", out)

        # cadastros auxiliares (respeitando FKs)
        _del(Subgrupo.objects.all(),                "Subgrupo", out)
        _del(Grupo.objects.all(),                   "Grupo", out)

        _del(Tamanho.objects.all(),                 "Tamanho", out)
        _del(Grade.objects.all(),                   "Grade", out)

        _del(Cor.objects.all(),                     "Cor", out)
        _del(Material.objects.all(),                "Material", out)
        _del(Familia.objects.all(),                 "Familia", out)
        _del(Unidade.objects.all(),                 "Unidade", out)
        _del(Ncm.objects.all(),                     "Ncm", out)
        _del(Colecao.objects.all(),                 "Colecao", out)

        # fluxo/financeiro/loja
        _del(Despesa.objects.all(),                 "Despesa", out)
        _del(Caixa.objects.all(),                   "Caixa", out)
        _del(Imposto.objects.all(),                 "Imposto", out)

        _del(Vendedor.objects.all(),                "Vendedor", out)
        _del(Funcionarios.objects.all(),            "Funcionarios", out)
        _del(Fornecedor.objects.all(),              "Fornecedor", out)
        _del(Cliente.objects.all(),                 "Cliente", out)

        _del(ContaBancaria.objects.all(),           "ContaBancaria", out)
        _del(Nat_Lancamento.objects.all(),          "Nat_Lancamento", out)

        # ---- HARD mode (lojas + usuários não-superuser) ----
        hard = bool(opts.get("hard"))
        keep_users = bool(opts.get("keep_users"))
        keep_lojas = bool(opts.get("keep_lojas"))

        if hard and not keep_lojas:
            _del(Loja.objects.all(),                "Loja", out)

        if hard and not keep_users:
            User = get_user_model()
            # apaga tokens dos usuários que serão removidos
            qs_users = User.objects.filter(is_superuser=False)
            Token.objects.filter(user__in=qs_users).delete()
            _del(qs_users,                           "User (não-superuser)", out)

        # ---- resumo ----
        self.stdout.write("\n".join(out))
        self.stdout.write(self.style.MIGRATE_HEADING("==> PURGE — concluído"))
