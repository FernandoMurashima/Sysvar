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
from auditoria.utils import write_audit, snapshot_instance

from .models import (
    Loja, Cliente, Produto, ProdutoDetalhe, Estoque,
    Fornecedor, Vendedor, Funcionarios, Grade, Tamanho, Cor,
    Colecao, Familia, Unidade, Grupo, Subgrupo, Codigos, Tabelapreco, Ncm,
    TabelaPrecoItem,
    # modelos fiscais / compras
    NFeEntrada, NFeItem, FornecedorSkuMap, MovimentacaoProdutos, Nat_Lancamento, ModeloDocumentoFiscal
)
from .serializers import (
    UserSerializer,
    LojaSerializer, ClienteSerializer, ProdutoSerializer, ProdutoDetalheSerializer, EstoqueSerializer,
    FornecedorSerializer, VendedorSerializer, FuncionariosSerializer, GradeSerializer, TamanhoSerializer,
    CorSerializer, ColecaoSerializer, FamiliaSerializer, UnidadeSerializer, GrupoSerializer,
    SubgrupoSerializer, CodigosSerializer, TabelaprecoSerializer, NcmSerializer,
    NFeEntradaSerializer, NFeItemSerializer, FornecedorSkuMapSerializer, TabelaPrecoItemSerializer,
    NatLancamentoSerializer, ModeloDocumentoFiscalSerializer
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

        # >>> EXIGE senha do usuário logado
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
                'sku_id': pd.Idprodutodetalhe,
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
                if k in data and data[k] not in (None, ''):
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

    # ----- AUDITORIA: create/update/destroy -----
    def perform_create(self, serializer):
        instance = serializer.save()
        try:
            write_audit(
                request=self.request,
                model="Produto",
                object_id=getattr(instance, "Idproduto", None),
                verb="create",
                diff={"new": serializer.data},
                note=None,
            )
        except Exception:
            pass

    def perform_update(self, serializer):
        instance = serializer.instance
        before = {
            "Descricao": getattr(instance, "Descricao", None),
            "referencia": getattr(instance, "referencia", None),
            "Ativo": getattr(instance, "Ativo", None),
        }
        obj = serializer.save()
        after = {
            "Descricao": getattr(obj, "Descricao", None),
            "referencia": getattr(obj, "referencia", None),
            "Ativo": getattr(obj, "Ativo", None),
        }
        try:
            write_audit(
                request=self.request,
                model="Produto",
                object_id=getattr(obj, "Idproduto", None),
                verb="update",
                diff={"before": before, "after": after},
                note=None,
            )
        except Exception:
            pass

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        obj_id = getattr(instance, "Idproduto", None)
        snap = {
            "Descricao": getattr(instance, "Descricao", None),
            "referencia": getattr(instance, "referencia", None),
        }
        resp = super().destroy(request, *args, **kwargs)
        try:
            write_audit(
                request=request,
                model="Produto",
                object_id=obj_id,
                verb="delete",
                diff={"old": snap},
                note=None,
            )
        except Exception:
            pass
        return resp

        # >>> AUDITORIA AUTOMÁTICA <<<
    def perform_create(self, serializer):
        with transaction.atomic():
            instance = serializer.save()
            after = snapshot_instance(instance)
            write_audit(
                request=self.request,
                model_name="Produto",
                object_id=getattr(instance, "Idproduto", getattr(instance, "pk", None)),
                action="create",
                before=None,
                after=after,
                reason="Criação de produto via API",
            )

    def perform_update(self, serializer):
        with transaction.atomic():
            instance_before = self.get_object()
            before = snapshot_instance(instance_before)
            instance = serializer.save()
            after = snapshot_instance(instance)
            write_audit(
                request=self.request,
                model_name="Produto",
                object_id=getattr(instance, "Idproduto", getattr(instance, "pk", None)),
                action="update",
                before=before,
                after=after,
                reason="Atualização de produto via API",
            )

    def perform_destroy(self, instance):
        with transaction.atomic():
            before = snapshot_instance(instance)
            oid = getattr(instance, "Idproduto", getattr(instance, "pk", None))
            instance.delete()
            write_audit(
                request=self.request,
                model_name="Produto",
                object_id=oid,
                action="delete",
                before=before,
                after=None,
                reason="Exclusão de produto via API",
            )

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
        Por padrão retorna apenas SKUs ativos.
        ?ativo=false  → somente inativos
        ?ativo=all    → todos
        ?ativo=true   → somente ativos (padrão)
        Mantém filtros existentes (Idproduto, etc).
        """
        qs = super().get_queryset()
        ativo = self.request.query_params.get('ativo')
        if ativo is None or (isinstance(ativo, str) and ativo.lower() in ('true', '1', '')):
            qs = qs.filter(Ativo=True)
        elif isinstance(ativo, str) and ativo.lower() == 'all':
            pass
        else:
            qs = qs.filter(Ativo=False)
        return qs

    # --- AUDITORIA >> create/update/partial_update/destroy ---
    def perform_create(self, serializer):
        instance = serializer.save()
        try:
            write_audit(
                request=self.request,
                model="ProdutoDetalhe",
                object_id=getattr(instance, "Idprodutodetalhe", None),
                verb="create",
                diff={"new": serializer.data},
                note=None,
            )
        except Exception:
            pass

    def perform_update(self, serializer):
        instance = serializer.instance
        before = {
            "CodigodeBarra": getattr(instance, "CodigodeBarra", None),
            "Codigoproduto": getattr(instance, "Codigoproduto", None),
            "Ativo": getattr(instance, "Ativo", None),
        }
        obj = serializer.save()
        after = {
            "CodigodeBarra": getattr(obj, "CodigodeBarra", None),
            "Codigoproduto": getattr(obj, "Codigoproduto", None),
            "Ativo": getattr(obj, "Ativo", None),
        }
        try:
            write_audit(
                request=self.request,
                model="ProdutoDetalhe",
                object_id=getattr(obj, "Idprodutodetalhe", None),
                verb="update",
                diff={"before": before, "after": after},
                note=None,
            )
        except Exception:
            pass

    def partial_update(self, request, *args, **kwargs):
        """
        Mantém o comportamento padrão do DRF e adiciona auditoria.
        Se o campo 'Ativo' mudar, registramos um evento específico (nota humana)
        e também um write_audit genérico.
        """
        instance = self.get_object()
        old_active = bool(getattr(instance, "Ativo", False))
        old_snap = {
            "CodigodeBarra": getattr(instance, "CodigodeBarra", None),
            "Codigoproduto": getattr(instance, "Codigoproduto", None),
            "Ativo": old_active,
        }

        resp = super().partial_update(request, *args, **kwargs)

        try:
            instance.refresh_from_db()
        except Exception:
            return resp

        new_active = bool(getattr(instance, "Ativo", False))
        new_snap = {
            "CodigodeBarra": getattr(instance, "CodigodeBarra", None),
            "Codigoproduto": getattr(instance, "Codigoproduto", None),
            "Ativo": new_active,
        }

        # audit genérico (diff completo)
        try:
            write_audit(
                request=request,
                model="ProdutoDetalhe",
                object_id=getattr(instance, "Idprodutodetalhe", None),
                verb="update",
                diff={"before": old_snap, "after": new_snap},
                note=None,
            )
        except Exception:
            pass

        # nota amigável quando houve mudança de status
        if old_active != new_active:
            try:
                note = f"SKU {'ativado' if new_active else 'inativado'}"
                write_audit(
                    request=request,
                    model="ProdutoDetalhe",
                    object_id=getattr(instance, "Idprodutodetalhe", None),
                    verb="status",
                    diff={"from": old_active, "to": new_active},
                    note=note,
                )
            except Exception:
                pass

        return resp

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        obj_id = getattr(instance, "Idprodutodetalhe", None)
        snap = {
            "CodigodeBarra": getattr(instance, "CodigodeBarra", None),
            "Codigoproduto": getattr(instance, "Codigoproduto", None),
        }
        resp = super().destroy(request, *args, **kwargs)
        try:
            write_audit(
                request=request,
                model="ProdutoDetalhe",
                object_id=obj_id,
                verb="delete",
                diff={"old": snap},
                note=None,
            )
        except Exception:
            pass
        return resp

    # criação em lote de SKUs
    @action(detail=False, methods=['post'], url_path='batch-create')
    def batch_create(self, request):
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

class NatLancamentoViewSet(viewsets.ModelViewSet):
    queryset = Nat_Lancamento.objects.all().order_by('codigo')
    serializer_class = NatLancamentoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    # filtros/ordenacoes coerentes com os campos do modelo
    search_fields = ['codigo', 'descricao', 'categoria_principal', 'subcategoria', 'tipo', 'status', 'tipo_natureza']
    ordering_fields = ['codigo', 'descricao', 'categoria_principal', 'subcategoria', 'tipo', 'status', 'tipo_natureza']
    filterset_fields = ['tipo', 'status', 'tipo_natureza']

class ModeloDocumentoFiscalViewSet(viewsets.ModelViewSet):
    queryset = ModeloDocumentoFiscal.objects.all().order_by('codigo')
    serializer_class = ModeloDocumentoFiscalSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['codigo', 'descricao']
    ordering_fields = ['codigo', 'descricao', 'data_inicial', 'data_final', 'ativo']
    filterset_fields = ['ativo', 'data_inicial', 'data_final']

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




