# seu_app/management/commands/seed_full.py
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from decimal import Decimal
from datetime import date, timedelta
import random

from ...models import (
    # usuário/loja
    Loja, User,
    # cadastros
    Cliente, Fornecedor, Vendedor, Funcionarios,
    Ncm, Grade, Tamanho, Cor, Material, Colecao, Familia, Unidade,
    Nat_Lancamento, ContaBancaria,
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
    Imposto, Caixa, Despesa,
    # conciliação NF-e
    FornecedorSkuMap, NFeEntrada, NFeItem,
    # modelos fiscais
    ModeloDocumentoFiscal,
)

TARGET = 20  # mínimo por tabela


# ---------- helpers ----------
def ean13_check_digit(base12: str) -> str:
    soma = 0
    for i, ch in enumerate(base12):
        soma += int(ch) * (3 if (i + 1) % 2 == 0 else 1)
    dv = (10 - (soma % 10)) % 10
    return str(dv)


def next_ean(seq: int) -> str:
    prefixo_pais = "789"
    prefixo_empresa = "1234"
    seq5 = str(seq % 100000).zfill(5)
    base12 = f"{prefixo_pais}{prefixo_empresa}{seq5}"
    return base12 + ean13_check_digit(base12)


def today():
    return timezone.now().date()


def rnd_decimal(a: float, b: float, nd=2) -> Decimal:
    v = round(random.uniform(a, b), nd)
    return Decimal(str(v))


def to_date(br_date: str):
    br_date = (br_date or "").strip()
    if not br_date:
        return None
    d, m, y = br_date.split("/")
    return date(int(y), int(m), int(d))


DOC_MODELOS = [
    ("01", "Nota Fiscal", "01/01/2009", ""),
    ("1B", "Nota Fiscal Avulsa", "01/01/2009", ""),
    ("02", "Nota Fiscal de Venda a Consumidor", "01/01/2009", ""),
    ("2D", "Cupom Fiscal emitido por ECF", "01/01/2009", ""),
    ("2E", "Bilhete de Passagem emitido por ECF", "01/01/2009", ""),
    ("04", "Nota Fiscal de Produtor", "01/01/2009", ""),
    ("06", "Nota Fiscal/Conta de Energia Elétrica", "01/01/2009", ""),
    ("07", "Nota Fiscal de Serviço de Transporte", "01/01/2009", ""),
    ("08", "Conhecimento de Transporte Rodoviário de Cargas", "01/01/2009", ""),
    ("8B", "Conhecimento de Transporte de Cargas Avulso", "01/01/2009", ""),
    ("09", "Conhecimento de Transporte Aquaviário de Cargas", "01/01/2009", ""),
    ("10", "Conhecimento Aéreo", "01/01/2009", ""),
    ("11", "Conhecimento de Transporte Ferroviário de Cargas", "01/01/2009", ""),
    ("13", "Bilhete de Passagem Rodoviário", "01/01/2009", ""),
    ("14", "Bilhete de Passagem Aquaviário", "01/01/2009", ""),
    ("15", "Bilhete de Passagem e Nota de Bagagem", "01/01/2009", ""),
    ("17", "Despacho de Transporte", "01/01/2009", ""),
    ("16", "Bilhete de Passagem Ferroviário", "01/01/2009", ""),
    ("18", "Resumo de Movimento Diário", "01/01/2009", ""),
    ("20", "Ordem de Coleta de Cargas", "01/01/2009", ""),
    ("21", "Nota Fiscal de Serviço de Comunicação", "01/01/2009", ""),
    ("22", "Nota Fiscal de Serviço de Telecomunicação", "01/01/2009", ""),
    ("23", "GNRE", "01/01/2009", ""),
    ("24", "Autorização de Carregamento e Transporte", "01/01/2009", ""),
    ("25", "Manifesto de Carga", "01/01/2009", ""),
    ("26", "Conhecimento de Transporte Multimodal de Cargas", "01/01/2009", ""),
    ("27", "Nota Fiscal de Transporte Ferroviário de Cargas", "01/01/2009", ""),
    ("28", "Nota Fiscal/Conta de Fornecimento de Gás Canalizado", "01/01/2009", ""),
    ("29", "Nota Fiscal/Conta de Fornecimento de água Canalizada", "01/01/2009", ""),
    ("30", "Bilhete/Recibo do Passageiro", "01/01/2009", ""),
    ("55", "Nota Fiscal Eletrônica", "01/01/2009", ""),
    ("57", "Conhecimento de Transporte Eletrônico - CT-e", "01/01/2009", ""),
    ("59", "Cupom Fiscal Eletrônico - CF-e", "01/06/2011", ""),
    ("60", "Cupom Fiscal Eletrônico CF-e-ECF", "01/01/2013", ""),
    ("65", "Nota Fiscal Eletrônica ao Consumidor Final - NFC-e", "01/10/2013", ""),
]


