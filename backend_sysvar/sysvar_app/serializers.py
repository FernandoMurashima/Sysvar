from datetime import date
from django.db import transaction
from rest_framework import serializers

from .models import (
    Loja, Cliente, Produto, ProdutoDetalhe, Estoque,
    Fornecedor, Vendedor, Funcionarios, Grade, Tamanho, Cor,
    Colecao, Familia, Grupo, Subgrupo, Unidade, Codigos
)

# -----------------------------
# Tabelas básicas
# -----------------------------
class LojaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Loja
        fields = '__all__'
        read_only_fields = ['Idloja', 'data_cadastro']


class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = '__all__'
        read_only_fields = ['Idcliente', 'data_cadastro']


class FornecedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fornecedor
        fields = '__all__'
        read_only_fields = ['Idfornecedor', 'data_cadastro']


class VendedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendedor
        fields = '__all__'
        read_only_fields = ['Idvendedor', 'data_cadastro']


class FuncionariosSerializer(serializers.ModelSerializer):
    class Meta:
        model = Funcionarios
        fields = '__all__'
        read_only_fields = ['Idfuncionario', 'data_cadastro']


class GradeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Grade
        fields = '__all__'
        read_only_fields = ['Idgrade', 'data_cadastro']


class TamanhoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tamanho
        fields = '__all__'
        read_only_fields = ['Idtamanho', 'data_cadastro']


class CorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cor
        fields = '__all__'
        read_only_fields = ['Idcor', 'data_cadastro']


class ColecaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Colecao
        fields = '__all__'
        read_only_fields = ['Idcolecao', 'data_cadastro']


class FamiliaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Familia
        fields = '__all__'
        read_only_fields = ['Idfamilia', 'data_cadastro']


class GrupoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Grupo
        fields = '__all__'
        read_only_fields = ['Idgrupo', 'data_cadastro']


class SubgrupoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subgrupo
        fields = '__all__'
        read_only_fields = ['Idsubgrupo', 'data_cadastro']


class UnidadeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unidade
        fields = '__all__'
        read_only_fields = ['Idunidade', 'data_cadastro']


class CodigosSerializer(serializers.ModelSerializer):
    class Meta:
        model = Codigos
        fields = '__all__'
        read_only_fields = ['Idcodigo']


# -----------------------------
# Produto / Detalhe / Estoque
# -----------------------------


class ProdutoSerializer(serializers.ModelSerializer):
    referencia = serializers.CharField(read_only=True, allow_null=True)
    estacao = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Produto
        fields = '__all__'
        read_only_fields = ['Idproduto', 'data_cadastro', 'referencia']

    def create(self, validated_data):
        tipoproduto = validated_data.get('Tipoproduto')
        # pegar (e remover) 'estacao' que é write_only e não existe no modelo
        estacao_req = (validated_data.pop('estacao', '') or '').strip()
        colecao_codigo = (validated_data.get('colecao') or '').strip()
        grupo_codigo = (validated_data.get('grupo') or '').strip()

        # Se não é produto de venda, limpar campos e não gerar referência
        if tipoproduto != '1':
            validated_data['colecao'] = None
            validated_data['grupo'] = None
            validated_data['subgrupo'] = None
            validated_data['referencia'] = None
            return super().create(validated_data)

        # Produto de venda precisa de colecao e grupo
        if not colecao_codigo or not grupo_codigo:
            raise serializers.ValidationError("Para Tipoproduto='1', informe 'colecao' e 'grupo'.")

        # Resolver a coleção + estação
        qs = Colecao.objects.filter(Codigo=colecao_codigo)
        if not qs.exists():
            raise serializers.ValidationError("Coleção informada não existe.")

        if estacao_req:
            qs = qs.filter(Estacao=estacao_req)

        if not qs.exists():
            raise serializers.ValidationError("A combinação de 'colecao' e 'estacao' não existe.")
        if qs.count() > 1:
            raise serializers.ValidationError("Coleção com mesmo código tem múltiplas estações. Informe o campo 'estacao' (ex.: '01' ou '02').")

        col = qs.first()
        estacao_codigo = (col.Estacao or '').strip()
        if not estacao_codigo:
            raise serializers.ValidationError("Coleção encontrada não possui 'Estacao' definida.")

        # Gerar referência e incrementar contador de Codigos de forma atômica
        with transaction.atomic():
            # bloqueia linha correspondente (se existir)
            cod_row = (Codigos.objects
                       .select_for_update()
                       .filter(colecao=colecao_codigo, estacao=estacao_codigo)
                       .first())
            if cod_row is None:
                cod_row = Codigos.objects.create(
                    colecao=colecao_codigo,
                    estacao=estacao_codigo,
                    valor_var=0
                )

            try:
                atual = int(cod_row.valor_var)
            except (TypeError, ValueError):
                atual = 0

            proximo = atual + 1
            cod_row.valor_var = proximo
            cod_row.save()

            # referência = CC.EE.GG + contador 3 dígitos (ex.: 25.01.10 + 001)
            referencia = f"{colecao_codigo}.{estacao_codigo}.{grupo_codigo}{proximo:03d}"
            validated_data['referencia'] = referencia

            produto = super().create(validated_data)

        return produto



class ProdutoDetalheSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProdutoDetalhe
        fields = '__all__'
        read_only_fields = ['Idprodutodetalhe', 'data_cadastro']


class EstoqueSerializer(serializers.ModelSerializer):
    class Meta:
        model = Estoque
        fields = '__all__'
        read_only_fields = ['Idestoque']
