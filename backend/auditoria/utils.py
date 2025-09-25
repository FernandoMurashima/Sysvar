from django.conf import settings
from .models import AuditLog

def _get_client_ip(request):
    if not request:
        return None
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        parts = [p.strip() for p in xff.split(',') if p.strip()]
        if parts:
            return parts[0]
    return request.META.get('REMOTE_ADDR')

def write_product_status_change(request, instance, old_status, new_status, reason=None):
    """
    Loga ativação/inativação de Produto incluindo a REFERÊNCIA em colunas próprias.
    """
    ref  = getattr(instance, 'referencia', None)
    desc = getattr(instance, 'Descricao', None)
    pid  = getattr(instance, 'Idproduto', None) or instance.pk

    before = {
        'id': pid,
        'referencia': ref,
        'Descricao': desc,
        'Ativo': bool(old_status),
    }
    after = {
        'id': pid,
        'referencia': ref,
        'Descricao': desc,
        'Ativo': bool(new_status),
    }
    action = 'ativar' if new_status else 'inativar'

    user = getattr(request, 'user', None)
    actor_id = user.id if (user and getattr(user, 'is_authenticated', False)) else None
    actor_name = f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip() or getattr(user, 'username', None)
    actor_email = getattr(user, 'email', None)

    AuditLog.objects.create(
        resource_type='produto',
        resource_id=pid,
        resource_ref=(ref or None),          # <<<<< referência em coluna dedicada
        resource_desc=(desc or None),
        action_name=action,
        reason=(reason or ''),
        actor_user_id=actor_id,
        actor_name=actor_name or None,
        actor_email=actor_email or None,
        ip_address=_get_client_ip(request),
        user_agent=(request.META.get('HTTP_USER_AGENT') if request else None),
        before=before,
        after=after,
        diff={'Ativo': {'from': bool(old_status), 'to': bool(new_status)}},
        extra=None,
    )
