from decimal import Decimal
from xml.etree import ElementTree as ET

from django.http import JsonResponse
from django_filters.rest_framework import DjangoFilterBackend, FilterSet, filters as df
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone

from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token

# >>> AUDITORIA <<<
from auditoria.utils import write_product_status_change

from .models import (
    Loja, Cliente, Produto, ProdutoDetalhe, Estoque,
    Fornecedor, Vendedor, Funcionarios, Grade, Tamanho, Cor,
    Colecao, Familia, Unidade, Grupo, Subgrupo, Codigos, Tabelapreco, Ncm,
    TabelaPrecoItem,
    # modelos fiscais / compras
    NFeEntrada, NFeItem, FornecedorSkuMap, Compra, CompraItem, MovimentacaoProdutos, 
)
from .serializers import (
    UserSerializer,
    LojaSerializer, ClienteSerializer, ProdutoSerializer, ProdutoDetalheSerializer, EstoqueSerializer,
    FornecedorSerializer, VendedorSerializer, FuncionariosSerializer, GradeSerializer, TamanhoSerializer,
    CorSerializer, ColecaoSerializer, FamiliaSerializer, UnidadeSerializer, GrupoSerializer,
    SubgrupoSerializer, CodigosSerializer, TabelaprecoSerializer, NcmSerializer,
    NFeEntradaSerializer, NFeItemSerializer, FornecedorSkuMapSerializer, TabelaPrecoItemSerializer
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

    # vincular loja, se enviada
    loja_key = data.get('Idloja') or data.get('loja') or data.get('loja_id')
    if loja_key:
        try:
            loja = Loja.objects.get(pk=int(loja_key))
            user.Idloja = loja
            user.save(update_fields=['Idloja'])
        except (Loja.DoesNotExist, ValueError):
            pass

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
            'Idloja': getattr(user, 'Idloja_id', None),
            'loja_nome': getattr(user.Idloja, 'nome_loja', None) if getattr(user, 'Idloja', None) else None,
        },
        'token': token.key
    }, status=status.HTTP_201_CREATED)

# -------------------------
# Login (público) → retorna token
# -------------------------
@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    from django.contrib.auth import authenticate
    username = (request.data.get('username') or '').strip()
    password = (request.data.get('password') or '').strip()
    if not username or not password:
        return Response({'detail': 'username e password são obrigatórios.'}, status=400)

    user = authenticate(username=username, password=password)
    if not user:
        return Response({'detail': 'Credenciais inválidas.'}, status=400)

    token, _ = Token.objects.get_or_create(user=user)
    return Response({
        'token': token.key,
        'user': UserSerializer(user).data
    }, status=200)

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
        'Idloja': loja_id,
        'loja_nome': loja_nome,
    })

# -------------------------
# /api/auth/logout
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
# Users ViewSet
# -------------------------
class UserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer
    queryset = get_user_model().objects.all().order_by('-date_joined')
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'email', 'first_name', 'last_name', 'type']
    ordering_fields = ['date_joined', 'username', 'email', 'first_name', 'last_name', 'type']

