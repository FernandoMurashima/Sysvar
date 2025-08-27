from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token

from .models import (
    Loja, Cliente, Produto, ProdutoDetalhe, Estoque,
    Fornecedor, Vendedor, Funcionarios, Grade, Tamanho, Cor,
    Colecao, Familia, Unidade, Grupo, Subgrupo, Codigos, Tabelapreco
)
from .serializers import (
    UserSerializer,
    LojaSerializer, ClienteSerializer, ProdutoSerializer, ProdutoDetalheSerializer, EstoqueSerializer,
    FornecedorSerializer, VendedorSerializer, FuncionariosSerializer, GradeSerializer, TamanhoSerializer,
    CorSerializer, ColecaoSerializer, FamiliaSerializer, UnidadeSerializer, GrupoSerializer,
    SubgrupoSerializer, CodigosSerializer, TabelaprecoSerializer
)

# -------------------------
# Health Check (público)
# -------------------------
@api_view(['GET'])
@permission_classes([AllowAny])
def health(request):
    return JsonResponse({'status': 'ok', 'app': 'sysvar'})

# -------------------------
# Register (público)
# POST /api/auth/register/
# -------------------------
@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    User = get_user_model()
    data = request.data

    username   = (data.get('username') or '').strip()
    password   = (data.get('password') or '').strip()
    email      = (data.get('email') or '').strip()
    first_name = (data.get('first_name') or '').strip()
    last_name  = (data.get('last_name') or '').strip()
    user_type  = (data.get('type') or 'Regular').strip()

    if not username or not password:
        return Response({'error': 'username e password são obrigatórios.'},
                        status=status.HTTP_400_BAD_REQUEST)

    allowed_types = {'Regular', 'Caixa', 'Gerente', 'Admin', 'Auxiliar', 'Assistente'}
    if user_type not in allowed_types:
        user_type = 'Regular'

    if User.objects.filter(username=username).exists():
        return Response({'error': 'username já existe.'},
                        status=status.HTTP_400_BAD_REQUEST)

    user = User(
        username=username,
        email=email,
        first_name=first_name,
        last_name=last_name,
        type=user_type
    )
    user.set_password(password)
    user.save()

    token, _ = Token.objects.get_or_create(user=user)

    return Response({
        'message': 'Usuário criado com sucesso.',
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'type': user.type,
        },
        'token': token.key
    }, status=status.HTTP_201_CREATED)

# -------------------------
# /api/me (requer auth)
# -------------------------
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    user = request.user
    return JsonResponse({
        'id': user.id,
        'username': user.username,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'email': user.email,
        'type': getattr(user, 'type', 'Regular'),
    })

# -------------------------
# /api/auth/logout (revoga token atual)
# -------------------------
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    token = getattr(request, 'auth', None)
    if token is None:
        return Response({'detail': 'Nenhum token ativo para revogar.'},
                        status=status.HTTP_400_BAD_REQUEST)
    try:
        token.delete()
    except Exception:
        return Response({'detail': 'Não foi possível revogar o token.'},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    return Response({'detail': 'Logout efetuado. Token revogado.'},
                    status=status.HTTP_200_OK)

# -------------------------
# Users ViewSet (requer auth)
# -------------------------
class UserViewSet(viewsets.ModelViewSet):
    """
    /api/users/
    """
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer
    queryset = get_user_model().objects.all().order_by('-date_joined')
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'email', 'first_name', 'last_name', 'type']
    ordering_fields = ['date_joined', 'username', 'email', 'first_name', 'last_name', 'type']

# -------------------------
# ViewSets principais (requerem auth)
# -------------------------
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
    queryset = (ProdutoDetalhe.objects
                .select_related('Idproduto', 'Idtamanho', 'Idcor')
                .all()
                .order_by('-data_cadastro'))
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

class FornecedorViewSet(viewsets.ModelViewSet):
    queryset = Fornecedor.objects.all().order_by('-data_cadastro')
    serializer_class = FornecedorSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['Nome_fornecedor', 'Apelido', 'Cnpj', 'email', 'Cidade']
    ordering_fields = ['data_cadastro', 'Nome_fornecedor']

