# sysvar_app/management/commands/seed_nat_lancamento.py
from django.core.management.base import BaseCommand
from django.db import transaction
from sysvar_app.models import Nat_Lancamento  # ajuste aqui se o nome do modelo for diferente

class Command(BaseCommand):
    help = "Popula/atualiza a tabela de Naturezas de Lançamento (Nat_Lancamento)."

    def handle(self, *args, **options):
        dados = [
            # Ativo Circulante
            {"codigo": "1.1", "categoria_principal": "Ativo Circulante", "subcategoria": "Caixa e Equivalentes de Caixa", "descricao": "Dinheiro em caixa e contas bancárias.", "tipo": "Ativo", "status": "Ativa", "tipo_natureza": "Analítica"},
            {"codigo": "1.2", "categoria_principal": "Ativo Circulante", "subcategoria": "Contas a Receber", "descricao": "Valores a receber de clientes.", "tipo": "Ativo", "status": "Ativa", "tipo_natureza": "Analítica"},
            {"codigo": "1.2.1", "categoria_principal": "Ativo Circulante", "subcategoria": "Clientes", "descricao": "Créditos de clientes.", "tipo": "Ativo", "status": "Ativa", "tipo_natureza": "Analítica"},
            {"codigo": "1.3", "categoria_principal": "Ativo Circulante", "subcategoria": "Estoques", "descricao": "Produtos disponíveis para venda.", "tipo": "Ativo", "status": "Ativa", "tipo_natureza": "Analítica"},
            {"codigo": "1.4", "categoria_principal": "Ativo Circulante", "subcategoria": "Despesas Antecipadas", "descricao": "Despesas pagas antecipadamente.", "tipo": "Ativo", "status": "Ativa", "tipo_natureza": "Analítica"},

            # Ativo Não Circulante
            {"codigo": "2.1", "categoria_principal": "Ativo Não Circulante", "subcategoria": "Imobilizado", "descricao": "Bens e equipamentos.", "tipo": "Ativo", "status": "Ativa", "tipo_natureza": "Analítica"},
            {"codigo": "2.2", "categoria_principal": "Ativo Não Circulante", "subcategoria": "Investimentos", "descricao": "Investimentos de longo prazo.", "tipo": "Ativo", "status": "Ativa", "tipo_natureza": "Analítica"},
            {"codigo": "2.3", "categoria_principal": "Ativo Não Circulante", "subcategoria": "Intangível", "descricao": "Ativos intangíveis.", "tipo": "Ativo", "status": "Ativa", "tipo_natureza": "Analítica"},

            # Passivo Circulante
            {"codigo": "3.1", "categoria_principal": "Passivo Circulante", "subcategoria": "Fornecedores", "descricao": "Dívidas com fornecedores.", "tipo": "Passivo", "status": "Ativa", "tipo_natureza": "Analítica"},
            {"codigo": "3.2", "categoria_principal": "Passivo Circulante", "subcategoria": "Empréstimos e Financiamentos", "descricao": "Empréstimos a pagar.", "tipo": "Passivo", "status": "Ativa", "tipo_natureza": "Analítica"},
            {"codigo": "3.3", "categoria_principal": "Passivo Circulante", "subcategoria": "Obrigações Fiscais", "descricao": "Impostos e taxas a pagar.", "tipo": "Passivo", "status": "Ativa", "tipo_natureza": "Analítica"},

            # Passivo Não Circulante
            {"codigo": "4.1", "categoria_principal": "Passivo Não Circulante", "subcategoria": "Empréstimos e Financiamentos a Longo Prazo", "descricao": "Empréstimos de longo prazo.", "tipo": "Passivo", "status": "Ativa", "tipo_natureza": "Analítica"},
            {"codigo": "4.2", "categoria_principal": "Passivo Não Circulante", "subcategoria": "Provisões", "descricao": "Provisões para contingências.", "tipo": "Passivo", "status": "Ativa", "tipo_natureza": "Analítica"},

            # Patrimônio Líquido
            {"codigo": "5.1", "categoria_principal": "Patrimônio Líquido", "subcategoria": "Capital Social", "descricao": "Capital investido pelos sócios.", "tipo": "Patrimônio Líquido", "status": "Ativa", "tipo_natureza": "Analítica"},
            {"codigo": "5.2", "categoria_principal": "Patrimônio Líquido", "subcategoria": "Reservas de Lucros", "descricao": "Lucros retidos para reinvestimento.", "tipo": "Patrimônio Líquido", "status": "Ativa", "tipo_natureza": "Analítica"},
            {"codigo": "5.3", "categoria_principal": "Patrimônio Líquido", "subcategoria": "Lucros ou Prejuízos Acumulados", "descricao": "Resultados acumulados da empresa.", "tipo": "Patrimônio Líquido", "status": "Ativa", "tipo_natureza": "Analítica"},

            # Receitas
            {"codigo": "6.1", "categoria_principal": "Receitas", "subcategoria": "Receitas Operacionais", "descricao": "Receitas provenientes das operações principais.", "tipo": "Receita", "status": "Ativa", "tipo_natureza": "Analítica"},
            {"codigo": "6.1.1", "categoria_principal": "Receitas", "subcategoria": "Venda de Produtos", "descricao": "Receitas provenientes da venda de produtos.", "tipo": "Receita", "status": "Ativa", "tipo_natureza": "Analítica"},
            {"codigo": "6.1.2", "categoria_principal": "Receitas", "subcategoria": "Prestação de Serviços", "descricao": "Receitas provenientes da prestação de serviços.", "tipo": "Receita", "status": "Ativa", "tipo_natureza": "Analítica"},
            {"codigo": "6.2", "categoria_principal": "Receitas", "subcategoria": "Receitas Não Operacionais", "descricao": "Receitas provenientes de atividades não operacionais.", "tipo": "Receita", "status": "Ativa", "tipo_natureza": "Analítica"},
            {"codigo": "6.2.1", "categoria_principal": "Receitas", "subcategoria": "Aluguel de Propriedades", "descricao": "Receitas provenientes do aluguel de propriedades.", "tipo": "Receita", "status": "Ativa", "tipo_natureza": "Analítica"},
            {"codigo": "6.2.2", "categoria_principal": "Receitas", "subcategoria": "Investimentos Financeiros", "descricao": "Receitas provenientes de investimentos financeiros.", "tipo": "Receita", "status": "Ativa", "tipo_natureza": "Analítica"},
            {"codigo": "6.3", "categoria_principal": "Receitas", "subcategoria": "Receitas Financeiras", "descricao": "Receitas provenientes de atividades financeiras.", "tipo": "Receita", "status": "Ativa", "tipo_natureza": "Analítica"},
            {"codigo": "6.3.1", "categoria_principal": "Receitas", "subcategoria": "Juros sobre Investimentos", "descricao": "Receitas de juros sobre investimentos.", "tipo": "Receita", "status": "Ativa", "tipo_natureza": "Analítica"},
            {"codigo": "6.3.2", "categoria_principal": "Receitas", "subcategoria": "Dividendos de Ações", "descricao": "Receitas de dividendos de ações.", "tipo": "Receita", "status": "Ativa", "tipo_natureza": "Analítica"},

            # Despesas
            {"codigo": "7.1", "categoria_principal": "Despesas", "subcategoria": "Despesas Operacionais", "descricao": "Despesas com operações principais.", "tipo": "Despesa", "status": "Ativa", "tipo_natureza": "Analítica"},
            {"codigo": "7.1.1", "categoria_principal": "Despesas", "subcategoria": "Salários e Encargos Trabalhistas", "descricao": "Pagamentos de salários e encargos trabalhistas.", "tipo": "Despesa", "status": "Ativa", "tipo_natureza": "Analítica"},
            {"codigo": "7.1.2", "categoria_principal": "Despesas", "subcategoria": "Materiais de Escritório", "descricao": "Despesas com materiais de escritório.", "tipo": "Despesa", "status": "Ativa", "tipo_natureza": "Analítica"},
            {"codigo": "7.1.3", "categoria_principal": "Despesas", "subcategoria": "Marketing e Publicidade", "descricao": "Despesas com marketing e publicidade.", "tipo": "Despesa", "status": "Ativa", "tipo_natureza": "Analítica"},
            {"codigo": "7.2", "categoria_principal": "Despesas", "subcategoria": "Despesas Não Operacionais", "descricao": "Despesas com atividades não operacionais.", "tipo": "Despesa", "status": "Ativa", "tipo_natureza": "Analítica"},
            {"codigo": "7.2.1", "categoria_principal": "Despesas", "subcategoria": "Aluguel de Propriedades", "descricao": "Despesas com aluguel de propriedades.", "tipo": "Despesa", "status": "Ativa", "tipo_natureza": "Analítica"},
            {"codigo": "7.2.2", "categoria_principal": "Despesas", "subcategoria": "Manutenção de Equipamentos", "descricao": "Despesas com manutenção de equipamentos.", "tipo": "Despesa", "status": "Ativa", "tipo_natureza": "Analítica"},
            {"codigo": "7.3", "categoria_principal": "Despesas", "subcategoria": "Despesas Financeiras", "descricao": "Despesas com atividades financeiras.", "tipo": "Despesa", "status": "Ativa", "tipo_natureza": "Analítica"},
            {"codigo": "7.3.1", "categoria_principal": "Despesas", "subcategoria": "Juros sobre Empréstimos", "descricao": "Pagamentos de juros sobre empréstimos.", "tipo": "Despesa", "status": "Ativa", "tipo_natureza": "Analítica"},
            {"codigo": "7.3.2", "categoria_principal": "Despesas", "subcategoria": "Tarifas Bancárias", "descricao": "Pagamentos de tarifas bancárias.", "tipo": "Despesa", "status": "Ativa", "tipo_natureza": "Analítica"},
            {"codigo": "7.3.3", "categoria_principal": "Despesas", "subcategoria": "Fornecedores de Produtos", "descricao": "Pagamentos de fornecedores de produtos para revenda.", "tipo": "Despesa", "status": "Ativa", "tipo_natureza": "Analítica"},

            # Transferências
            {"codigo": "8.1", "categoria_principal": "Transferências", "subcategoria": "Transferências Internas", "descricao": "Movimentações entre contas bancárias da empresa.", "tipo": "Transferência", "status": "Ativa", "tipo_natureza": "Analítica"},
            {"codigo": "8.2", "categoria_principal": "Transferências", "subcategoria": "Transferências Internas", "descricao": "Movimentações entre centros de custo.", "tipo": "Transferência", "status": "Ativa", "tipo_natureza": "Analítica"},
            {"codigo": "8.3", "categoria_principal": "Transferências", "subcategoria": "Transferências Externas", "descricao": "Movimentações para contas de investimentos.", "tipo": "Transferência", "status": "Ativa", "tipo_natureza": "Analítica"},
            {"codigo": "8.4", "categoria_principal": "Transferências", "subcategoria": "Transferências Externas", "descricao": "Movimentações para filiais da empresa.", "tipo": "Transferência", "status": "Ativa", "tipo_natureza": "Analítica"},

            # Investimentos
            {"codigo": "9.1", "categoria_principal": "Investimentos", "subcategoria": "Investimentos em Ativos Fixos", "descricao": "Aquisição de novos equipamentos.", "tipo": "Investimento", "status": "Ativa", "tipo_natureza": "Analítica"},
            {"codigo": "9.2", "categoria_principal": "Investimentos", "subcategoria": "Investimentos em Ativos Fixos", "descricao": "Aquisição de novos imóveis.", "tipo": "Investimento", "status": "Ativa", "tipo_natureza": "Analítica"},
            {"codigo": "9.3", "categoria_principal": "Investimentos", "subcategoria": "Investimentos Financeiros", "descricao": "Investimentos em títulos financeiros.", "tipo": "Investimento", "status": "Ativa", "tipo_natureza": "Analítica"},
            {"codigo": "9.4", "categoria_principal": "Investimentos", "subcategoria": "Investimentos Financeiros", "descricao": "Investimentos em ações.", "tipo": "Investimento", "status": "Ativa", "tipo_natureza": "Analítica"},

            # Outros
            {"codigo": "10.1", "categoria_principal": "Outros", "subcategoria": "Provisões e Ajustes", "descricao": "Provisões para inadimplência.", "tipo": "Outro", "status": "Ativa", "tipo_natureza": "Analítica"},
            {"codigo": "10.2", "categoria_principal": "Outros", "subcategoria": "Provisões e Ajustes", "descricao": "Ajustes de valor de inventário.", "tipo": "Outro", "status": "Ativa", "tipo_natureza": "Analítica"},
        ]

        # Normalização leve para evitar espaços acidentais
        def clean(d):
            out = {}
            for k, v in d.items():
                if isinstance(v, str):
                    out[k] = v.strip()
                else:
                    out[k] = v
            return out

        criados, atualizados = 0, 0
        with transaction.atomic():
            for raw in dados:
                item = clean(raw)
                # Ajuste aqui se seu modelo usa choices/Boolean para status/tipo_natureza:
                # ex.: mapear "Ativa" -> True, "Analítica" -> "A", etc.
                obj, created = Nat_Lancamento.objects.update_or_create(
                    codigo=item["codigo"],
                    defaults=item,
                )
                if created:
                    criados += 1
                else:
                    atualizados += 1

        self.stdout.write(self.style.SUCCESS(
            f"Nat_Lancamento: {criados} criados, {atualizados} atualizados."
        ))
