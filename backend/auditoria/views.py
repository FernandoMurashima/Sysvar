from django.db.models import Q
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditoriaLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Leitura de logs de auditoria com filtros via querystring:
      ?model=Produto
      &object_id=13
      &action=status_change|create|update|delete|custom
      &search=texto   (procura em reason e extra)
      &ordering=-ts   (opcional; default já ordena por -ts,-id)
      &page=1&page_size=20 (se paginação DRF estiver ativa)

    Extra:
      POST /auditoria-logs/test-create/  -> cria um log de teste
    """
    queryset = AuditLog.objects.all().order_by('-ts', '-id')
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        p = self.request.query_params

        model = (p.get('model') or '').strip()
        if model:
            qs = qs.filter(model__iexact=model)

        object_id = (p.get('object_id') or '').strip()
        if object_id:
            qs = qs.filter(object_id=object_id)

        action = (p.get('action') or '').strip()
        if action:
            qs = qs.filter(action=action)

        search = (p.get('search') or '').strip()
        if search:
            qs = qs.filter(Q(reason__icontains=search) | Q(extra__icontains=search))

        ordering = (p.get('ordering') or '').strip()
        if ordering:
            qs = qs.order_by(ordering)

        return qs

    @action(detail=False, methods=['post'], url_path='test-create')
    def test_create(self, request):
        """
        Cria um log de auditoria simples para validação de escrita.
        """
        user = request.user if request.user.is_authenticated else None
        username_snapshot = None
        if user:
            username_snapshot = (user.get_full_name() or user.username or '').strip() or user.username

        log = AuditLog.objects.create(
            user=user,
            username_snapshot=username_snapshot,
            ip=request.META.get('REMOTE_ADDR'),
            request_id=getattr(request, 'request_id', None),
            model='Teste',
            object_id='0',
            action='custom',
            reason='Teste de escrita via API',
            changes_json={'msg': 'ok'},
            extra={},
        )
        return Response({'id': log.id})