# -------------------------
# ViewSets principais
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
    filterset_fields = ['Ativo']

    # ---------- helpers internos ----------
    @staticmethod
    def _to_bool(v):
        if isinstance(v, bool): return v
        if isinstance(v, (int, float)): return bool(int(v))
        if isinstance(v, str):
            s = v.strip().lower()
            if s in {'1','true','ativo','active','sim','yes'}: return True
            if s in {'0','false','inativo','inactive','não','nao','no'}: return False
        return None

    @staticmethod
    def _get_reason(request):
        return (request.headers.get('X-Audit-Reason')
                or request.data.get('audit_reason')
                or request.data.get('motivo')
                or request.data.get('motivo_inativacao')
                or '').strip()

    @staticmethod
    def _get_password(request):
        return (request.data.get('password')
                or request.data.get('senha')
                or request.headers.get('X-User-Password')
                or '').strip()

    # ---------- ações explícitas ----------
    @action(detail=True, methods=['post'], url_path='inativar')
    def inativar(self, request, pk=None):
        produto = self.get_object()
        old_status = bool(produto.Ativo)

        motivo = self._get_reason(request)
        if not motivo or len(motivo) < 3:
            return Response(
                {'detail': 'Informe o motivo da inativação (mín. 3 caracteres).'},
                status=400
            )

        # >>> NOVO: exigir senha do usuário logado
        raw_password = (request.data.get('password') or request.data.get('senha') or '').strip()
        if not raw_password or not request.user.check_password(raw_password):
            return Response(
                {'detail': 'Senha errada. Desativação não autorizada.'},
                status=403
            )

        if old_status is True:
            produto.Ativo = False
            produto.inativado_em = timezone.now()
            try:
                produto.inativado_por = request.user if request.user.is_authenticated else None
            except Exception:
                produto.inativado_por = None
            produto.save(update_fields=['Ativo','inativado_em','inativado_por'])

            # cascata: desativar SKUs
            ProdutoDetalhe.objects.filter(Idproduto=produto, Ativo=True).update(Ativo=False)

            # auditoria (guarda o motivo)
            write_product_status_change(
                request=request,
                instance=produto,
                old_status=True,
                new_status=False,
                reason=motivo
            )

        return Response({'Ativo': bool(produto.Ativo)}, status=200)

    @action(detail=True, methods=['post'], url_path='ativar')
    def ativar(self, request, pk=None):
        produto = self.get_object()
        old_status = bool(produto.Ativo)
        motivo = self._get_reason(request)  # opcional ao ativar

        if old_status is False:
            produto.Ativo = True
            produto.inativado_em = None
            produto.inativado_por = None
            produto.save(update_fields=['Ativo','inativado_em','inativado_por'])

            write_product_status_change(
                request=request,
                instance=produto,
                old_status=False,
                new_status=True,
                reason=(motivo or None)
            )

        return Response({'Ativo': bool(produto.Ativo)}, status=200)

    @action(detail=True, methods=['get'], url_path='skus')
    def list_skus(self, request, pk=None):
        produto = self.get_object()
        qs = (ProdutoDetalhe.objects
              .filter(Idproduto=produto)
              .select_related('Idcor', 'Idtamanho')
              .order_by('Idcor__Descricao', 'Idtamanho__Tamanho', 'CodigodeBarra'))

        data = []
        for pd in qs:
            data.append({
                'sku_id': pd.Idprodutodetalhe,  # <<< ADICIONADO
                'ean13': pd.CodigodeBarra,
                'codigoproduto': pd.Codigoproduto,
                'cor': getattr(pd.Idcor, 'Descricao', None),
                'cor_codigo': getattr(pd.Idcor, 'Codigo', None),
                'cor_rgb': getattr(pd.Idcor, 'Cor', None),
                'tamanho': getattr(pd.Idtamanho, 'Tamanho', None) or getattr(pd.Idtamanho, 'Descricao', None),
                'ativo': bool(pd.Ativo),
            })
        return Response({'produto_id': produto.pk, 'referencia': produto.referencia, 'skus': data}, status=200)

    @action(detail=True, methods=['get'], url_path='precos')
    def list_precos(self, request, pk=None):
        produto = self.get_object()
        eans = list(
            ProdutoDetalhe.objects.filter(Idproduto=produto).values_list('CodigodeBarra', flat=True)
        )
        if not eans:
            return Response({'produto_id': produto.pk, 'referencia': produto.referencia, 'tabelas': []}, status=200)

        itens = (TabelaPrecoItem.objects
                 .filter(codigodebarra__in=eans)
                 .select_related('idtabela')
                 .order_by('idtabela__NomeTabela', 'codigodebarra'))

        agrup = {}
        for it in itens:
            tid = it.idtabela_id
            tnome = getattr(it.idtabela, 'NomeTabela', str(tid))
            if tid not in agrup:
                agrup[tid] = {'tabela_id': tid, 'tabela_nome': tnome, 'itens': []}
            agrup[tid]['itens'].append({
                'ean13': it.codigodebarra,
                'preco': float(it.preco or 0),
            })

        return Response({
            'produto_id': produto.pk,
            'referencia': produto.referencia,
            'tabelas': list(agrup.values())
        }, status=200)

    def get_queryset(self):
        """
        LIST: filtra por ativo (padrão só ativos).
        DEMAIS AÇÕES (retrieve, patch, ativar, inativar...): NÃO filtra por ativo.
        """
        qs = super().get_queryset()
        action_name = getattr(self, 'action', None)
        if action_name and action_name != 'list':
            return qs

        ativo = self.request.query_params.get('ativo')
        if ativo is None or (isinstance(ativo, str) and ativo.lower() in ('true', '1', '')):
            return qs.filter(Ativo=True)
        if isinstance(ativo, str) and ativo.lower() == 'all':
            return qs
        return qs.filter(Ativo=False)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        old_status = bool(getattr(instance, 'Ativo', False))

        try:
            data = request.data.copy()
        except Exception:
            data = dict(request.data or {})

        aliases = ['ativo', 'status', 'Status', 'ativo_status']
        new_status = None

        if 'Ativo' in data and data['Ativo'] not in (None, ''):
            new_status = self._to_bool(data.get('Ativo'))

        if new_status is None:
            for k in aliases:
                if k in data and k in data and data[k] not in (None, ''):
                    new_status = self._to_bool(data.get(k))
                    break

        if new_status is not None:
            data['Ativo'] = new_status
        for k in aliases:
            if k in data:
                try: data.pop(k)
                except Exception: pass

        # motivo obrigatório se desativar
        if new_status is not None and old_status and not new_status:
            motivo = self._get_reason(request)
            if not motivo or len(motivo.strip()) < 3:
                return Response({'detail': 'Informe o motivo da inativação (mín. 3 caracteres).'}, status=400)

            # senha obrigatória também pelo PATCH que desativa
            senha = self._get_password(request)
            user = request.user
            if not user or not user.is_authenticated:
                return Response({'detail': 'Não autenticado.'}, status=401)
            if not senha:
                return Response({'detail': 'Senha é obrigatória para desativar o produto.'}, status=400)
            if not user.check_password(senha):
                return Response({'detail': 'Senha inválida.'}, status=403)

        partial = kwargs.pop('partial', True)
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        instance.refresh_from_db()
        now_active = bool(getattr(instance, 'Ativo', False))

        if old_status and not now_active:
            ProdutoDetalhe.objects.filter(Idproduto=instance, Ativo=True).update(Ativo=False)

        if new_status is not None and old_status != now_active:
            motivo = self._get_reason(request)
            write_product_status_change(
                request=request,
                instance=instance,
                old_status=old_status,
                new_status=now_active,
                reason=(motivo or None)
            )

        return Response(serializer.data, status=status.HTTP_200_OK)



