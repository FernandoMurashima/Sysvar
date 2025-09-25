from datetime import date
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from django.contrib.auth import get_user_model

from .models import (
    Loja, Cliente, Produto, ProdutoDetalhe, Estoque,
    Fornecedor, Vendedor, Funcionarios, Grade, Tamanho, Cor,
    Colecao, Familia, Grupo, Subgrupo, Unidade, Codigos, Tabelapreco, Ncm,
    TabelaPrecoItem,
    NFeEntrada, NFeItem, FornecedorSkuMap, Compra, CompraItem
)

# =============================
# USER (para /api/users/)
# =============================
User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    Idloja = serializers.PrimaryKeyRelatedField(
        queryset=Loja.objects.all(), allow_null=True, required=False
    )
    loja_nome = serializers.CharField(source='Idloja.nome_loja', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'type', 'is_active', 'is_staff', 'is_superuser', 'date_joined',
            'Idloja', 'loja_nome',
        ]
        read_only_fields = ['id', 'date_joined', 'is_superuser', 'loja_nome']


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

    def validate(self, attrs):
        codigo = (attrs.get('Codigo') or '').strip()
        estacao = (attrs.get('Estacao') or '').strip()

        if not codigo or len(codigo) != 2 or not codigo.isdigit():
            raise serializers.ValidationError("Código deve ter exatamente 2 dígitos numéricos (ex.: '25').")

        if estacao not in {'01', '02', '03', '04'}:
            raise serializers.ValidationError("Estação inválida. Use: 01=Verão, 02=Outono, 03=Inverno, 04=Primavera.")

        exists = Colecao.objects.filter(Codigo=codigo, Estacao=estacao).exists()
        instance = getattr(self, 'instance', None)
        if exists and (not instance or instance.Codigo != codigo or instance.Estacao != estacao):
            raise serializers.ValidationError("Já existe uma Coleção com este Código e Estação.")
        return attrs

    def create(self, validated_data):
        with transaction.atomic():
            colecao = super().create(validated_data)
            codigo = (colecao.Codigo or '').strip()
            estacao = (colecao.Estacao or '').strip()
            cod, _ = Codigos.objects.get_or_create(
                colecao=codigo,
                estacao=estacao,
                defaults={'valor_var': 1}
            )
            try:
                colecao.Contador = int(cod.valor_var)
            except (TypeError, ValueError):
                colecao.Contador = 1
            colecao.save(update_fields=['Contador'])
        return colecao

    def to_representation(self, instance):
        data = super().to_representation(instance)
        codigo = (instance.Codigo or '').strip()
        estacao = (instance.Estacao or '').strip()
        cod = Codigos.objects.filter(colecao=codigo, estacao=estacao).first()
        if cod:
            data['Contador'] = int(cod.valor_var)
        return data


class FamiliaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Familia
        fields = '__all__'
        read_only_fields = ['Idfamilia', 'data_cadastro']


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
# NCM
# -----------------------------
class NcmSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ncm
        fields = ['ncm', 'campo1', 'descricao', 'aliquota']
        read_only_fields = []


