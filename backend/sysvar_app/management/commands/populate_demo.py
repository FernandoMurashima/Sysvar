from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date

from sysvar_app.models import (
    Loja, Fornecedor, Vendedor, Funcionarios,
    Grade, Tamanho, Cor, Colecao, Familia,
    Grupo, Subgrupo, Unidade, Codigos
)

class Command(BaseCommand):
    help = "Popula dados de exemplo (Fornecedor, Vendedor, Funcionarios, Grade, Tamanho, Cor, Colecao, Familia, Grupo, Subgrupo, Unidade, Codigos)."

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("==> Iniciando populate de dados demo..."))

        # ---------------------------
        # Loja base (FK para Vendedor/Funcionarios)
        # ---------------------------
        loja, _ = Loja.objects.get_or_create(
            nome_loja="Loja Centro",
            defaults={
                "Apelido_loja": "CENTRO",
                "cnpj": "12.345.678/0001-90",
                "Endereco": "Rua Principal",
                "numero": "100",
                "Cidade": "São Paulo",
                "Telefone1": "(11) 90000-1111",
                "email": "contato@lojacentro.com.br",
                "data_cadastro": timezone.now(),
            }
        )
        self.stdout.write(self.style.SUCCESS(f"Loja OK: {loja.nome_loja}"))

        # ---------------------------
        # Fornecedores
        # ---------------------------
        fornecedores_seed = [
            {
                "Nome_fornecedor": "Têxtil Alpha",
                "Apelido": "ALPHA",
                "Cnpj": "11.111.111/0001-11",
                "email": "vendas@textilalpha.com",
                "Telefone1": "(11) 2222-3333",
                "Cidade": "São Paulo",
            },
            {
                "Nome_fornecedor": "Malharia Beta",
                "Apelido": "BETA",
                "Cnpj": "22.222.222/0001-22",
                "email": "contato@malhariabeta.com",
                "Telefone1": "(11) 4444-5555",
                "Cidade": "Guarulhos",
            },
        ]
        for data in fornecedores_seed:
            forn, created = Fornecedor.objects.get_or_create(
                Nome_fornecedor=data["Nome_fornecedor"],
                defaults={
                    "Apelido": data.get("Apelido", ""),
                    "Cnpj": data["Cnpj"],
                    "Logradouro": "Rua",
                    "Endereco": "Endereço do fornecedor",
                    "numero": "10",
                    "Cidade": data.get("Cidade", "São Paulo"),
                    "Telefone1": data.get("Telefone1", ""),
                    "email": data.get("email", ""),
                    "Categoria": "Padrão",
                    "data_cadastro": timezone.now(),
                }
            )
            self.stdout.write(self.style.SUCCESS(f"Fornecedor OK: {forn.Nome_fornecedor} (novo={created})"))

        # ---------------------------
        # Funcionários
        # ---------------------------
        funcionarios_seed = [
            {"nomefuncionario": "Carlos Silva", "apelido": "Carlos", "cpf": "123.456.789-00", "categoria": "vendedor"},
            {"nomefuncionario": "Ana Souza", "apelido": "Ana", "cpf": "987.654.321-00", "categoria": "vendedor"},
            {"nomefuncionario": "Marina Costa", "apelido": "Marina", "cpf": "555.666.777-88", "categoria": "estoque"},
        ]
        for data in funcionarios_seed:
            f, created = Funcionarios.objects.get_or_create(
                nomefuncionario=data["nomefuncionario"],
                idloja=loja,
                defaults={
                    "apelido": data.get("apelido", ""),
                    "cpf": data.get("cpf", ""),
                    "inicio": date.today(),
                    "categoria": data.get("categoria", "vendedor"),
                    "meta": 0,
                    "data_cadastro": timezone.now(),
                }
            )
            self.stdout.write(self.style.SUCCESS(f"Funcionário OK: {f.nomefuncionario} (novo={created})"))

        # ---------------------------
        # Vendedores (mantido; se não quiser, remova este bloco)
        # ---------------------------
        vendedores_seed = [
            {"nomevendedor": "Carlos Silva", "apelido": "Carlos", "cpf": "123.456.789-00"},
            {"nomevendedor": "Ana Souza", "apelido": "Ana", "cpf": "987.654.321-00"},
        ]
        for data in vendedores_seed:
            v, created = Vendedor.objects.get_or_create(
                nomevendedor=data["nomevendedor"],
                idloja=loja,
                defaults={
                    "apelido": data.get("apelido", ""),
                    "cpf": data.get("cpf", ""),
                    "categoria": "A",
                    "data_cadastro": timezone.now(),
                }
            )
            self.stdout.write(self.style.SUCCESS(f"Vendedor OK: {v.nomevendedor} (novo={created})"))

        # ---------------------------
        # Grade / Tamanho
        # ---------------------------
        grade, _created = Grade.objects.get_or_create(
            Descricao="Padrão Camisetas",
            defaults={
                "Status": "Ativo",
                "data_cadastro": timezone.now(),
            }
        )
        self.stdout.write(self.style.SUCCESS(f"Grade OK: {grade.Descricao}"))

        tamanhos = [("P", "Pequeno"), ("M", "Médio"), ("G", "Grande"), ("GG", "Extra Grande")]
        for tam, desc in tamanhos:
            t, created = Tamanho.objects.get_or_create(
                idgrade=grade,
                Tamanho=tam,
                defaults={"Descricao": desc, "Status": "Ativo", "data_cadastro": timezone.now()}
            )
            self.stdout.write(self.style.SUCCESS(f"Tamanho OK: {t.Tamanho} (novo={created})"))

        # ---------------------------
        # Cores
        # ---------------------------
        cores = [
            {"Descricao": "Preto", "Codigo": "000000", "Cor": "Preto"},
            {"Descricao": "Branco", "Codigo": "FFFFFF", "Cor": "Branco"},
            {"Descricao": "Azul Marinho", "Codigo": "001F3F", "Cor": "Azul"},
        ]
        for c in cores:
            cor, created = Cor.objects.get_or_create(
                Descricao=c["Descricao"],
                defaults={
                    "Codigo": c.get("Codigo", ""),
                    "Cor": c.get("Cor", c["Descricao"]),
                    "Status": "Ativo",
                    "data_cadastro": timezone.now(),
                }
            )
            self.stdout.write(self.style.SUCCESS(f"Cor OK: {cor.Descricao} (novo={created})"))

        # ---------------------------
        # Coleções
        # ---------------------------
        colecoes = [
            {"Descricao": "Verão 25", "Codigo": "25", "Estacao": "01", "Status": "Ativo"},
            {"Descricao": "Inverno 25", "Codigo": "25", "Estacao": "03", "Status": "Ativo"},
        ]
        for c in colecoes:
            col, created = Colecao.objects.get_or_create(
                Descricao=c["Descricao"],
                defaults={
                    "Codigo": c.get("Codigo", None),
                    "Estacao": c.get("Estacao", None),
                    "Status": c.get("Status", "Ativo"),
                    "Contador": 0,
                    "data_cadastro": timezone.now(),
                }
            )
            self.stdout.write(self.style.SUCCESS(f"Coleção OK: {col.Descricao} (novo={created})"))

        # ---------------------------
        # Famílias
        # ---------------------------
        familias = [
            {"Descricao": "Tipo A", "Codigo": "A", "Margem": 0},
            {"Descricao": "Tipo B", "Codigo": "B", "Margem": 0},
            {"Descricao": "Tipo C", "Codigo": "C", "Margem": 0},
            {"Descricao": "Tipo D", "Codigo": "D", "Margem": 0},
            {"Descricao": "Tipo E", "Codigo": "E", "Margem": 0},
            {"Descricao": "Tipo F", "Codigo": "F", "Margem": 0},
        ]
        for f in familias:
            fam, created = Familia.objects.get_or_create(
                Descricao=f["Descricao"],
                defaults={
                    "Codigo": f.get("Codigo", ""),
                    "Margem": f.get("Margem", 0),
                    "data_cadastro": timezone.now()
                }
            )
            self.stdout.write(self.style.SUCCESS(f"Família OK: {fam.Descricao} (novo={created})"))

        # ---------------------------
        # Grupos / Subgrupos (NOVA ESTRUTURA COM VÍNCULO)
        # - Calça: Plana, Estampada, Jeans, Malha
        # - Saia:  Plana, Estampada, Jeans, Malha
        # - Blusa: Decote V, Lisa, Tricot
        # - Vestido: Renda, Liso, Malha
        # ---------------------------
        grupo_codigos = {
            "Calça": "10",
            "Saia": "20",
            "Blusa": "30",
            "Vestido": "40",
        }
        grupos_subgrupos = {
            "Calça":  ["Plana", "Estampada", "Jeans", "Malha"],
            "Saia":   ["Plana", "Estampada", "Jeans", "Malha"],
            "Blusa":  ["Decote V", "Lisa", "Tricot"],
            "Vestido":["Renda", "Liso", "Malha"],
        }
        MARGEM_PADRAO = 10.00

        for nome_grupo, lista_subs in grupos_subgrupos.items():
            grupo, gcreated = Grupo.objects.get_or_create(
                Codigo=grupo_codigos[nome_grupo],
                defaults={
                    'Descricao': nome_grupo,
                    'Margem': MARGEM_PADRAO,
                    'data_cadastro': timezone.now()
                }
            )
            # caso já exista o grupo mas com descrição diferente, garante coerência
            if not gcreated and grupo.Descricao != nome_grupo:
                grupo.Descricao = nome_grupo
                grupo.save(update_fields=["Descricao"])

            self.stdout.write(self.style.SUCCESS(f"Grupo OK: {grupo.Descricao} (novo={gcreated})"))

            for nome_sub in lista_subs:
                sub, screated = Subgrupo.objects.get_or_create(
                    Descricao=nome_sub,
                    Idgrupo=grupo,   # vincula corretamente ao grupo
                    defaults={
                        'Margem': MARGEM_PADRAO,
                        'data_cadastro': timezone.now()
                    }
                )
                # Se já havia subgrupo com mesmo nome mas sem Idgrupo (nulo), atualiza o vínculo
                if not screated and (sub.Idgrupo_id is None):
                    sub.Idgrupo = grupo
                    sub.save(update_fields=["Idgrupo"])

                self.stdout.write(self.style.SUCCESS(f"  Subgrupo OK: {sub.Descricao} (grupo={grupo.Descricao}) (novo={screated})"))

        # ---------------------------
        # Unidades
        # ---------------------------
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
            unidade, created = Unidade.objects.get_or_create(
                Descricao=u["Descricao"],
                defaults={"Codigo": u["Codigo"], "data_cadastro": timezone.now()}
            )
            self.stdout.write(self.style.SUCCESS(f"Unidade OK: {unidade.Descricao} (novo={created})"))

        # ---------------------------
        # Códigos (coleção+estação -> contador único)
        # ---------------------------
        codigos_seed = [
            {"colecao": "25", "estacao": "01", "valor_var": 1},
            {"colecao": "25", "estacao": "03", "valor_var": 1},
            
        ]
        for c in codigos_seed:
            cod, created = Codigos.objects.get_or_create(
                colecao=c["colecao"],
                estacao=c["estacao"],
                defaults={"valor_var": c["valor_var"]}
            )
            self.stdout.write(self.style.SUCCESS(
                f"Códigos OK: {cod.colecao}-{cod.estacao} (novo={created}) valor_var={cod.valor_var}"
            ))

        self.stdout.write(self.style.SUCCESS("==> Populate concluído com sucesso!"))
