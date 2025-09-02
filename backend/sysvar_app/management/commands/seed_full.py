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
    Imposto, Caixa, Despesa
)

# ---------- helpers ----------
def ean13_check_digit(base12: str) -> str:
    soma = 0
    for i, ch in enumerate(base12):
        soma += int(ch) * (3 if (i + 1) % 2 == 0 else 1)
    dv = (10 - (soma % 10)) % 10
    return str(dv)

def next_ean(seq: int) -> str:
    # 789 + 1234 + seq5 + DV
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

class Command(BaseCommand):
    help = "Popula TODAS as tabelas com dados realistas para desenvolvimento"

    def add_arguments(self, parser):
        parser.add_argument("--lojas", type=int, default=3, help="Qtd de lojas (default: 3)")
        parser.add_argument("--produtos", type=int, default=12, help="Qtd de produtos (default: 12)")
        parser.add_argument("--clientes", type=int, default=20, help="Qtd de clientes (default: 20)")

    @transaction.atomic
    def handle(self, *args, **opts):
        q_lojas = max(1, opts["lojas"])
        q_prod  = max(1, opts["produtos"])
        q_cli   = max(0, opts["clientes"])

        self.stdout.write(self.style.MIGRATE_HEADING("==> SEED COMPLETO — iniciando"))

        # ---------------- LOJAS ----------------
        lojas = []
        for i in range(1, q_lojas + 1):
            loja, _ = Loja.objects.get_or_create(
                nome_loja=f"Loja {i}",
                defaults=dict(
                    Apelido_loja=f"LJ{i:02d}",
                    cnpj=f"00.000.000/000{i:02d}",
                    Cidade="São Paulo",
                    Matriz="SIM" if i == 1 else "NAO",
                    EstoqueNegativo="NAO",
                    DataAbertura=today() - timedelta(days=365*i),
                )
            )
            lojas.append(loja)
        self.stdout.write(self.style.SUCCESS(f"Lojas criadas: {len(lojas)}"))

        # --------------- USUÁRIOS ---------------
        UserModel = get_user_model()
        spec_users = [
            ("admin",    "Admin",  "Root",     "Admin",    "admin@sysvar.local",  None),
            ("gerente1", "Ger",    "Um",       "Gerente",  "ger1@sysvar.local",   lojas[0]),
            ("caixa1",   "Caixa",  "A",        "Caixa",    "caixa1@sysvar.local", lojas[min(1, len(lojas)-1)]),
            ("aux1",     "Aux",    "A",        "Auxiliar", "aux1@sysvar.local",   lojas[min(2, len(lojas)-1)]),
        ]
        for uname, fn, ln, tipo, email, lj in spec_users:
            u, created = UserModel.objects.get_or_create(
                username=uname,
                defaults=dict(first_name=fn, last_name=ln, email=email, type=tipo)
            )
            if created:
                u.set_password("123456")
            # vincula Idloja (campo existe no seu User)
            u.Idloja = lj
            u.save()
        self.stdout.write(self.style.SUCCESS("Usuários exemplo ok"))

        # --------------- NCM --------------------
        ncm_items = [
            ("61046200", "Vestuário malha algodão", "0.00", ""),
            ("61046300", "Vestuário malha sintética", "0.00", ""),
            ("62044200", "Vestuário tecido algodão", "0.00", ""),
        ]
        ncms = []
        for ncmv, desc, aliq, campo1 in ncm_items:
            n, _ = Ncm.objects.get_or_create(
                ncm=ncmv, defaults=dict(descricao=desc, aliquota=aliq, campo1=campo1)
            )
            ncms.append(n)
        self.stdout.write(self.style.SUCCESS(f"NCMs: {len(ncms)}"))

        # ------------- UNIDADES -----------------
        un_codes = [("UN", "UN"), ("PC", "PC"), ("CJ", "CJ")]
        for desc, cod in un_codes:
            Unidade.objects.get_or_create(Descricao=desc, defaults=dict(Codigo=cod))
        self.stdout.write(self.style.SUCCESS("Unidades ok"))

        # -------------- GRUPOS/SUBGRUPOS -------
        grupos_spec = [
            ("01", "Blusas", 50.00),
            ("02", "Saias",  55.00),
            ("03", "Vestidos", 60.00),
        ]
        grupos_map = {}
        for cod, desc, margem in grupos_spec:
            g, _ = Grupo.objects.get_or_create(Codigo=cod, defaults=dict(Descricao=desc, Margem=Decimal(str(margem))))
            grupos_map[cod] = g
        # subgrupos
        sub_map = {}
        for cod, g in grupos_map.items():
            for sdesc in ["Básico", "Premium", "Linha Especial"]:
                sg, _ = Subgrupo.objects.get_or_create(Descricao=sdesc, defaults=dict(Idgrupo=g, Margem=Decimal("45.00")))
                sub_map.setdefault(cod, []).append(sg)
        self.stdout.write(self.style.SUCCESS(f"Grupos/Subgrupos ok"))

        # ---------------- FAMÍLIAS --------------
        for fcod, fdesc, margem in [("F1", "Casual", 40.0), ("F2", "Social", 45.0)]:
            Familia.objects.get_or_create(Codigo=fcod, defaults=dict(Descricao=fdesc, Margem=Decimal(str(margem))))
        self.stdout.write(self.style.SUCCESS("Famílias ok"))

        # ---------------- MATERIAIS -------------
        for mcod, mdesc in [("ALG", "Algodão"), ("POL", "Poliéster"), ("VIS", "Viscose")]:
            Material.objects.get_or_create(Codigo=mcod, defaults=dict(Descricao=mdesc, Status="A"))
        self.stdout.write(self.style.SUCCESS("Materiais ok"))

        # ---------------- COLEÇÕES --------------
        col_specs = [("01", "01", "Inverno 01"), ("02", "02", "Verão 02"), ("03", "01", "Inverno 03")]
        col_map = {}
        for cc, ee, desc in col_specs:
            c, _ = Colecao.objects.get_or_create(
                Codigo=cc, Estacao=ee,
                defaults=dict(Descricao=desc, Status="A", Contador=0)
            )
            col_map[(cc, ee)] = c
        self.stdout.write(self.style.SUCCESS("Coleções ok"))

        # --------------- GRADES/TAMANHOS --------
        grade_alf, _ = Grade.objects.get_or_create(Descricao="P-M-G-GG", defaults=dict(Status="A"))
        for t in ["P", "M", "G", "GG"]:
            Tamanho.objects.get_or_create(idgrade=grade_alf, Tamanho=t, defaults=dict(Descricao=t, Status="A"))

        grade_num, _ = Grade.objects.get_or_create(Descricao="34-36-38-40-42", defaults=dict(Status="A"))
        for t in ["34", "36", "38", "40", "42"]:
            Tamanho.objects.get_or_create(idgrade=grade_num, Tamanho=t, defaults=dict(Descricao=t, Status="A"))
        self.stdout.write(self.style.SUCCESS("Grades/Tamanhos ok"))

        # ---------------- CORES -----------------
        cores_seed = [
            ("Preto", "001", "#000000"), ("Branco", "002", "#FFFFFF"),
            ("Vermelho", "010", "#EF4444"), ("Azul Marinho", "020", "#1E3A8A"),
            ("Verde", "030", "#10B981"), ("Bege", "040", "#F5F5DC"),
        ]
        cores = []
        for desc, cod, hexcor in cores_seed:
            c, _ = Cor.objects.get_or_create(Descricao=desc, defaults=dict(Codigo=cod, Cor=hexcor, Status="A"))
            cores.append(c)
        self.stdout.write(self.style.SUCCESS(f"Cores: {len(cores)}"))

        # ---------------- TABELA PREÇO ----------
        t_inicio = today() - timedelta(days=30)
        t_fim = today() + timedelta(days=365)
        tabela, _ = Tabelapreco.objects.get_or_create(
            NomeTabela="Varejo",
            defaults=dict(DataInicio=t_inicio, DataFim=t_fim, Promocao="Nao")
        )
        self.stdout.write(self.style.SUCCESS("Tabela de preço ok"))

        # ---------------- CÓDIGOS ---------------
        # referências por (colecao, estacao)
        for (cc, ee) in col_map.keys():
            Codigos.objects.get_or_create(colecao=cc, estacao=ee, defaults=dict(valor_var=0))
        # linha especial para EAN
        Codigos.objects.get_or_create(colecao="EA", estacao="13", defaults=dict(valor_var=0))
        self.stdout.write(self.style.SUCCESS("Controle de códigos (Codigos) ok"))

        # ---------------- PRODUTOS + SKUs -------
        unidades = ["UN", "PC"]
        ncms_vals = [n.ncm for n in ncms]
        all_tamanhos_alf = list(Tamanho.objects.filter(idgrade=grade_alf).order_by("Tamanho"))
        all_tamanhos_num = list(Tamanho.objects.filter(idgrade=grade_num).order_by("Tamanho"))

        produtos = []
        skus_total = 0

        for i in range(q_prod):
            # escolhe grupo/coleção
            gcod = random.choice(list(grupos_map.keys()))
            grp = grupos_map[gcod]
            sgrp = random.choice(sub_map[gcod])
            cc, ee = random.choice(list(col_map.keys()))
            col = col_map[(cc, ee)]
            grade = grade_alf if gcod in ("01", "03") else grade_num
            tamanhos = all_tamanhos_alf if grade == grade_alf else all_tamanhos_num

            # gera referência (CC-EE-GGXXX)
            row = Codigos.objects.select_for_update().get(colecao=cc, estacao=ee)
            row.valor_var = int(row.valor_var) + 1
            row.save(update_fields=["valor_var"])
            seq = str(int(row.valor_var)).zfill(3)
            referencia = f"{cc}-{ee}-{gcod}{seq}"

            # produto
            p, _ = Produto.objects.get_or_create(
                referencia=referencia,
                defaults=dict(
                    Tipoproduto="1",
                    Descricao=f"{grp.Descricao} {sgrp.Descricao} {seq}",
                    Desc_reduzida=f"{grp.Descricao[:15]} {seq}",
                    classificacao_fiscal=random.choice(ncms_vals),
                    unidade=random.choice(unidades),
                    grupo=gcod,                 # string conforme seu modelo
                    subgrupo=sgrp.Descricao,    # string
                    familia=random.choice(["Casual", "Social"]),
                    grade=grade.Descricao,      # string
                    colecao=f"{cc}{ee}",
                    Material=random.choice(["ALG", "POL", "VIS"]),
                )
            )
            produtos.append(p)

            # cores (2 por produto) x tamanhos
            cores_esc = random.sample(cores, k=min(2, len(cores)))
            for cor in cores_esc:
                for tam in tamanhos:
                    # EAN
                    row_ean = Codigos.objects.select_for_update().get(colecao="EA", estacao="13")
                    row_ean.valor_var = int(row_ean.valor_var) + 1
                    row_ean.save(update_fields=["valor_var"])
                    ean = next_ean(int(row_ean.valor_var))

                    pd, created_pd = ProdutoDetalhe.objects.get_or_create(
                        CodigodeBarra=ean,
                        defaults=dict(
                            Idproduto=p,
                            Idcor=cor,
                            Idtamanho=tam,
                            Codigoproduto=referencia,
                            Item=0
                        )
                    )
                    if created_pd:
                        skus_total += 1

                    # preço por EAN na tabela
                    TabelaPrecoItem.objects.update_or_create(
                        codigodebarra=ean,
                        idtabela=tabela,
                        defaults=dict(codigoproduto=referencia, preco=rnd_decimal(79, 299))
                    )

                    # estoque por loja
                    for idx, lj in enumerate(lojas):
                        qty = (idx * 2 + random.randint(0, 3))
                        Estoque.objects.update_or_create(
                            Idloja=lj, CodigodeBarra=ean,
                            defaults=dict(codigoproduto=referencia, Estoque=qty, reserva=0, valorestoque=Decimal("0.00"))
                        )

        self.stdout.write(self.style.SUCCESS(f"Produtos: {len(produtos)} / SKUs: {skus_total}"))

        # ---------------- CLIENTES --------------
        for i in range(1, q_cli + 1):
            Cliente.objects.get_or_create(
                cpf=f"000000000{i:02d}",
                defaults=dict(
                    Nome_cliente=f"Cliente {i}", Apelido=f"C{i:02d}",
                    email=f"cliente{i}@teste.com", Cidade="São Paulo", MalaDireta=bool(i % 2)
                )
            )
        self.stdout.write(self.style.SUCCESS(f"Clientes: {q_cli}"))

        # ---------------- FORNECEDORES ----------
        forn_list = []
        for i in range(1, 6):
            f, _ = Fornecedor.objects.get_or_create(
                Cnpj=f"11.111.111/000{i:02d}",
                defaults=dict(Nome_fornecedor=f"Fornecedor {i}", Apelido=f"F{i:02d}", Cidade="São Paulo")
            )
            forn_list.append(f)
        self.stdout.write(self.style.SUCCESS("Fornecedores ok"))

        # ---------------- FUNCIONÁRIOS ----------
        funcs = []
        for i, lj in enumerate(lojas, start=1):
            fu, _ = Funcionarios.objects.get_or_create(
                cpf=f"222222222{i:02d}",
                defaults=dict(
                    nomefuncionario=f"Funcionario {i}", apelido=f"FNC{i:02d}",
                    inicio=today() - timedelta(days=200+i), categoria="Vendedor",
                    meta=Decimal("5000.00"), idloja=lj
                )
            )
            funcs.append(fu)
        self.stdout.write(self.style.SUCCESS("Funcionários ok"))

        # ---------------- VENDEDORES ------------
        for i, lj in enumerate(lojas, start=1):
            Vendedor.objects.get_or_create(
                cpf=f"333333333{i:02d}",
                defaults=dict(
                    nomevendedor=f"Vendedor {i}", apelido=f"VEN{i:02d}",
                    aniversario=today() - timedelta(days=365*(20+i)), categoria="A", idloja=lj
                )
            )
        self.stdout.write(self.style.SUCCESS("Vendedores ok"))

        # ---------------- CONTAS BANCÁRIAS ------
        contas = []
        for i in range(1, 3):
            c, _ = ContaBancaria.objects.get_or_create(
                descricao=f"Conta {i}",
                defaults=dict(
                    banco="Banco XPTO", agencia=f"000{i}", numero=1000+i, DataSaldo=today(),
                    Saldo=Decimal("10000.00") * i
                )
            )
            contas.append(c)
        self.stdout.write(self.style.SUCCESS("Contas bancárias ok"))

        # ---------------- IMPOSTOS (por loja) ---
        for lj in lojas:
            Imposto.objects.get_or_create(
                idloja=lj,
                defaults=dict(icms=Decimal("18.00"), pis=Decimal("1.65"), cofins=Decimal("7.60"), csll=Decimal("9.00"))
            )
        self.stdout.write(self.style.SUCCESS("Impostos por loja ok"))

        # ---------------- CAIXA/DESPESAS --------
        for lj in lojas:
            cx, _ = Caixa.objects.get_or_create(
                idloja=lj, data=today(),
                defaults=dict(
                    saldoanterior=Decimal("1000.00"), saldofinal=Decimal("1500.00"),
                    despesas=Decimal("200.00"), pix=Decimal("300.00"), debito=Decimal("200.00"),
                    credito=Decimal("400.00"), parcelado=Decimal("100.00"), dinheiro=Decimal("500.00"),
                    status="A", enviado=False, usuario="seed"
                )
            )
            Despesa.objects.get_or_create(
                idloja=lj, data=today(), descricao="Água e Luz", autorizado="Gerente",
                valor=Decimal("150.00"), recibo="REC-0001"
            )
        self.stdout.write(self.style.SUCCESS("Caixa/Despesas ok"))

        # ---------------- MOV. FINANCEIRA -------
        for c in contas:
            MovimentacaoFinanceira.objects.get_or_create(
                Idconta=c, data_movimento=today(),
                Titulo="00000001-0", TipoMov="C", TipoFluxo="R",
                defaults=dict(valor=Decimal("1234.56"))
            )
        self.stdout.write(self.style.SUCCESS("Movimentações financeiras ok"))

        # ---------------- COMPRAS/PEDIDOS -------
        # pega alguns produtos para itens
        some_products = list(Produto.objects.all()[:min(5, Produto.objects.count())])

        # Pedido de compra
        for lj in lojas:
            f = random.choice(forn_list)
            pc, _ = PedidoCompra.objects.get_or_create(
                Idfornecedor=f, Idloja=lj, Documento=f"PC-{lj.Idloja}-001",
                defaults=dict(
                    Datapedido=today()-timedelta(days=10), Dataentrega=today()+timedelta(days=10),
                    Valorpedido=Decimal("0.00"), Status="AB", data_nf=None, Chave=None
                )
            )
            total_pc = Decimal("0.00")
            for p in some_products:
                qty = random.randint(2, 5)
                vu = rnd_decimal(40, 120)
                tot = vu * qty
                PedidoCompraItem.objects.get_or_create(
                    Idpedidocompra=pc, Idproduto=p,
                    defaults=dict(Qtp_pc=qty, valorunitario=vu, Desconto=Decimal("0.00"), Total_item=tot)
                )
                total_pc += tot
            pc.Valorpedido = total_pc
            pc.save()

            # Compra vinculada
            comp, _ = Compra.objects.get_or_create(
                Idfornecedor=f, Idloja=lj, Documento=f"NF-{lj.Idloja}-001",
                defaults=dict(
                    Datacompra=today()-timedelta(days=5),
                    Status="OK", Valorpedido=total_pc, Datadocumento=today()
                )
            )
            for p in some_products:
                qty = random.randint(1, 3)
                vu = rnd_decimal(50, 150)
                tot = vu * qty
                CompraItem.objects.get_or_create(
                    Idcompra=comp, Idproduto=p,
                    defaults=dict(Qtd=qty, Valorunitario=vu, Descontoitem=Decimal("0.00"), Totalitem=tot)
                )
        self.stdout.write(self.style.SUCCESS("Pedidos/Compras ok"))

        # ---------------- RECEITAS/PAGAMENTOS ---
        # Natureza
        n1, _ = Nat_Lancamento.objects.get_or_create(
            codigo="1.1.1", defaults=dict(
                categoria_principal="Receitas", subcategoria="Vendas",
                descricao="Receita de Vendas", tipo="R", status="AT", tipo_natureza="R"
            )
        )
        n2, _ = Nat_Lancamento.objects.get_or_create(
            codigo="2.1.1", defaults=dict(
                categoria_principal="Despesas", subcategoria="Fornecedores",
                descricao="Compra de Mercadorias", tipo="D", status="AT", tipo_natureza="D"
            )
        )

        # Receber + itens
        for lj in lojas:
            rcb, _ = Receber.objects.get_or_create(
                idloja=lj, Documento=f"RCB-{lj.Idloja}-001",
                defaults=dict(Valor=Decimal("500.00"), ContaContabil="3.1.1", Nat_Lancamento="VENDAS")
            )
            ReceberItens.objects.get_or_create(
                Idreceber=rcb, Titulo="00000000-1",
                defaults=dict(Parcela=1, Datavencimento=today()+timedelta(days=15),
                              Databaixa=None, valor_parcela=Decimal("500.00"),
                              juros=Decimal("0.00"), desconto=Decimal("0.00"),
                              Titulo_descontado="N", Data_desconto=None, idconta=contas[0].Idconta)
            )

        # Pagar + itens
        for lj in lojas:
            pg, _ = Pagar.objects.get_or_create(
                idloja=lj, Titulo=f"PAG-{lj.Idloja}-001",
                defaults=dict(
                    Parcelado="N", TipoRecebimento="Boleto", Data=today(),
                    Data_vencimento=today()+timedelta(days=10),
                    Valor=Decimal("350.00"), Idnatureza=n2, ContaContabil="2.2.1"
                )
            )
            PagarItem.objects.get_or_create(
                Idpagar=pg, parcela="1",
                defaults=dict(Databaixa=None, valor_parcela=Decimal("350.00"),
                              juros=Decimal("0.00"), desconto=Decimal("0.00"),
                              Titulo_descontado="N", Data_desconto=today()+timedelta(days=10),
                              idconta=contas[0].Idconta)
            )
        self.stdout.write(self.style.SUCCESS("Receber/Pagar ok"))

        # ---------------- INVENTÁRIO ------------
        for lj in lojas:
            inv, _ = Inventario.objects.get_or_create(
                Idloja=lj, Data_inventario=today()-timedelta(days=2),
                defaults=dict(Descricao=f"Inventário {lj.Apelido_loja}", status="OK")
            )
            # alguns itens
            detalhes = list(ProdutoDetalhe.objects.all()[:5])
            for det in detalhes:
                InventarioItem.objects.get_or_create(
                    Idinventario=inv, Idproduto=det.Idproduto, Idprodutodetalhe=det,
                    defaults=dict(Valor_contado=10, Valor_ajustado=10)
                )
        self.stdout.write(self.style.SUCCESS("Inventários ok"))

        # ---------------- VENDAS ----------------
        clientes = list(Cliente.objects.all()[:max(1, q_cli)])
        detalhes_all = list(ProdutoDetalhe.objects.all()[:20])

        for lj in lojas:
            if not clientes or not funcs:
                continue
            cli = random.choice(clientes)
            func = random.choice(funcs)
            doc = f"V-{lj.Idloja}-{random.randint(1000,9999)}"
            total = Decimal("0.00")

            vnd, _ = Venda.objects.get_or_create(
                Idloja=lj, Idcliente=cli, Documento=doc,
                defaults=dict(
                    Data=timezone.now(), Desconto=Decimal("0.00"), Cancelada=None,
                    Valor=Decimal("0.00"),
                    Tipo_documento="CF", Idfuncionario=func, comissao=Decimal("0.00000"),
                    acrescimo=Decimal("0.00000"), tipopag="Cartao",
                    ticms=Decimal("0.00"), tpis=Decimal("0.00"),
                    tcofins=Decimal("0.00"), tcsll=Decimal("0.00")
                )
            )

            itens_escolhidos = random.sample(detalhes_all, k=min(3, len(detalhes_all)))
            for det in itens_escolhidos:
                preco_item = TabelaPrecoItem.objects.filter(codigodebarra=det.CodigodeBarra, idtabela=tabela).first()
                valor_unit = preco_item.preco if preco_item else rnd_decimal(79, 299)
                qtd = random.randint(1, 3)
                tot = (valor_unit * qtd).quantize(Decimal("0.01"))
                VendaItem.objects.get_or_create(
                    Documento=doc, CodigodeBarra=det.CodigodeBarra, codigoproduto=det.Codigoproduto,
                    defaults=dict(Qtd=qtd, valorunitario=valor_unit, Desconto=Decimal("0.00"),
                                  Total_item=tot, iicms=Decimal("0.00"), ipis=Decimal("0.00"),
                                  icofins=Decimal("0.00"), icsll=Decimal("0.00"))
                )
                total += tot

                # baixa simbólica de estoque (não negativa)
                for est in Estoque.objects.filter(CodigodeBarra=det.CodigodeBarra, Idloja=lj):
                    est.Estoque = max(0, (est.Estoque or 0) - qtd)
                    est.save()

                # movimentação de produtos (V)
                MovimentacaoProdutos.objects.get_or_create(
                    Idloja=lj, Data_mov=today(), Documento=doc, Tipo="V", Qtd=qtd, Valor=valor_unit,
                    CodigodeBarra=det.CodigodeBarra, codigoproduto=det.Codigoproduto
                )

            vnd.Valor = total
            vnd.save()

            # ReceberCartao atrelado à venda
            ReceberCartao.objects.get_or_create(
                idvenda=vnd,
                defaults=dict(
                    tipo_cartao="Crédito",
                    valor_transacao=total,
                    codigo_autorizacao=str(random.randint(100000, 999999)),
                    bandeira="VISA",
                    parcelas=1,
                    numero_titulo=f"TIT-{doc}",
                    status_transacao="Aprovada",
                )
            )
        self.stdout.write(self.style.SUCCESS("Vendas/Itens/ReceberCartao ok"))

        # ---------------- MOV. PRODUTOS EXTRA ---
        # Entrada (E) simbólica
        for lj in lojas:
            det = ProdutoDetalhe.objects.first()
            if det:
                MovimentacaoProdutos.objects.get_or_create(
                    Idloja=lj, Data_mov=today()-timedelta(days=1), Documento=f"ENT-{lj.Idloja}-001", Tipo="E",
                    Qtd=5, Valor=rnd_decimal(30, 60), CodigodeBarra=det.CodigodeBarra, codigoproduto=det.Codigoproduto
                )

        self.stdout.write(self.style.MIGRATE_HEADING("==> SEED COMPLETO — finalizado com sucesso!"))