class ProdutoDetalheViewSet(viewsets.ModelViewSet):
    queryset = (ProdutoDetalhe.objects
                .select_related('Idproduto', 'Idtamanho', 'Idcor')
                .all()
                .order_by('-data_cadastro'))
    serializer_class = ProdutoDetalheSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['CodigodeBarra', 'Codigoproduto', 'Idproduto', 'Ativo']
    search_fields = ['CodigodeBarra', 'Codigoproduto']
    ordering_fields = ['data_cadastro', 'CodigodeBarra']

    def get_queryset(self):
        """
        LIST: aplica filtro de ativo (padrão só ativos).
        DEMAIS AÇÕES (retrieve, update, partial_update, destroy...): NÃO filtra por ativo.
        Mantém filtros existentes (Idproduto, etc).
        """
        qs = super().get_queryset()

        # Se não for list, não restrinja por Ativo
        action_name = getattr(self, 'action', None)
        if action_name and action_name != 'list':
            return qs

        ativo = self.request.query_params.get('ativo')
        if ativo is None or (isinstance(ativo, str) and ativo.lower() in ('true', '1', '')):
            qs = qs.filter(Ativo=True)
        elif isinstance(ativo, str) and ativo.lower() == 'all':
            pass
        else:
            qs = qs.filter(Ativo=False)
        return qs

    # criação em lote de SKUs (mantém igual)
    @action(detail=False, methods=['post'], url_path='batch-create')
    def batch_create(self, request):
        # ... (resto do método exatamente como já está no seu arquivo)
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

                if not ean13:
                    row_cod.valor_var = int(row_cod.valor_var) + 1
                    row_cod.save(update_fields=['valor_var'])
                    seq5 = str(row_cod.valor_var % 100000).zfill(5)
                    base12 = f'{prefixo_pais}{prefixo_empresa}{seq5}'
                    ean13 = base12 + dv_ean13(base12)

                pd, created_pd = ProdutoDetalhe.objects.get_or_create(
                    CodigodeBarra=ean13,
                    defaults={
                        'Idproduto': produto,
                        'Idcor': cor,
                        'Idtamanho': tamanho,
                        'Codigoproduto': cod_prod,
                        'Ativo': True,
                    }
                )
                if not created_pd:
                    changed = False
                    if pd.Idproduto_id != produto.pk:
                        pd.Idproduto = produto; changed = True
                    if pd.Idcor_id != cor.pk:
                        pd.Idcor = cor; changed = True
                    if pd.Idtamanho_id != tamanho.pk:
                        pd.Idtamanho = tamanho; changed = True
                    if pd.Codigoproduto != cod_prod:
                        pd.Codigoproduto = cod_prod; changed = True
                    if not pd.Ativo:
                        pd.Ativo = True; changed = True
                    if changed:
                        pd.save()
                    updated += 1
                else:
                    created += 1

                TabelaPrecoItem.objects.update_or_create(
                    codigodebarra=ean13,
                    idtabela=tabela,
                    defaults={'codigoproduto': cod_prod, 'preco': preco_item}
                )

                if lojas:
                    for lj in lojas:
                        Estoque.objects.get_or_create(
                            Idloja=lj,
                            CodigodeBarra=ean13,
                            defaults={'codigoproduto': cod_prod, 'Estoque': 0}
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


# ---- Preços por EAN (read-only) -----------------
class TabelaPrecoItemFilter(FilterSet):
    idtabela_id = df.NumberFilter(field_name='idtabela_id')
    codigodebarra = df.CharFilter(field_name='codigodebarra', lookup_expr='exact')
    codigodebarra__in = df.CharFilter(method='filter_eans')

    def filter_eans(self, queryset, name, value):
        codes = [c.strip() for c in (value or '').split(',') if c.strip()]
        return queryset.filter(codigodebarra__in=codes)

    class Meta:
        model = TabelaPrecoItem
        fields = ['idtabela_id', 'codigodebarra']

class TabelaPrecoItemViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = TabelaPrecoItem.objects.all()
    serializer_class = TabelaPrecoItemSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_class = TabelaPrecoItemFilter
    ordering_fields = ['codigodebarra']
    ordering = ['codigodebarra']


# -----------------------------
# FornecedorSkuMap CRUD
# -----------------------------
class FornecedorSkuMapViewSet(viewsets.ModelViewSet):
    queryset = FornecedorSkuMap.objects.select_related('Idfornecedor', 'Idprodutodetalhe', 'Idproduto').all().order_by('-data_cadastro')
    serializer_class = FornecedorSkuMapSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['Idfornecedor']
    search_fields = ['cprod_fornecedor']
    ordering_fields = ['data_cadastro', 'cprod_fornecedor']


# =========================
# NF-e de Entrada
# =========================
def _text(node, path, default=''):
    el = node.find(path)
    return (el.text or '').strip() if el is not None and el.text is not None else default

def _any(tag):
    # helper para ignorar namespace
    return f'.//{{*}}{tag}'

def _only_digits(s):
    return ''.join(ch for ch in (s or '') if ch.isdigit())


class NFeEntradaViewSet(viewsets.ModelViewSet):
    queryset = NFeEntrada.objects.select_related('Idloja', 'Idfornecedor').all().order_by('-data_cadastro')
    serializer_class = NFeEntradaSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['chave', 'numero', 'serie', 'razao_emitente', 'cnpj_emitente']
    ordering_fields = ['data_cadastro', 'numero', 'serie', 'dhEmi', 'status']

    # --------- 1) Upload do XML -----------
    @action(detail=False, methods=['post'], url_path='upload-xml')
    def upload_xml(self, request):
        """
        POST /api/nfe-entradas/upload-xml/
        Form-data:
          - xml: arquivo XML da NFe ou nfeProc
          - Idloja (obrigatório)
          - Idfornecedor (opcional)  → se não vier, tenta casar por CNPJ do emitente
        """
        xml_file = request.FILES.get('xml')
        if not xml_file:
            return Response({'detail': 'Envie o arquivo XML em "xml".'}, status=400)

        loja_key = request.data.get('Idloja') or request.data.get('loja')
        if not loja_key:
            return Response({'detail': 'Idloja é obrigatório.'}, status=400)
        try:
            loja = Loja.objects.get(pk=int(loja_key))
        except Exception:
            return Response({'detail': 'Loja inválida.'}, status=400)

        forn = None
        forn_key = request.data.get('Idfornecedor') or request.data.get('fornecedor')

        try:
            content = xml_file.read()
            root = ET.fromstring(content)
        except Exception as e:
            return Response({'detail': f'XML inválido: {e}'}, status=400)

        # extrai nós principais
        inf = root.find(_any('infNFe'))
        if inf is None:
            nfe = root.find(_any('NFe'))
            inf = nfe.find(_any('infNFe')) if nfe is not None else None
        if inf is None:
            return Response({'detail': 'Estrutura XML não contém infNFe.'}, status=400)

        chave = (inf.attrib.get('Id') or '').replace('NFe', '').strip()[:44]
        ide = inf.find(_any('ide'))
        emit = inf.find(_any('emit'))
        dets = inf.findall(_any('det'))
        total = inf.find(_any('total'))

        numero = _text(ide, _any('nNF'))
        serie  = _text(ide, _any('serie'))
        dhEmi  = _text(ide, _any('dhEmi')) or _text(ide, _any('dEmi'))
        try:
            dhEmi_dt = timezone.now() if not dhEmi else timezone.make_aware(
                timezone.datetime.fromisoformat(dhEmi.replace('Z','+00:00'))
            )
        except Exception:
            dhEmi_dt = timezone.now()

        cnpj_emit = _only_digits(_text(emit, _any('CNPJ')))
        razao_emit = _text(emit, _any('xNome'))

        # fornecedor: param > CNPJ
        if forn_key:
            try:
                forn = Fornecedor.objects.get(pk=int(forn_key))
            except Exception:
                pass
        if not forn and cnpj_emit:
            forn = Fornecedor.objects.filter(Cnpj__regex=r'\D*' + cnpj_emit + r'\D*').first()
            if not forn:
                # tentativa simples: limpar Cnpj no banco e comparar
                forn = next((f for f in Fornecedor.objects.all() if _only_digits(f.Cnpj) == cnpj_emit), None)

        # totais
        ICMSTot = total.find(_any('ICMSTot')) if total is not None else None
        def _dec(x):
            try: return Decimal(str(x))
            except: return Decimal('0')

        vProd = _dec(_text(ICMSTot, _any('vProd')) if ICMSTot is not None else '0')
        vDesc = _dec(_text(ICMSTot, _any('vDesc')) if ICMSTot is not None else '0')
        vFrete = _dec(_text(ICMSTot, _any('vFrete')) if ICMSTot is not None else '0')
        vOutro = _dec(_text(ICMSTot, _any('vOutro')) if ICMSTot is not None else '0')
        vIPI = _dec(_text(ICMSTot, _any('vIPI')) if ICMSTot is not None else '0')
        vICMSST = _dec(_text(ICMSTot, _any('vST')) if ICMSTot is not None else '0')
        vNF = _dec(_text(ICMSTot, _any('vNF')) if ICMSTot is not None else '0')

        with transaction.atomic():
            nf = NFeEntrada.objects.create(
                chave=chave, numero=numero, serie=serie, dhEmi=dhEmi_dt,
                cnpj_emitente=cnpj_emit or None, razao_emitente=razao_emit or None,
                Idfornecedor=forn, Idloja=loja,
                xml=content.decode('utf-8', errors='ignore'),
                vProd=vProd, vDesc=vDesc, vFrete=vFrete, vOutro=vOutro, vIPI=vIPI, vICMSST=vICMSST, vNF=vNF,
                status='importada'
            )

            # itens
            for det in dets:
                nItem = det.attrib.get('nItem')
                prod = det.find(_any('prod'))
                if prod is None:
                    continue
                cProd = _text(prod, _any('cProd'))
                xProd = _text(prod, _any('xProd'))
                ncm  = _text(prod, _any('NCM'))
                cfop = _text(prod, _any('CFOP'))
                uCom = _text(prod, _any('uCom'))
                ean  = _text(prod, _any('cEANTrib')) or _text(prod, _any('cEAN'))
                qCom = _text(prod, _any('qCom'), '0')
                vUn  = _text(prod, _any('vUnCom'), '0')
                vTot = _text(prod, _any('vProd'), '0')

                # descontos e outros no item (quando houver)
                vDesc_i = _text(prod, _any('vDesc')) or '0'
                vFrete_i = _text(prod, _any('vFrete')) or '0'
                vOutro_i = _text(prod, _any('vOutro')) or '0'

                def _d(s): 
                    try: return Decimal(str(s))
                    except: return Decimal('0')

                NFeItem.objects.create(
                    nfe=nf,
                    ordem=(int(nItem) if (nItem and nItem.isdigit()) else 0),
                    cProd=cProd, xProd=xProd, ncm=ncm, cfop=cfop, uCom=uCom,
                    qCom=_d(qCom), vUnCom=_d(vUn), vProd=_d(vTot),
                    cean=(ean or None),
                    vDesc=_d(vDesc_i), vFrete=_d(vFrete_i), vOutro=_d(vOutro_i)
                )

        return Response(NFeEntradaSerializer(nf).data, status=201)

    # --------- 2) Reconciliar (preview) -----------
    @action(detail=True, methods=['post'], url_path='reconciliar')
    def reconciliar(self, request, pk=None):
        nf = self.get_object()
        itens = list(nf.itens.all().order_by('ordem'))
        fornecedor = nf.Idfornecedor

        result = []
        matched_all = True

        for it in itens:
            destino = None

            # 1) SKU por EAN
            if it.cean:
                pd = ProdutoDetalhe.objects.filter(CodigodeBarra=it.cean).select_related('Idproduto').first()
                if pd:
                    destino = {
                        'tipo': 'sku',
                        'Idprodutodetalhe': pd.Idprodutodetalhe,
                        'ean': pd.CodigodeBarra,
                        'codigoproduto': pd.Codigoproduto,
                        'produto_id': pd.Idproduto.Idproduto,
                        'produto_ref': pd.Idproduto.referencia,
                        'produto_desc': pd.Idproduto.Descricao
                    }

            # 2) Mapa fornecedor → SKU/Produto
            if not destino and fornecedor:
                m = FornecedorSkuMap.objects.filter(
                    Idfornecedor=fornecedor, cprod_fornecedor=it.cProd
                ).select_related('Idprodutodetalhe', 'Idproduto').first()
                if m and m.Idprodutodetalhe:
                    pd = m.Idprodutodetalhe
                    destino = {
                        'tipo': 'sku',
                        'Idprodutodetalhe': pd.Idprodutodetalhe,
                        'ean': pd.CodigodeBarra,
                        'codigoproduto': pd.Codigoproduto,
                        'produto_id': pd.Idproduto.Idproduto,
                        'produto_ref': pd.Idproduto.referencia,
                        'produto_desc': pd.Idproduto.Descricao
                    }
                elif m and m.Idproduto:
                    p = m.Idproduto
                    destino = {
                        'tipo': 'produto',
                        'Idproduto': p.Idproduto,
                        'produto_ref': p.referencia,
                        'produto_desc': p.Descricao
                    }

            if destino is None:
                matched_all = False

            result.append({
                'item_id': it.Idnfeitem,
                'ordem': it.ordem,
                'cProd': it.cProd,
                'xProd': it.xProd,
                'ean': it.cean,
                'qtd': str(it.qCom),
                'vUnCom': str(it.vUnCom),
                'vProd': str(it.vProd),
                'destino': destino
            })

        nf.status = 'conciliada' if matched_all else 'importada'
        nf.save(update_fields=['status'])

        return Response({'status': nf.status, 'itens': result}, status=200)

    # --------- 3) Confirmar (gera Compra + Estoque/Mvto) -----------
    @action(detail=True, methods=['post'], url_path='confirmar')
    def confirmar(self, request, pk=None):
        permitir_parcial = bool(request.data.get('permitir_parcial', False))
        nf = self.get_object()

        if nf.status == 'lancada':
            return Response({'detail': 'NF-e já lançada.'}, status=400)

        loja = nf.Idloja
        if not loja:
            return Response({'detail': 'NF-e sem loja definida.'}, status=400)

        fornecedor = nf.Idfornecedor
        if not fornecedor:
            forn_id = request.data.get('fornecedor_id')
            if not forn_id:
                return Response({'detail': 'Informe fornecedor_id no corpo da requisição.'}, status=400)
            try:
                fornecedor = Fornecedor.objects.get(pk=int(forn_id))
            except Exception:
                return Response({'detail': 'fornecedor_id inválido.'}, status=400)

        itens = list(nf.itens.all().order_by('ordem'))
        if not itens:
            return Response({'detail': 'NF-e sem itens.'}, status=400)

        # Mapeamento
        mapeados = []  # (it, destino_tuple)
        faltantes = []

        for it in itens:
            destino = None

            # 1) SKU por EAN
            if it.cean:
                pd = ProdutoDetalhe.objects.filter(CodigodeBarra=it.cean).select_related('Idproduto').first()
                if pd:
                    destino = ('sku', pd)

            # 2) Mapa do fornecedor (cProd)
            if not destino:
                m = FornecedorSkuMap.objects.filter(
                    Idfornecedor=fornecedor, cprod_fornecedor=it.cProd
                ).select_related('Idprodutodetalhe', 'Idproduto').first()
                if m and m.Idprodutodetalhe:
                    destino = ('sku', m.Idprodutodetalhe)
                elif m and m.Idproduto:
                    destino = ('produto', m.Idproduto)

            if not destino:
                faltantes.append({'item_id': it.Idnfeitem, 'ordem': it.ordem, 'cProd': it.cProd, 'xProd': it.xProd, 'ean': it.cean})
            else:
                mapeados.append((it, destino))

        if faltantes and not permitir_parcial:
            return Response({'detail': 'Itens sem mapeamento.', 'faltantes': faltantes}, status=400)

        # Totais e rateio
        total_base = sum((it.vProd for (it, _) in mapeados), Decimal('0')) or Decimal('1')
        frete_total = nf.vFrete or Decimal('0')
        outros_total = nf.vOutro or Decimal('0')
        desc_total = nf.vDesc or Decimal('0')

        with transaction.atomic():
            # Compra (cria se não houver)
            try:
                compra = nf.compra  # related_name='compra' em Compra.nfe
                ja_existia = True
            except Exception:
                compra = None
                ja_existia = False

            if not ja_existia:
                compra = Compra.objects.create(
                    Idfornecedor=fornecedor,
                    Idloja=loja,
                    Datacompra=timezone.now().date(),
                    Status='OK',
                    Documento=nf.numero or '',
                    Datadocumento=(nf.dhEmi.date() if nf.dhEmi else timezone.now().date()),
                    nfe=nf,
                    Valorpedido=(nf.vNF or nf.vProd or Decimal('0')),
                    valor_total=(nf.vNF or nf.vProd or Decimal('0')),
                    frete_rateado=frete_total,
                    desconto_rateado=desc_total,
                    outros_rateado=outros_total,
                    Idpedidocompra=None
                )

            # CompraItens + Estoque/Mvto
            created_items = 0
            atualizados_estoque = 0

            for it, (tipo, alvo) in mapeados:
                proporcao = (it.vProd / total_base) if total_base else Decimal('0')
                frete_item = (frete_total * proporcao).quantize(Decimal('0.01'))
                outros_item = (outros_total * proporcao).quantize(Decimal('0.01'))
                desc_item = (it.vDesc or Decimal('0')) + (desc_total * proporcao).quantize(Decimal('0.01'))

                qtd = int(it.qCom or 0)
                if qtd <= 0:
                    continue

                custo_unit = ((it.vProd - desc_item + frete_item + outros_item) / qtd).quantize(Decimal('0.000001'))

                if tipo == 'sku':
                    pd = alvo  # ProdutoDetalhe
                    CompraItem.objects.create(
                        Idcompra=compra,
                        Idprodutodetalhe=pd,
                        Idproduto=None,
                        Qtd=qtd,
                        Valorunitario=it.vUnCom,
                        Descontoitem=(it.vDesc or Decimal('0')),
                        Totalitem=it.vProd,
                        frete_rateado_item=frete_item,
                        outros_rateado_item=outros_item,
                        custo_unitario=custo_unit
                    )
                    created_items += 1

                    # Estoque
                    est, _ = Estoque.objects.get_or_create(
                        Idloja=loja, CodigodeBarra=pd.CodigodeBarra,
                        defaults={'codigoproduto': pd.Codigoproduto, 'Estoque': 0}
                    )
                    est.Estoque = (est.Estoque or 0) + qtd
                    if not est.codigoproduto:
                        est.codigoproduto = pd.Codigoproduto
                    est.save(update_fields=['Estoque', 'codigoproduto'])
                    atualizados_estoque += 1

                    # Movimentação
                    try:
                        MovimentacaoProdutos.objects.create(
                            Idloja=loja,
                            Data_mov=(nf.dhEmi.date() if nf.dhEmi else timezone.now().date()),
                            Documento=nf.numero or '',
                            Tipo='E',
                            Qtd=qtd,
                            Valor=it.vProd,
                            CodigodeBarra=pd.CodigodeBarra,
                            codigoproduto=pd.Codigoproduto
                        )
                    except Exception:
                        pass

                else:  # 'produto' (uso/consumo) – não movimenta estoque
                    p = alvo  # Produto
                    CompraItem.objects.create(
                        Idcompra=compra,
                        Idprodutodetalhe=None,
                        Idproduto=p,
                        Qtd=qtd,
                        Valorunitario=it.vUnCom,
                        Descontoitem=(it.vDesc or Decimal('0')),
                        Totalitem=it.vProd,
                        frete_rateado_item=frete_item,
                        outros_rateado_item=outros_item,
                        custo_unitario=custo_unit
                    )
                    created_items += 1

            nf.status = 'lancada'
            nf.save(update_fields=['status'])

        return Response({
            'status': nf.status,
            'compra_id': compra.Idcompra,
            'itens_criados': created_items,
            'estoque_atualizado_skus': atualizados_estoque,
            'itens_sem_mapeamento': faltantes if permitir_parcial else []
        }, status=200)
