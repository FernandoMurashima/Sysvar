from rest_framework import serializers
from .models import Loja, Cliente, Produto, ProdutoDetalhe, Estoque

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

class ProdutoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Produto
        fields = '__all__'
        read_only_fields = ['Idproduto', 'data_cadastro']

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
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend

from .models import Loja, Cliente, Produto, ProdutoDetalhe, Estoque
from .serializers import (
    LojaSerializer, ClienteSerializer, ProdutoSerializer,
    ProdutoDetalheSerializer, EstoqueSerializer
)


# 🔹 Health Check (sem autenticação)
@api_view(['GET'])
@permission_classes([AllowAny])
def health(request):
    return JsonResponse({'status': 'ok', 'app': 'sysvar'})


# 🔹 ViewSets principais
class LojaViewSet(viewsets.ModelViewSet):
    queryset = Loja.objects.all().order_by('-data_cadastro')
    serializer_class = LojaSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nome_loja', 'Apelido_loja', 'cnpj']
    ordering_fields = ['data_cadastro', 'nome_loja']


class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.all().order_by('-data_cadastro')
    serializer_class = ClienteSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['Nome_cliente', 'Apelido', 'cpf', 'email']
    ordering_fields = ['data_cadastro', 'Nome_cliente']


class ProdutoViewSet(viewsets.ModelViewSet):
    queryset = Produto.objects.all().order_by('-data_cadastro')
    serializer_class = ProdutoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['Descricao', 'referencia', 'grupo', 'subgrupo', 'colecao']
    ordering_fields = ['data_cadastro', 'Descricao', 'referencia']


class ProdutoDetalheViewSet(viewsets.ModelViewSet):
    queryset = ProdutoDetalhe.objects.select_related('Idproduto', 'Idtamanho', 'Idcor').all().order_by('-data_cadastro')
    serializer_class = ProdutoDetalheSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['CodigodeBarra', 'Codigoproduto', 'Idproduto']
    search_fields = ['CodigodeBarra', 'Codigoproduto']
    ordering_fields = ['data_cadastro', 'CodigodeBarra']


class EstoqueViewSet(viewsets.ModelViewSet):
    queryset = Estoque.objects.select_related('Idloja').all().order_by('CodigodeBarra')
    serializer_class = EstoqueSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['Idloja', 'CodigodeBarra', 'codigoproduto']
    search_fields = ['CodigodeBarra', 'codigoproduto']
    ordering_fields = ['CodigodeBarra', 'Idloja']
