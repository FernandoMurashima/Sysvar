from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta

from sysvar_app.models import (
    Loja, User, Funcionarios,
    Grupo, Subgrupo, Cor, Grade, Tamanho,
    Fornecedor, Unidade, Ncm, Tabelapreco
)

UserModel = get_user_model()

def upsert(model, defaults=None, **lookup):
    """
    get_or_create + update quando necessário (idempotente).
    """
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
    help = "Popular 01 básico com lojas, usuários (somente gerente/caixa), funcionários (inclui vendedores), grupos, subgrupos, cores, grades, fornecedores, unidades, NCM e tabela de preço padrão."

    @transaction.atomic
    def handle(self, *args, **opts):
        now = timezone.now()

        # ---------------------------------------------------------
        # (1) LOJAS (com Estado=RJ)
        # ---------------------------------------------------------
        loja_centro = upsert(
            Loja,
            nome_loja="Centro",
            defaults=dict(
                Apelido_loja="Centro",
                cnpj="00.000.000/0000-00",
                Logradouro="Av.",
                Endereco="Rua do Comércio",
                numero="100",
                Cep="20000-000",
                Bairro="Centro",
                Cidade="Rio de Janeiro",
                Estado="RJ",
                data_cadastro=now,
            ),
        )
        loja_tijuca = upsert(
            Loja,
            nome_loja="Tijuca",
            defaults=dict(
                Apelido_loja="Tijuca",
                cnpj="00.000.000/0000-00",
                Logradouro="Av.",
                Endereco="Rua das Laranjeiras",
                numero="200",
                Cep="20500-000",
                Bairro="Tijuca",
                Cidade="Rio de Janeiro",
                Estado="RJ",
                data_cadastro=now,
            ),
        )

        # ---------------------------------------------------------
        # (2) USUÁRIOS (SOMENTE gerente e caixa por loja)
        # ---------------------------------------------------------
        def ensure_user(username, email, tipo, loja, password):
            user = upsert(
                UserModel,
                username=username,
                defaults=dict(
                    email=email,
                    type=tipo,
                    is_staff=(tipo in ["Gerente", "Admin"]),
                    is_superuser=(tipo == "Admin"),
                    Idloja=loja,
                ),
            )
            user.set_password(password)
            user.save()
            return user

        for loja_obj, code in [(loja_centro, "centro"), (loja_tijuca, "tijuca")]:
            # 1 gerente
            ensure_user(
                username=f"gerente_{code}",
                email=f"gerente_{code}@demo.local",
                tipo="Gerente",
                loja=loja_obj,
                password="gerente123",
            )
            # 1 caixa
            ensure_user(
                username=f"caixa_{code}",
                email=f"caixa_{code}@demo.local",
                tipo="Caixa",
                loja=loja_obj,
                password="caixa123",
            )

        # ---------------------------------------------------------
        # (2b) FUNCIONÁRIOS (agora aqui: 1 gerente, 1 caixa e 3 vendedores por loja)
        # ---------------------------------------------------------
        def ensure_func(nome, apelido, loja, categoria):
            return upsert(
                Funcionarios,
                nomefuncionario=nome,
                defaults=dict(
                    apelido=apelido,
                    cpf="000.000.000-00",
                    inicio=None,
                    fim=None,
                    categoria=categoria,  # sugestão: "G" gerente, "C" caixa, "V" vendedor
                    meta=Decimal("0"),
                    idloja=loja,
                    data_cadastro=now,
                ),
            )

        for loja_obj, code in [(loja_centro, "centro"), (loja_tijuca, "tijuca")]:
            ensure_func(f"Gerente {code.capitalize()}", f"G{code[:2]}", loja_obj, "G")
            ensure_func(f"Caixa {code.capitalize()}", f"C{code[:2]}", loja_obj, "C")
            for i in range(1, 4):
                ensure_func(f"Vendedor {i} {code.capitalize()}", f"V{i}{code[:2]}", loja_obj, "V")

        # ---------------------------------------------------------
        # (3) GRUPOS
        # ---------------------------------------------------------
        grupos_spec = [
            ("01", "Calça"),
            ("02", "Saia"),
            ("03", "Blusas"),
            ("04", "Vestidos"),
        ]
        grupos = {}
        for codigo, descricao in grupos_spec:
            grupos[descricao] = upsert(
                Grupo,
                Codigo=codigo,
                defaults=dict(
                    Descricao=descricao,
                    Margem=Decimal("0"),
                    data_cadastro=now,
                ),
            )

        # ---------------------------------------------------------
        # (4) SUBGRUPOS por grupo
        # ---------------------------------------------------------
        subgrupos_spec = {
            "Calça":    ["Lisa", "Estampada", "Jeans"],
            "Saia":     ["Lisa", "Estampada", "Jeans"],
            "Blusas":   ["Lisa", "Estampada", "Decote V", "Top"],
            "Vestidos": ["Renda", "Malha", "Tricot"],
        }
        for grp_desc, nomes in subgrupos_spec.items():
            g = grupos[grp_desc]
            for nome in nomes:
                upsert(
                    Subgrupo,
                    Idgrupo=g,
                    Descricao=nome,
                    defaults=dict(
                        Margem=Decimal("0"),
                        data_cadastro=now,
                    ),
                )

        # ---------------------------------------------------------
        # (5) CORES
        # ---------------------------------------------------------
        cores_spec = [
            ("01", "Azul"),
            ("02", "Branco"),
            ("03", "Preto"),
            ("04", "Vermelho"),
        ]
        for cod, nome in cores_spec:
            upsert(
                Cor,
                Descricao=f"Cor {nome}",
                defaults=dict(
                    Codigo=cod,
                    Cor=nome,
                    Status="ATV",
                    data_cadastro=now,
                ),
            )

        # ---------------------------------------------------------
        # (6) GRADES
        # ---------------------------------------------------------
        grade1 = upsert(
            Grade,
            Descricao="Grade Padrão 1",
            defaults=dict(Status="ATV", data_cadastro=now),
        )
        tamanhos_g1 = ["PP", "P", "M", "G", "GG"]
        for t in tamanhos_g1:
            upsert(
                Tamanho,
                idgrade=grade1,
                Tamanho=t,
                defaults=dict(
                    Descricao=t,
                    Status="ATV",
                    data_cadastro=now,
                ),
            )

        grade2 = upsert(
            Grade,
            Descricao="Grade Padrão 2",
            defaults=dict(Status="ATV", data_cadastro=now),
        )
        tamanhos_g2 = ["38", "40", "42", "44", "46", "48"]
        for t in tamanhos_g2:
            upsert(
                Tamanho,
                idgrade=grade2,
                Tamanho=t,
                defaults=dict(
                    Descricao=t,
                    Status="ATV",
                    data_cadastro=now,
                ),
            )

        # ---------------------------------------------------------
        # (7) FORNECEDORES (3) — CNPJ fixo
        # ---------------------------------------------------------
        fornecedores_nomes = ["Fornecedor 01", "Fornecedor 02", "Fornecedor 03"]
        for nome in fornecedores_nomes:
            upsert(
                Fornecedor,
                Nome_fornecedor=nome,
                defaults=dict(
                    Apelido=nome.split()[-1],
                    Cnpj="00.000.000/0000-00",
                    Logradouro="Av.",
                    Endereco="Endereço padrão",
                    Cidade="Rio de Janeiro",
                    Estado="RJ" if hasattr(Fornecedor, "Estado") else None,
                    Telefone1="(00) 0000-0000",
                    email=f"{nome.replace(' ', '').lower()}@demo.local",
                    Categoria="Geral",
                    data_cadastro=now,
                ),
            )

        # ---------------------------------------------------------
        # (8) UNIDADES (lista fornecida)
        # ---------------------------------------------------------
        unidades = [
            {"Descricao": "Medida de Volume - Litro", "Codigo": "L"},
            {"Descricao": "Medida de Comprimento - Metro", "Codigo": "M"},
            {"Descricao": "Medida de Quantidade - Caixa", "Codigo": "CX"},
            {"Descricao": "Medida de Quantidade - Peça", "Codigo": "P"},
            {"Descricao": "Medida de Quantidade - Resma", "Codigo": "R"},
            {"Descricao": "Medida de Peso - Quilograma", "Codigo": "KG"},
            {"Descricao": "Medida de Volume - Mililitro", "Codigo": "ML"},
            {"Descricao": "Medida de Comprimento - Centímetro", "Codigo": "CM"},
            {"Descricao": "Medida de Volume - Metro Cúbico", "Codigo": "M3"},
            {"Descricao": "Medida de Área - Metro Quadrado", "Codigo": "M2"},
            {"Descricao": "Medida de Tempo - Hora", "Codigo": "H"},
        ]
        for u in unidades:
            upsert(
                Unidade,
                Codigo=u["Codigo"],
                defaults=dict(
                    Descricao=u["Descricao"],
                    data_cadastro=now,
                ),
            )

        # ---------------------------------------------------------
        # (9) NCM (4 itens de vestuário)
        # ---------------------------------------------------------
        ncm_list = [
            {"ncm": "6109.10.00", "descricao": "Camisetas de malha de algodão", "aliquota": "0"},
            {"ncm": "6203.42.00", "descricao": "Calças de algodão (masculino)", "aliquota": "0"},
            {"ncm": "6204.62.00", "descricao": "Vestidos de algodão (feminino)", "aliquota": "0"},
            {"ncm": "6110.20.00", "descricao": "Suéteres e cardigãs de algodão", "aliquota": "0"},
        ]
        for item in ncm_list:
            upsert(
                Ncm,
                ncm=item["ncm"],
                defaults=dict(
                    campo1="",
                    descricao=item["descricao"],
                    aliquota=item["aliquota"],
                ),
            )

        # ---------------------------------------------------------
        # (10) Tabela de Preço Padrão
        # ---------------------------------------------------------
        di = now.date()
        df = di + timedelta(days=365)
        upsert(
            Tabelapreco,
            NomeTabela="Padrão",
            defaults=dict(
                DataInicio=di,
                DataFim=df,
                Promocao="NAO",
                data_cadastro=now,
            ),
        )

        self.stdout.write(self.style.SUCCESS("✅ popular01 concluído com sucesso (idempotente)."))
