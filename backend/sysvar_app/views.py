from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction

from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token

from .models import (
    Loja, Cliente, Produto, ProdutoDetalhe, Estoque,
    Fornecedor, Vendedor, Funcionarios, Grade, Tamanho, Cor,
    Colecao, Familia, Unidade, Grupo, Subgrupo, Codigos, Tabelapreco, Ncm
)
from .serializers import (
    UserSerializer,
    LojaSerializer, ClienteSerializer, ProdutoSerializer, ProdutoDetalheSerializer, EstoqueSerializer,
    FornecedorSerializer, VendedorSerializer, FuncionariosSerializer, GradeSerializer, TamanhoSerializer,
    CorSerializer, ColecaoSerializer, FamiliaSerializer, UnidadeSerializer, GrupoSerializer,
    SubgrupoSerializer, CodigosSerializer, TabelaprecoSerializer, NcmSerializer
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
        email=email or None,
        first_name=first_name,
        last_name=last_name,
        type=user_type
    )
    user.set_password(password)
    user.save()

    # >>> NOVO: vincular loja, se enviada (aceita Idloja / loja / loja_id)
    loja_key = data.get('Idloja') or data.get('loja') or data.get('loja_id')
    if loja_key:
        try:
            loja = Loja.objects.get(pk=int(loja_key))
            user.Idloja = loja
            user.save(update_fields=['Idloja'])
        except (Loja.DoesNotExist, ValueError):
            pass  # se vier inválido, ignora

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
            'Idloja': getattr(user, 'Idloja_id', None),                       # <<< NOVO
            'loja_nome': getattr(user.Idloja, 'nome_loja', None) if getattr(user, 'Idloja', None) else None,  # <<< NOVO
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
    loja_id = getattr(user, 'Idloja_id', None)
    loja_nome = user.Idloja.nome_loja if getattr(user, 'Idloja', None) else None
    return JsonResponse({
        'id': user.id,
        'username': user.username,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'email': user.email,
        'type': getattr(user, 'type', 'Regular'),
        'Idloja': loja_id,        # <<< NOVO
        'loja_nome': loja_nome,   # <<< NOVO
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

    # ===== Novo: criação em lote de SKUs =====
    @action(detail=False, methods=['post'], url_path='batch-create')
    def batch_create(self, request):
        """
        Payload esperado:
        {
          "product_id": 123,
          "tabela_preco_id": 5,
          "preco_padrao": 199.90,
          "lojas": [1,2],              # opcional; se não vier, não cria estoque
          "itens": [
            { "cor_id": 10, "tamanho_id": 3, "ean13": "7891234xxxxxD", "preco": 189.9 },
            { "cor_id": 11, "tamanho_id": 4 }  # sem ean => gera; sem preco => usa preco_padrao
          ]
        }
        Retorno: { created: n, updated: m, detalhes: [...], errors:[...] }
        """
        data = request.data or {}
        product_id = data.get('product_id')
        tabela_preco_id = data.get('tabela_preco_id')
        preco_padrao = data.get('preco_padrao')
        lojas_ids = data.get('lojas') or []
        itens = data.get('itens') or []

        if not product_id or not tabela_preco_id or preco_padrao is None:
            return Response({'detail': 'product_id, tabela_preco_id e preco_padrao são obrigatórios.'},
                            status=status.HTTP_400_BAD_REQUEST)
        if not isinstance(itens, list) or not itens:
            return Response({'detail': 'itens deve ser uma lista não vazia.'},
                            status=status.HTTP_400_BAD_REQUEST)

        # utilitário interno para EAN-13
        prefixo_pais = '789'
        prefixo_empresa = '1234'

        def dv_ean13(base12: str) -> str:
            soma = 0
            for i, ch in enumerate(base12):
                dig = int(ch)
                soma += dig * (3 if (i + 1) % 2 == 0 else 1)
            resto = soma % 10
            return str((10 - resto) % 10)

        try:
            produto = Produto.objects.get(pk=product_id)
        except Produto.DoesNotExist:
            return Response({'detail': 'Produto não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        # tentamos extrair "código do produto" para gravar nos detalhes/estoque
        cod_prod = getattr(produto, 'referencia', None) or str(getattr(produto, 'Idproduto', product_id))

        try:
            tabela = Tabelapreco.objects.get(pk=tabela_preco_id)
        except Tabelapreco.DoesNotExist:
            return Response({'detail': 'Tabela de preço não encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        lojas = []
        if lojas_ids:
            lojas = list(Loja.objects.filter(pk__in=lojas_ids))

        created, updated = 0, 0
        detalhes_resp = []
        errors = []

        with transaction.atomic():
            # linha de contagem para EAN na tabela Codigos (mesma “chave” do ean_next)
            row_cod, _ = Codigos.objects.select_for_update().get_or_create(
                colecao='EA', estacao='13', defaults={'valor_var': 0}
            )

            for idx, item in enumerate(itens, start=1):
                cor_id = item.get('cor_id')
                tam_id = item.get('tamanho_id')
                preco_item = item.get('preco', preco_padrao)
                ean13 = (item.get('ean13') or '').strip()

                if not cor_id or not tam_id:
                    errors.append({'index': idx, 'detail': 'cor_id e tamanho_id são obrigatórios.'})
                    continue

                # valida FK básicas (sem parar o lote)
                try:
                    cor = Cor.objects.get(pk=cor_id)
                except Cor.DoesNotExist:
                    errors.append({'index': idx, 'detail': f'Cor {cor_id} inexistente.'})
                    continue

                try:
                    tamanho = Tamanho.objects.get(pk=tam_id)
                except Tamanho.DoesNotExist:
                    errors.append({'index': idx, 'detail': f'Tamanho {tam_id} inexistente.'})
                    continue

                # gera EAN se não vier
                if not ean13:
                    row_cod.valor_var = int(row_cod.valor_var) + 1
                    row_cod.save(update_fields=['valor_var'])
                    seq5 = str(row_cod.valor_var % 100000).zfill(5)
                    base12 = f'{prefixo_pais}{prefixo_empresa}{seq5}'
                    ean13 = base12 + dv_ean13(base12)

                # cria/atualiza ProdutoDetalhe por CodigodeBarra (assumimos unique/índice)
                pd, created_pd = ProdutoDetalhe.objects.get_or_create(
                    CodigodeBarra=ean13,
                    defaults={
                        'Idproduto': produto,
                        'Idcor': cor,
                        'Idtamanho': tamanho,
                        'Codigoproduto': cod_prod
                    }
                )
                if not created_pd:
                    # garante consistência com o produto atual (se for desejado sobrescrever)
                    changed = False
                    if pd.Idproduto_id != produto.pk:
                        pd.Idproduto = produto; changed = True
                    if pd.Idcor_id != cor.pk:
                        pd.Idcor = cor; changed = True
                    if pd.Idtamanho_id != tamanho.pk:
                        pd.Idtamanho = tamanho; changed = True
                    if pd.Codigoproduto != cod_prod:
                        pd.Codigoproduto = cod_prod; changed = True
                    if changed:
                        pd.save()
                    updated += 1
                else:
                    created += 1

                # TabelaPrecoItem — unique (codigodebarra, idtabela)
                from .models import TabelaPrecoItem
                tpi, _ = TabelaPrecoItem.objects.update_or_create(
                    codigodebarra=ean13,
                    idtabela=tabela,
                    defaults={
                        'codigoproduto': cod_prod,
                        'preco': preco_item
                    }
                )

                # Estoque (opcional): cria 0 por loja informada
                if lojas:
                    for lj in lojas:
                        # tentamos criar apenas se não existir
                        Estoque.objects.get_or_create(
                            Idloja=lj,
                            CodigodeBarra=ean13,
                            defaults={
                                'codigoproduto': cod_prod,
                                'Estoque': 0
                            }
                        )

                detalhes_resp.append({
                    'ean13': ean13,
                    'cor': {'id': cor.pk, 'descricao': cor.Descricao},
                    'tamanho': {'id': tamanho.pk, 'descricao': tamanho.Descricao, 'tamanho': getattr(tamanho, 'Tamanho', None)},
                    'preco': float(preco_item)
                })

        return Response({
            'created': created,
            'updated': updated,
            'detalhes': detalhes_resp,
            'errors': errors
        }, status=status.HTTP_200_OK)


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
    filterset_fields = ['idgrade']
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

    @action(detail=False, methods=['post'], url_path='ean-next')
    def ean_next(self, request):
        """
        Próximo EAN-13 com chave em Codigos:
          - colecao='EA' (<= 2 chars), estacao='13'
          - 789 + 1234 + seq5 + DV
        """
        prefixo_pais = '789'
        prefixo_empresa = '1234'

        def dv_ean13(base12: str) -> str:
            soma = 0
            for i, ch in enumerate(base12):
                dig = int(ch)
                soma += dig * (3 if (i + 1) % 2 == 0 else 1)
            resto = soma % 10
            return str((10 - resto) % 10)

        with transaction.atomic():
            row, _ = Codigos.objects.select_for_update().get_or_create(
                colecao='EA', estacao='13', defaults={'valor_var': 0}
            )
            row.valor_var = int(row.valor_var) + 1
            row.save(update_fields=['valor_var'])

            seq5 = str(row.valor_var % 100000).zfill(5)
            base12 = f'{prefixo_pais}{prefixo_empresa}{seq5}'
            ean13 = base12 + dv_ean13(base12)

        return Response({'ean13': ean13}, status=status.HTTP_200_OK)


class GrupoViewSet(viewsets.ModelViewSet):
    queryset = Grupo.objects.all().order_by('Descricao')
    serializer_class = GrupoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['Codigo']
    search_fields = ['Descricao', 'Codigo']
    ordering_fields = ['Descricao', 'Codigo', 'data_cadastro']


class SubgrupoViewSet(viewsets.ModelViewSet):
    queryset = Subgrupo.objects.select_related('Idgrupo').all().order_by('Descricao')
    serializer_class = SubgrupoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['Idgrupo']
    search_fields = ['Descricao', 'Idgrupo__Descricao']
    ordering_fields = ['Descricao', 'data_cadastro']

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


class NcmViewSet(viewsets.ModelViewSet):
    queryset = Ncm.objects.all().order_by('ncm')
    serializer_class = NcmSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['ncm', 'descricao', 'aliquota', 'campo1']
    ordering_fields = ['ncm', 'descricao']
