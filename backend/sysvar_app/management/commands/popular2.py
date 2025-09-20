from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from decimal import Decimal

from sysvar_app.models import (
    Loja, Grupo, Cor, Grade, Tamanho, Colecao,
    Produto, ProdutoDetalhe, Tabelapreco, TabelaPrecoItem, Estoque
)

def upsert(model, defaults=None, **lookup):
    obj, created = model.objects.get_or_create(**lookup, defaults=defaults or {})
    if not created and defaults:
        dirty = False
        for k, v in (defaults or {}).items():
            if getattr(obj, k, None) != v:
                setattr(obj, k, v)
                dirty = True
        if dirty:
            obj.save()
    return obj

class Command(BaseCommand):
    help = "popular2: cria coleções 25/26 (estações 1-4) e 1 produto por grupo por coleção, com SKUs (grade+cores), EANs, preço 320 e estoque em ambas as lojas."

    @transaction.atomic
    def handle(self, *args, **opts):
        now = timezone.now()

        # --------------------------
        # Pré-requisitos já criados no popular01
        # --------------------------
        # Lojas
        loja_centro = Loja.objects.get(nome_loja="Centro")
        loja_tijuca = Loja.objects.get(nome_loja="Tijuca")

        # Grupos (texto será gravado no Produto, pois seu modelo usa CharField)
        grupos = {
            "01": "Calça",
            "02": "Saia",
            "03": "Blusas",
            "04": "Vestidos",
        }

        # Cores
        cores_qs = Cor.objects.filter(Cor__in=["Azul", "Branco", "Preto", "Vermelho"]).order_by("Codigo")
        cores = list(cores_qs)
        if len(cores) < 4:
            raise RuntimeError("Cores básicas não encontradas. Rode primeiro o popular01.")

        # Grade (vamos usar “Grade Padrão 1” com PP,P,M,G,GG)
        grade = Grade.objects.get(Descricao="Grade Padrão 1")
        tamanhos = list(Tamanho.objects.filter(idgrade=grade).order_by("Idtamanho"))
        if not tamanhos:
            raise RuntimeError("Tamanhos da Grade Padrão 1 não encontrados. Rode primeiro o popular01.")

        # Tabela de Preço Padrão
        tabela = Tabelapreco.objects.get(NomeTabela="Padrão")

        # --------------------------
        # 1) Coleções 25 e 26, estações 1..4
        # --------------------------
        for cod in ["25", "26"]:
            for est in ["1", "2", "3", "4"]:
                upsert(
                    Colecao,
                    Codigo=cod,
                    Estacao=est,
                    defaults=dict(
                        Descricao=f"Coleção {cod}",
                        Status="ATV",
                        data_cadastro=now,
                    ),
                )

        # --------------------------
        # 2) Produtos: 1 por grupo em cada coleção (25 e 26)
        #    - cria SKUs para TODAS as combinações de tamanhos (PP..GG) e cores (Azul, Branco, Preto, Vermelho)
        #    - EANs gerados de forma determinística (13 dígitos)
        #    - preço por SKU = 320 (na Tabelapreco Padrão)
        #    - estoque em ambas as lojas (ex.: 10 unidades por loja)
        # --------------------------
        preco = Decimal("320.00")
        qtd_inicial = 10  # por loja, por SKU

        # função utilitária para gerar Codigoproduto (11 chars) e EAN (13 chars) estáveis
        def make_codigoproduto(col, grp_code, idx_sku):
            # formato simples: CC.GG.xxxxx  (2+1+2+1+5 = 11 com zeros)
            return f"{col}.{grp_code}.{idx_sku:05d}"

        def make_ean(col, grp_code, size_idx, color_idx, seq):
            # EAN 13: 789 + col(2) + grp(2) + size(2) + color(2) + seq(2)  => 13 dígitos
            return f"789{int(col):02d}{int(grp_code):02d}{size_idx:02d}{color_idx:02d}{seq:02d}"

        # coleções alvo
        colecoes = ["25", "26"]

        # vamos mapear grupos a uma base de descrição
        base_desc = {
            "01": "Calça",
            "02": "Saia",
            "03": "Blusa",
            "04": "Vestido",
        }

        # referência textual para campo 'grade' do Produto
        grade_str = "PP/P/M/G/GG"

        seq_global = 1  # usado para montar códigos/ea ns de forma única

        for col in colecoes:
            for grp_code, grp_name in grupos.items():
                # Criar o Produto
                referencia = f"{base_desc[grp_code].upper()}-{col}{grp_code}"
                produto = upsert(
                    Produto,
                    Descricao=f"{base_desc[grp_code]} Coleção {col}",
                    defaults=dict(
                        Tipoproduto="R",
                        Desc_reduzida=base_desc[grp_code],
                        referencia=referencia[:20],  # campo tem max_length=20
                        classificacao_fiscal="0000.00.00",  # placeholder
                        unidade="P",  # peça
                        grupo=grp_name,
                        subgrupo="Geral",
                        familia="Linha",
                        grade=grade_str,
                        colecao=col,
                        Material="Têxtil",
                        data_cadastro=now,
                    ),
                )

                # Criar SKUs (ProdutoDetalhe) para cada tamanho X cor
                idx_sku = 1
                for s_idx, tam in enumerate(tamanhos, start=1):
                    for c_idx, cor in enumerate(cores, start=1):
                        codigoprod = make_codigoproduto(col, grp_code, idx_sku)
                        ean = make_ean(col, grp_code, s_idx, c_idx, (seq_global % 100))

                        sku = upsert(
                            ProdutoDetalhe,
                            CodigodeBarra=ean,
                            defaults=dict(
                                Codigoproduto=codigoprod,
                                Idproduto=produto,
                                Idtamanho=tam,
                                Idcor=cor,
                                Item=idx_sku,
                                data_cadastro=now,
                            ),
                        )

                        # Preço na Tabela Padrão
                        upsert(
                            TabelaPrecoItem,
                            codigodebarra=sku.CodigodeBarra,
                            idtabela=tabela,
                            defaults=dict(
                                codigoproduto=sku.Codigoproduto,
                                preco=preco,
                            ),
                        )

                        # Estoque nas duas lojas
                        upsert(
                            Estoque,
                            CodigodeBarra=sku.CodigodeBarra,
                            Idloja=loja_centro,
                            defaults=dict(
                                codigoproduto=sku.Codigoproduto,
                                Estoque=qtd_inicial,
                                reserva=0,
                                valorestoque=None,
                            ),
                        )
                        upsert(
                            Estoque,
                            CodigodeBarra=sku.CodigodeBarra,
                            Idloja=loja_tijuca,
                            defaults=dict(
                                codigoproduto=sku.Codigoproduto,
                                Estoque=qtd_inicial,
                                reserva=0,
                                valorestoque=None,
                            ),
                        )

                        idx_sku += 1
                        seq_global += 1

        self.stdout.write(self.style.SUCCESS("✅ popular2 concluído com sucesso: coleções, produtos, SKUs, preços e estoque criados."))