class Command(BaseCommand):
    help = "Popula TODAS as tabelas com pelo menos 20 registros cada (relacionamentos preservados)"

    def add_arguments(self, parser):
        parser.add_argument("--alvo", type=int, default=TARGET, help="Qtd mínima por tabela (default: 20)")

    @transaction.atomic
    def handle(self, *args, **opts):
        alvo = max(1, opts["alvo"])

        self.stdout.write(self.style.MIGRATE_HEADING("==> SEED 20+ — iniciando"))

        # MODELOS FISCAIS
        for codigo, descricao, dinic, dfim in DOC_MODELOS:
            ModeloDocumentoFiscal.objects.update_or_create(
                codigo=codigo,
                defaults=dict(descricao=descricao, data_inicial=to_date(dinic), data_final=to_date(dfim), ativo=True)
            )
        while ModeloDocumentoFiscal.objects.count() < alvo:
            i = ModeloDocumentoFiscal.objects.count() + 1
            ModeloDocumentoFiscal.objects.get_or_create(
                codigo=f"ZZ{i:02d}",
                defaults=dict(descricao=f"Modelo Dummy {i:02d}", data_inicial=today(), data_final=None, ativo=False)
            )

        # LOJAS
        lojas = list(Loja.objects.all())
        while len(lojas) < alvo:
            i = len(lojas) + 1
            loja, _ = Loja.objects.get_or_create(
                nome_loja=f"Loja {i}",
                defaults=dict(
                    Apelido_loja=f"LJ{i:02d}", cnpj=f"00.000.000/000{i:02d}", Cidade="São Paulo",
                    Matriz="SIM" if i == 1 else "NAO", EstoqueNegativo="NAO",
                    DataAbertura=today() - timedelta(days=365 * i),
                )
            )
            lojas.append(loja)

        # USERS
        UserModel = get_user_model()
        base_users = [("admin", "Admin", "Root", "Admin", "admin@sysvar.local", None)]
        for uname, fn, ln, tipo, email, lj in base_users:
            u, created = UserModel.objects.get_or_create(
                username=uname, defaults=dict(first_name=fn, last_name=ln, email=email, type=tipo)
            )
            if created:
                u.set_password("123456")
                u.save()
        while UserModel.objects.count() < alvo:
            i = UserModel.objects.count() + 1
            uname = f"user{i:02d}"
            u, created = UserModel.objects.get_or_create(
                username=uname,
                defaults=dict(first_name=f"U{i:02d}", last_name="Seed", email=f"user{i:02d}@sysvar.local", type="Regular")
            )
            if created:
                u.set_password("123456")
                u.Idloja = random.choice(lojas)
                u.save()

        # NCM
        while Ncm.objects.count() < alvo:
            i = Ncm.objects.count() + 1
            base = f"{random.randint(10000000, 99999999)}"
            Ncm.objects.get_or_create(ncm=base, defaults=dict(descricao=f"NCM {base}", aliquota="0.00", campo1=""))

        # UNIDADES
        base_un = [("UN", "UN"), ("PC", "PC"), ("CJ", "CJ")]
        for desc, cod in base_un:
            Unidade.objects.get_or_create(Descricao=desc, defaults=dict(Codigo=cod))
        while Unidade.objects.count() < alvo:
            i = Unidade.objects.count() + 1
            Unidade.objects_get_or_create = Unidade.objects.get_or_create(Descricao=f"U{i:02d}", defaults=dict(Codigo=f"U{i:02d}"))

        # GRUPOS & SUBGRUPOS
        while Grupo.objects.count() < alvo:
            i = Grupo.objects.count() + 1
            Grupo.objects.get_or_create(Codigo=f"{i:02d}",
                                        defaults=dict(Descricao=f"Grupo {i:02d}", Margem=Decimal("40.00")))
        while Subgrupo.objects.count() < alvo:
            i = Subgrupo.objects.count() + 1
            g = Grupo.objects.order_by('Codigo')[(i - 1) % Grupo.objects.count()]
            Subgrupo.objects.get_or_create(Descricao=f"Subgrupo {i:02d}",
                                           defaults=dict(Idgrupo=g, Margem=Decimal("45.00")))

        # FAMÍLIAS
        while Familia.objects.count() < alvo:
            i = Familia.objects.count() + 1
            Familia.objects.get_or_create(Codigo=f"F{i:02d}",
                                          defaults=dict(Descricao=f"Familia {i:02d}", Margem=Decimal("40.00")))

        # MATERIAIS
        while Material.objects.count() < alvo:
            i = Material.objects.count() + 1
            Material.objects.get_or_create(Codigo=f"MAT{i:02d}",
                                           defaults=dict(Descricao=f"Material {i:02d}", Status="A"))

        # COLEÇÕES
        while Colecao.objects.count() < alvo:
            i = Colecao.objects.count() + 1
            Colecao.objects.get_or_create(Codigo=f"{(i % 99):02d}", Estacao=f"{((i % 4) or 1):02d}",
                                          defaults=dict(Descricao=f"Coleção {i:02d}", Status="A", Contador=0))

        # GRADES & TAMANHOS
        while Grade.objects.count() < alvo:
            i = Grade.objects.count() + 1
            Grade.objects.get_or_create(Descricao=f"GRADE-{i:02d}", defaults=dict(Status="A"))
        grades = list(Grade.objects.all())
        while Tamanho.objects.count() < alvo:
            i = Tamanho.objects.count() + 1
            gr = grades[(i - 1) % len(grades)]
            Tamanho.objects.get_or_create(idgrade=gr, Tamanho=f"T{i:02d}",
                                          defaults=dict(Descricao=f"T{i:02d}", Status="A"))

        # CORES
        while Cor.objects.count() < alvo:
            i = Cor.objects.count() + 1
            Cor.objects.get_or_create(
                Descricao=f"Cor {i:02d}",
                defaults=dict(Codigo=f"{i:03d}", Cor="#%06X" % random.randint(0, 0xFFFFFF), Status="A")
            )

        # TABELAS DE PREÇO
        while Tabelapreco.objects.count() < alvo:
            i = Tabelapreco.objects.count() + 1
            Tabelapreco.objects.get_or_create(
                NomeTabela=f"Tabela {i:02d}",
                defaults=dict(DataInicio=today() - timedelta(days=30),
                              DataFim=today() + timedelta(days=365), Promocao="NAO")
            )

        # CÓDIGOS (incrementais) — combos + linha EAN
        while Codigos.objects.exclude(colecao="EA", estacao="13").count() < alvo:
            i = Codigos.objects.exclude(colecao="EA", estacao="13").count() + 1
            Codigos.objects.get_or_create(colecao=f"{(i % 99):02d}", estacao=f"{((i % 4) or 1):02d}",
                                          defaults=dict(valor_var=0))
        Codigos.objects.get_or_create(colecao="EA", estacao="13", defaults=dict(valor_var=0))

        # PRODUTOS
        unidades = [u.Descricao for u in Unidade.objects.all()]
        ncms_vals = list(Ncm.objects.values_list("ncm", flat=True))
        subs = list(Subgrupo.objects.all())
        grades = list(Grade.objects.all())
        colecoes = list(Colecao.objects.all())

        while Produto.objects.count() < alvo:
            i = Produto.objects.count() + 1
            sub = subs[(i - 1) % len(subs)]
            grp = sub.Idgrupo
            gr = grades[(i - 1) % len(grades)]
            cobj = colecoes[(i - 1) % len(colecoes)]
            cc, ee = cobj.Codigo, cobj.Estacao
            codref, _ = Codigos.objects.get_or_create(colecao=cc, estacao=ee, defaults=dict(valor_var=0))
            codref.valor_var = int(codref.valor_var) + 1
            codref.save(update_fields=["valor_var"])
            seq = str(int(codref.valor_var)).zfill(3)
            referencia = f"{cc}-{ee}-{grp.Codigo}{seq}"
            Produto.objects.get_or_create(
                referencia=referencia,
                defaults=dict(
                    Tipoproduto="1",
                    Descricao=f"{grp.Descricao} {sub.Descricao} {seq}",
                    Desc_reduzida=f"{grp.Descricao[:15]} {seq}",
                    classificacao_fiscal=random.choice(ncms_vals),
                    unidade=random.choice(unidades) if unidades else "UN",
                    grupo=grp.Codigo,
                    subgrupo=sub.Descricao,
                    familia=f"Familia {((i % alvo) or alvo):02d}",
                    grade=gr.Descricao,
                    colecao=f"{cc}{ee}",
                    Material=f"MAT{((i % alvo) or alvo):02d}",
                )
            )

        # PRODUTO DETALHE (SKUs)
        produtos = list(Produto.objects.order_by('referencia')[:alvo])
        tabela = Tabelapreco.objects.order_by('Idtabela').first() or Tabelapreco.objects.create(
            NomeTabela="Varejo", DataInicio=today() - timedelta(days=30), DataFim=today() + timedelta(days=365),
            Promocao="NAO"
        )
        ean_ctrl, _ = Codigos.objects.get_or_create(colecao="EA", estacao="13", defaults=dict(valor_var=0))

        while ProdutoDetalhe.objects.count() < alvo:
            i = ProdutoDetalhe.objects.count() + 1
            prod = produtos[(i - 1) % len(produtos)]
            cor = Cor.objects.order_by('Codigo')[(i - 1) % Cor.objects.count()]
            tam = Tamanho.objects.order_by('Tamanho')[(i - 1) % Tamanho.objects.count()]
            ean_ctrl.valor_var = int(ean_ctrl.valor_var) + 1
            ean_ctrl.save(update_fields=["valor_var"])
            ean = next_ean(int(ean_ctrl.valor_var))

            pd, created = ProdutoDetalhe.objects.get_or_create(
                CodigodeBarra=ean,
                defaults=dict(Idproduto=prod, Idcor=cor, Idtamanho=tam, Codigoproduto=prod.referencia, Item=0)
            )
            if created and TabelaPrecoItem.objects.filter(codigodebarra=ean, idtabela=tabela).count() == 0:
                TabelaPrecoItem.objects.create(
                    codigodebarra=ean, idtabela=tabela, codigoproduto=prod.referencia, preco=rnd_decimal(79, 299)
                )

        # ESTOQUE
        skus = list(ProdutoDetalhe.objects.all())
        while Estoque.objects.count() < alvo:
            i = Estoque.objects.count() + 1
            lj = lojas[(i - 1) % len(lojas)]
            pd = skus[(i - 1) % len(skus)]
            Estoque.objects.update_or_create(
                Idloja=lj, CodigodeBarra=pd.CodigodeBarra,
                defaults=dict(codigoproduto=pd.Codigoproduto, Estoque=random.randint(0, 15), reserva=0,
                              valorestoque=Decimal("0.00"))
            )

        # CLIENTES
        while Cliente.objects.count() < alvo:
            i = Cliente.objects.count() + 1
            Cliente.objects.get_or_create(
                cpf=f"000000000{i:02d}",
                defaults=dict(Nome_cliente=f"Cliente {i:02d}", Apelido=f"C{i:02d}",
                              email=f"cliente{i:02d}@teste.com", Cidade="São Paulo", MalaDireta=bool(i % 2))
            )

        # FORNECEDORES
        while Fornecedor.objects.count() < alvo:
            i = Fornecedor.objects.count() + 1
            Fornecedor.objects.get_or_create(
                Cnpj=f"11.111.111/00{i:02d}",
                defaults=dict(Nome_fornecedor=f"Fornecedor {i:02d}", Apelido=f"F{i:02d}", Cidade="São Paulo")
            )

        # FUNCIONÁRIOS
        while Funcionarios.objects.count() < alvo:
            i = Funcionarios.objects.count() + 1
            Funcionarios.objects.get_or_create(
                cpf=f"222222222{i:02d}",
                defaults=dict(nomefuncionario=f"Funcionario {i:02d}", apelido=f"FNC{i:02d}",
                              inicio=today() - timedelta(days=200 + i), categoria="Vendedor",
                              meta=Decimal("5000.00"), idloja=random.choice(lojas))
            )

        # VENDEDORES
        while Vendedor.objects.count() < alvo:
            i = Vendedor.objects.count() + 1
            Vendedor.objects.get_or_create(
                cpf=f"333333333{i:02d}",
                defaults=dict(nomevendedor=f"Vendedor {i:02d}", apelido=f"VEN{i:02d}",
                              aniversario=today() - timedelta(days=365 * (20 + i)), categoria="A",
                              idloja=random.choice(lojas))
            )

        # CONTAS BANCÁRIAS  (usar apenas Decimal)
        while ContaBancaria.objects.count() < alvo:
            i = ContaBancaria.objects.count() + 1
            fator = Decimal(1) + (Decimal(i) / Decimal(10))
            ContaBancaria.objects.get_or_create(
                descricao=f"Conta {i:02d}",
                defaults=dict(
                    banco="Banco XPTO", agencia=f"{i:04d}", numero=10000 + i, DataSaldo=today(),
                    Saldo=(Decimal("10000.00") * fator).quantize(Decimal("0.01"))
                )
            )

        # IMPOSTOS (1 por loja até alvo)
        for lj in lojas[:alvo]:
            Imposto.objects.get_or_create(
                idloja=lj,
                defaults=dict(icms=Decimal("18.00"), pis=Decimal("1.65"),
                              cofins=Decimal("7.60"), csll=Decimal("9.00"))
            )

        # CAIXA
        while Caixa.objects.count() < alvo:
            i = Caixa.objects.count() + 1
            lj = lojas[(i - 1) % len(lojas)]
            Caixa.objects.get_or_create(
                idloja=lj, data=today() - timedelta(days=i % 10),
                defaults=dict(
                    saldoanterior=Decimal("1000.00"), saldofinal=Decimal("1500.00"),
                    despesas=Decimal("200.00"), pix=Decimal("300.00"), debito=Decimal("200.00"),
                    credito=Decimal("400.00"), parcelado=Decimal("100.00"), dinheiro=Decimal("500.00"),
                    status="A", enviado=False, usuario="seed"
                )
            )

        # DESPESAS
        while Despesa.objects.count() < alvo:
            i = Despesa.objects.count() + 1
            Despesa.objects.get_or_create(
                idloja=random.choice(lojas), data=today() - timedelta(days=i % 10),
                defaults=dict(descricao=f"Despesa {i:02d}", autorizado="Gerente",
                              valor=Decimal("150.00") + Decimal(i), recibo=f"REC-{i:04d}")
            )

        # MOV. FINANCEIRA
        while MovimentacaoFinanceira.objects.count() < alvo:
            i = MovimentacaoFinanceira.objects.count() + 1
            MovimentacaoFinanceira.objects.get_or_create(
                Idconta=random.choice(ContaBancaria.objects.all()), data_movimento=today(),
                Titulo=f"{random.randint(10000000, 99999999)}-0", TipoMov="C", TipoFluxo="R",
                defaults=dict(valor=rnd_decimal(100, 5000))
            )

        # NATUREZAS
        while Nat_Lancamento.objects.count() < alvo:
            i = Nat_Lancamento.objects.count() + 1
            Nat_Lancamento.objects.get_or_create(
                codigo=f"{(i % 3) + 1}.{(i % 5) + 1}.{(i % 7) + 1}",
                defaults=dict(
                    categoria_principal="Receitas" if i % 2 else "Despesas",
                    subcategoria=f"Subcat {i:02d}",
                    descricao=f"Natureza {i:02d}",
                    tipo="R" if i % 2 else "D",
                    status="AT",
                    tipo_natureza="R" if i % 2 else "D"
                )
            )

        # RECEBER + ITENS
        while Receber.objects.count() < alvo:
            i = Receber.objects.count() + 1
            lj = random.choice(lojas)
            Receber.objects.get_or_create(
                idloja=lj, Documento=f"RCB-{lj.Idloja}-{i:03d}",
                defaults=dict(Valor=rnd_decimal(200, 2000), ContaContabil="3.1.1", Nat_Lancamento="VENDAS")
            )
        while ReceberItens.objects.count() < alvo:
            i = ReceberItens.objects.count() + 1
            rcb = random.choice(Receber.objects.all())
            ReceberItens.objects.get_or_create(
                Idreceber=rcb, Titulo=f"{random.randint(10000000, 99999999)}-1",
                defaults=dict(
                    Parcela=1,
                    Datavencimento=today() + timedelta(days=random.randint(10, 60)),
                    Databaixa=None,
                    valor_parcela=rcb.Valor,
                    juros=Decimal("0.00"),
                    desconto=Decimal("0.00"),
                    Titulo_descontado="N",
                    Data_desconto=None,
                    idconta=random.choice(ContaBancaria.objects.all()).Idconta
                )
            )

        # PEDIDO DE COMPRA
        while PedidoCompra.objects.count() < alvo:
            i = PedidoCompra.objects.count() + 1
            lj = random.choice(lojas)
            f = random.choice(Fornecedor.objects.all())
            PedidoCompra.objects.get_or_create(
                Idfornecedor=f, Idloja=lj, Documento=f"PC-{lj.Idloja}-{i:03d}",
                defaults=dict(
                    Datapedido=today() - timedelta(days=random.randint(5, 15)),
                    Dataentrega=today() + timedelta(days=random.randint(5, 20)),
                    Valorpedido=Decimal("0.00"), Status="AB", data_nf=None, Chave=None
                )
            )
        while PedidoCompraItem.objects.count() < alvo:
            i = PedidoCompraItem.objects.count() + 1
            pc = random.choice(PedidoCompra.objects.all())
            p = random.choice(Produto.objects.all())
            qty = random.randint(1, 5)
            vu = rnd_decimal(40, 120)
            PedidoCompraItem.objects.get_or_create(
                Idpedidocompra=pc, Idproduto=p,
                defaults=dict(Qtp_pc=qty, valorunitario=vu, Desconto=Decimal("0.00"), Total_item=(vu * qty))
            )

        # COMPRA
        while Compra.objects.count() < alvo:
            i = Compra.objects.count() + 1
            lj = random.choice(lojas)
            f = random.choice(Fornecedor.objects.all())
            Compra.objects.get_or_create(
                Idfornecedor=f, Idloja=lj, Documento=f"NF-{lj.Idloja}-{i:03d}",
                defaults=dict(
                    Datacompra=today() - timedelta(days=random.randint(1, 7)),
                    Status="OK", Valorpedido=rnd_decimal(500, 5000), Datadocumento=today()
                )
            )
        while CompraItem.objects.count() < alvo:
            i = CompraItem.objects.count() + 1
            comp = random.choice(Compra.objects.all())
            p = random.choice(Produto.objects.all())
            qty = random.randint(1, 3)
            vu = rnd_decimal(50, 150)
            CompraItem.objects.get_or_create(
                Idcompra=comp, Idproduto=p,
                defaults=dict(Qtd=qty, Valorunitario=vu, Descontoitem=Decimal("0.00"), Totalitem=(vu * qty))
            )

        # INVENTÁRIO
        while Inventario.objects.count() < alvo:
            i = Inventario.objects.count() + 1
            lj = random.choice(lojas)
            Inventario.objects.get_or_create(
                Idloja=lj, Data_inventario=today() - timedelta(days=random.randint(1, 5)),
                defaults=dict(Descricao=f"Inventário {lj.Apelido_loja}-{i:02d}", status="OK")
            )
        while InventarioItem.objects.count() < alvo:
            i = InventarioItem.objects.count() + 1
            inv = random.choice(Inventario.objects.all())
            det = random.choice(ProdutoDetalhe.objects.all())
            InventarioItem.objects.get_or_create(
                Idinventario=inv, Idproduto=det.Idproduto, Idprodutodetalhe=det,
                defaults=dict(Valor_contado=random.randint(5, 15), Valor_ajustado=random.randint(5, 15))
            )

        # VENDAS + ITENS + MOV.PRODUTOS  (ANTES de ReceberCartao!)
        while Venda.objects.count() < alvo:
            i = Venda.objects.count() + 1
            lj = random.choice(lojas)
            cli = random.choice(Cliente.objects.all())
            doc = f"V-{lj.Idloja}-{i:05d}"
            Venda.objects.get_or_create(
                Idloja=lj, Idcliente=cli, Documento=doc,
                defaults=dict(
                    Data=timezone.now(), Desconto=Decimal("0.00"),
                    Cancelada=None, Valor=Decimal("0.00"), Tipo_documento="CF",
                    Idfuncionario=random.choice(Funcionarios.objects.all()),
                    comissao=Decimal("0.00000"), acrescimo=Decimal("0.00000"),
                    tipopag="Cartao", ticms=Decimal("0.00"), tpis=Decimal("0.00"),
                    tcofins=Decimal("0.00"), tcsll=Decimal("0.00")
                )
            )
        while VendaItem.objects.count() < alvo:
            i = VendaItem.objects.count() + 1
            vnd = random.choice(Venda.objects.all())
            det = random.choice(ProdutoDetalhe.objects.all())
            tpi = TabelaPrecoItem.objects.filter(codigodebarra=det.CodigodeBarra).first()
            valor_unit = tpi.preco if tpi else rnd_decimal(79, 299)
            qtd = random.randint(1, 2)
            tot = (valor_unit * qtd).quantize(Decimal("0.01"))
            VendaItem.objects.get_or_create(
                Documento=vnd.Documento, CodigodeBarra=det.CodigodeBarra, codigoproduto=det.Codigoproduto,
                defaults=dict(Qtd=qtd, valorunitario=valor_unit, Desconto=Decimal("0.00"),
                              Total_item=tot, iicms=Decimal("0.00"), ipis=Decimal("0.00"),
                              icofins=Decimal("0.00"), icsll=Decimal("0.00"))
            )
            # Movimentação + baixa simbólica
            MovimentacaoProdutos.objects.get_or_create(
                Idloja=vnd.Idloja, Data_mov=today(), Documento=vnd.Documento, Tipo="V",
                Qtd=qtd, Valor=valor_unit, CodigodeBarra=det.CodigodeBarra, codigoproduto=det.Codigoproduto
            )
            for est in Estoque.objects.filter(CodigodeBarra=det.CodigodeBarra, Idloja=vnd.Idloja):
                est.Estoque = max(0, (est.Estoque or 0) - qtd)
                est.save()

        while MovimentacaoProdutos.objects.count() < alvo:
            i = MovimentacaoProdutos.objects.count() + 1
            det = random.choice(ProdutoDetalhe.objects.all())
            lj = random.choice(lojas)
            MovimentacaoProdutos.objects.get_or_create(
                Idloja=lj, Data_mov=today() - timedelta(days=i % 7), Documento=f"ENT-{lj.Idloja}-{i:03d}",
                Tipo="E", Qtd=random.randint(1, 5), Valor=rnd_decimal(30, 60),
                CodigodeBarra=det.CodigodeBarra, codigoproduto=det.Codigoproduto
            )

        # RECEBER CARTAO (com vendas existentes)
        if ReceberCartao.objects.count() < alvo:
            vendas = list(Venda.objects.order_by('Documento')[:alvo])
            if not vendas:
                # fallback defensivo
                lj = random.choice(lojas)
                cli = Cliente.objects.order_by('cpf').first() or Cliente.objects.create(
                    cpf="99999999999", Nome_cliente="Cliente Seed", Apelido="SEED",
                    email="seed@teste.com", Cidade="São Paulo", MalaDireta=False
                )
                func = Funcionarios.objects.order_by('cpf').first() or Funcionarios.objects.create(
                    cpf="88888888888", nomefuncionario="Func Seed", apelido="FSEED",
                    inicio=today(), categoria="Vendedor", meta=Decimal("5000.00"), idloja=lj
                )
                doc = f"V-{lj.Idloja}-{random.randint(10000, 99999)}"
                vendas = [Venda.objects.create(
                    Idloja=lj, Idcliente=cli, Documento=doc, Data=timezone.now(),
                    Desconto=Decimal("0.00"), Cancelada=None, Valor=Decimal("0.00"),
                    Tipo_documento="CF", Idfuncionario=func,
                    comissao=Decimal("0.00000"), acrescimo=Decimal("0.00000"),
                    tipopag="Cartao", ticms=Decimal("0.00"), tpis=Decimal("0.00"),
                    tcofins=Decimal("0.00"), tcsll=Decimal("0.00")
                )]

            for i, vnd in enumerate(vendas, start=1):
                ReceberCartao.objects.get_or_create(
                    idvenda=vnd,
                    defaults=dict(
                        tipo_cartao="Crédito",
                        valor_transacao=rnd_decimal(100, 2000),
                        codigo_autorizacao=str(random.randint(100000, 999999)),
                        bandeira=random.choice(["VISA", "MASTERCARD", "ELO"]),
                        parcelas=1,
                        numero_titulo=f"TIT-{i:05d}",
                        status_transacao="Aprovada",
                    )
                )
                if ReceberCartao.objects.count() >= alvo:
                    break

        # MAPEAMENTOS FORNECEDOR → SKU/PRODUTO (usar nomes de campo do seu model)
        while FornecedorSkuMap.objects.count() < alvo:
            i = FornecedorSkuMap.objects.count() + 1
            f = random.choice(Fornecedor.objects.all())
            det = random.choice(ProdutoDetalhe.objects.all())
            FornecedorSkuMap.objects.get_or_create(
                Idfornecedor=f,
                cprod_fornecedor=f"SKU-{i:04d}",
                defaults=dict(
                    Idprodutodetalhe=det,
                    # Idproduto pode ser omitido para mapear diretamente o SKU.
                    ativo=True
                )
            )

        # NF-e ENTRADA + ITENS
        while NFeEntrada.objects.count() < alvo:
            i = NFeEntrada.objects.count() + 1
            lj = random.choice(lojas)
            f = random.choice(Fornecedor.objects.all())
            NFeEntrada.objects.create(
                chave=str(random.randint(10 ** 43, 10 ** 44 - 1)),
                numero=str(10000 + i), serie="1", dhEmi=timezone.now(),
                cnpj_emitente=f.Cnpj.replace(".", "").replace("/", "").replace("-", "")[:14],
                razao_emitente=f.Nome_fornecedor, Idfornecedor=f, Idloja=lj,
                vProd=rnd_decimal(500, 3000), vDesc=Decimal("0.00"),
                vFrete=rnd_decimal(0, 150), vOutro=Decimal("0.00"), vIPI=Decimal("0.00"),
                vICMSST=Decimal("0.00"), vNF=rnd_decimal(500, 3000),
                status="importada", modelo=ModeloDocumentoFiscal.objects.filter(codigo="55").first()
            )
        while NFeItem.objects.count() < alvo:
            i = NFeItem.objects.count() + 1
            nfe = random.choice(NFeEntrada.objects.all())
            det = random.choice(ProdutoDetalhe.objects.all())
            NFeItem.objects.create(
                nfe=nfe, ordem=i, cProd=f"EAN-OK-{i:03d}", xProd=f"Item NF {i:03d}",
                ncm=random.choice(Ncm.objects.values_list('ncm', flat=True)), cfop="5102", uCom="UN",
                qCom=Decimal("1.000"), vUnCom=rnd_decimal(49, 199), vProd=rnd_decimal(49, 199),
                cean=det.CodigodeBarra, vDesc=Decimal("0.00"), vFrete=Decimal("0.00"), vOutro=Decimal("0.00")
            )

        self.stdout.write(self.style.MIGRATE_HEADING("==> SEED 20+ — finalizado com sucesso!"))