class VendedorViewSet(viewsets.ModelViewSet):
    queryset = Vendedor.objects.all().order_by('-data_cadastro')
    serializer_class = VendedorSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nomevendedor', 'apelido', 'cpf']
    ordering_fields = ['data_cadastro', 'nomevendedor']

class FuncionariosViewSet(viewsets.ModelViewSet):
    queryset = Funcionarios.objects.all().order_by('-data_cadastro')
    serializer_class = FuncionariosSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nomefuncionario', 'apelido', 'cpf', 'categoria']
    ordering_fields = ['data_cadastro', 'nomefuncionario']

class GradeViewSet(viewsets.ModelViewSet):
    queryset = Grade.objects.all().order_by('-data_cadastro')
    serializer_class = GradeSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['Descricao', 'Status']
    ordering_fields = ['data_cadastro', 'Descricao']

class TamanhoViewSet(viewsets.ModelViewSet):
    """
    ÚNICA definição (consolidada):
    - Filtro por grade: /api/tamanhos/?idgrade=<Idgrade>
    - Busca: Tamanho, Descricao
    """
    queryset = Tamanho.objects.all().order_by('-data_cadastro')
    serializer_class = TamanhoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['idgrade']             # << permite filtrar por grade
    search_fields = ['Tamanho', 'Descricao']
    ordering_fields = ['data_cadastro', 'Tamanho']

class CorViewSet(viewsets.ModelViewSet):
    queryset = Cor.objects.all().order_by('-data_cadastro')
    serializer_class = CorSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['Descricao', 'Codigo', 'Cor', 'Status']
    ordering_fields = ['data_cadastro', 'Descricao', 'Codigo']

class ColecaoViewSet(viewsets.ModelViewSet):
    queryset = Colecao.objects.all().order_by('-data_cadastro')
    serializer_class = ColecaoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['Descricao', 'Codigo', 'Estacao', 'Status']
    ordering_fields = ['data_cadastro', 'Descricao', 'Codigo', 'Estacao']

class FamiliaViewSet(viewsets.ModelViewSet):
    queryset = Familia.objects.all().order_by('-data_cadastro')
    serializer_class = FamiliaSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['Descricao', 'Codigo']
    ordering_fields = ['data_cadastro', 'Descricao', 'Codigo']

class UnidadeViewSet(viewsets.ModelViewSet):
    queryset = Unidade.objects.all().order_by('-data_cadastro')
    serializer_class = UnidadeSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['Descricao', 'Codigo']
    ordering_fields = ['data_cadastro', 'Descricao', 'Codigo']

class CodigosViewSet(viewsets.ModelViewSet):
    queryset = Codigos.objects.all().order_by('colecao', 'estacao')
    serializer_class = CodigosSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['colecao', 'estacao']
    search_fields = ['colecao', 'estacao', 'valor_var']
    ordering_fields = ['colecao', 'estacao', 'valor_var']

class GrupoViewSet(viewsets.ModelViewSet):
    queryset = Grupo.objects.all().order_by('Descricao')
    serializer_class = GrupoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['Codigo']  # opcional, filtrar por código
    search_fields = ['Descricao', 'Codigo']
    ordering_fields = ['Descricao', 'Codigo', 'data_cadastro']

class SubgrupoViewSet(viewsets.ModelViewSet):
    queryset = Subgrupo.objects.select_related('Idgrupo').all().order_by('Descricao')
    serializer_class = SubgrupoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['Idgrupo']  # permite /api/subgrupos/?Idgrupo=#
    search_fields = ['Descricao', 'Idgrupo__Descricao']
    ordering_fields = ['Descricao', 'data_cadastro']

    # (Opcional) filtro alternativo via ?grupo=<Idgrupo>
    def get_queryset(self):
        qs = super().get_queryset()
        grupo_id = self.request.query_params.get('grupo')
        if grupo_id:
            qs = qs.filter(Idgrupo_id=grupo_id)
        return qs

class TabelaprecoViewSet(viewsets.ModelViewSet):
    queryset = Tabelapreco.objects.all().order_by('-data_cadastro')
    serializer_class = TabelaprecoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['NomeTabela', 'Promocao']
    ordering_fields = ['data_cadastro', 'NomeTabela', 'DataInicio', 'DataFim']