# -----------------------------
# Produto / Detalhe / Estoque
# -----------------------------
class ProdutoSerializer(serializers.ModelSerializer):
    referencia = serializers.CharField(read_only=True, allow_null=True)
    estacao = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Produto
        fields = '__all__'
        read_only_fields = ['Idproduto', 'data_cadastro', 'referencia', 'inativado_em', 'inativado_por']
        extra_kwargs = {
            'Desc_reduzida': {'required': False, 'allow_blank': True, 'allow_null': True},
        }

    def create(self, validated_data):
        tipoproduto = validated_data.get('Tipoproduto')
        estacao_req = (validated_data.pop('estacao', '') or '').strip()
        colecao_codigo = (validated_data.get('colecao') or '').strip()
        grupo_codigo = (validated_data.get('grupo') or '').strip()

        if tipoproduto != '1':
            validated_data['colecao'] = None
            validated_data['grupo'] = None
            validated_data['subgrupo'] = None
            validated_data['referencia'] = None
            return super().create(validated_data)

        if not colecao_codigo or not grupo_codigo:
            raise serializers.ValidationError("Para Tipoproduto='1', informe 'colecao' e 'grupo'.")

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

        with transaction.atomic():
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

            referencia = f"{colecao_codigo}.{estacao_codigo}.{grupo_codigo}{proximo:03d}"
            validated_data['referencia'] = referencia

            produto = super().create(validated_data)
        return produto

    def update(self, instance, validated_data):
        """
        Auditoria simples de (des)ativação:
        - Quando Ativo muda de True -> False: seta inativado_em e inativado_por.
        - Quando False -> True: limpa inativado_em/inativado_por (mantém motivo, se quiser).
        """
        novo_ativo = validated_data.get('Ativo', instance.Ativo)
        if instance.Ativo and novo_ativo is False:
            validated_data['inativado_em'] = timezone.now()
            user = self.context.get('request').user if self.context.get('request') else None
            if user and user.is_authenticated:
                validated_data['inativado_por'] = user
        elif (not instance.Ativo) and novo_ativo is True:
            validated_data['inativado_em'] = None
            validated_data['inativado_por'] = None
            # opcional: também pode limpar o motivo
            # validated_data['motivo_inativacao'] = ''
        return super().update(instance, validated_data)


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


class GrupoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Grupo
        fields = ['Idgrupo', 'Codigo', 'Descricao', 'Margem', 'data_cadastro']


class SubgrupoSerializer(serializers.ModelSerializer):
    Idgrupo = serializers.PrimaryKeyRelatedField(queryset=Grupo.objects.all(), allow_null=False)

    class Meta:
        model = Subgrupo
        fields = ['Idsubgrupo', 'Idgrupo', 'Descricao', 'Margem', 'data_cadastro']


class TabelaprecoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tabelapreco
        fields = ['Idtabela', 'NomeTabela', 'DataInicio', 'Promocao', 'DataFim', 'data_cadastro']

    def validate(self, attrs):
        di = attrs.get('DataInicio') or getattr(self.instance, 'DataInicio', None)
        df = attrs.get('DataFim') or getattr(self.instance, 'DataFim', None)
        if di and df and df < di:
            raise serializers.ValidationError({'DataFim': 'DataFim não pode ser anterior a DataInicio.'})
        promo = attrs.get('Promocao') or getattr(self.instance, 'Promocao', '')
        if promo and promo.upper() not in {'SIM', 'NAO', 'NÃO'}:
            raise serializers.ValidationError({'Promocao': "Use 'SIM' ou 'NAO'."})
        return attrs


# -----------------------------
# FornecedorSkuMap (mapeamento fornecedor -> SKU/Produto)
# -----------------------------
class FornecedorSkuMapSerializer(serializers.ModelSerializer):
    fornecedor_nome = serializers.CharField(source='Idfornecedor.Nome_fornecedor', read_only=True)
    sku_ean = serializers.CharField(source='Idprodutodetalhe.CodigodeBarra', read_only=True)
    produto_ref = serializers.CharField(source='Idproduto.referencia', read_only=True)
    produto_desc = serializers.CharField(source='Idproduto.Descricao', read_only=True)

    class Meta:
        model = FornecedorSkuMap
        fields = '__all__'
        read_only_fields = ['Idforn_sku_map', 'data_cadastro']


# -----------------------------
# NF-e de Entrada (espelho fiscal)
# -----------------------------
class NFeItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = NFeItem
        fields = '__all__'
        read_only_fields = ['Idnfeitem', 'data_cadastro']


class NFeEntradaSerializer(serializers.ModelSerializer):
    loja_nome = serializers.CharField(source='Idloja.nome_loja', read_only=True)
    fornecedor_nome = serializers.CharField(source='Idfornecedor.Nome_fornecedor', read_only=True)
    itens = NFeItemSerializer(many=True, read_only=True)

    class Meta:
        model = NFeEntrada
        fields = '__all__'
        read_only_fields = ['Idnfe', 'data_cadastro', 'status']


class TabelaPrecoItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = TabelaPrecoItem
        fields = '__all__'
