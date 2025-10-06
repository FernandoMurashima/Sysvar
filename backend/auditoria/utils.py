from __future__ import annotations
from typing import Any, Dict, Optional, Tuple

from django.db import transaction
from django.utils import timezone

from .models import AuditLog


def _get_client_ip(request) -> Optional[str]:
    if not request:
        return None
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        # pega o primeiro IP
        return xff.split(",")[0].strip() or None
    return request.META.get("REMOTE_ADDR")


def _get_request_id(request) -> Optional[str]:
    if not request:
        return None
    # compat: middleware abaixo injeta X-Request-ID em META
    return request.META.get("HTTP_X_REQUEST_ID") or getattr(request, "request_id", None)


def diff_instances(before, after, *, include_fields: Optional[Tuple[str, ...]] = None) -> Dict[str, Tuple[Any, Any]]:
    """
    Calcula diffs simples (por atributo) entre duas instâncias Django.
    Retorna dict {campo: (antes, depois)} apenas quando valores divergem.
    """
    if not before or not after:
        return {}

    # lista de fields concretos (ignora M2M/similares)
    fields = [f.name for f in before._meta.concrete_fields]
    if include_fields:
        fields = [f for f in fields if f in include_fields]

    changes = {}
    for fname in fields:
        try:
            old = getattr(before, fname)
            new = getattr(after, fname)
        except Exception:
            continue
        # normaliza para tipos básicos
        if hasattr(old, "pk"):
            old = old.pk
        if hasattr(new, "pk"):
            new = new.pk
        if old != new:
            changes[fname] = [old, new]
    return changes


@transaction.atomic
def write_audit(
    *,
    request=None,
    user=None,
    model: str,
    object_id: Any,
    action: str = "custom",
    changes: Optional[Dict[str, Any]] = None,
    reason: Optional[str] = None,
    extra: Optional[Dict[str, Any]] = None,
) -> AuditLog:
    """
    Grava um registro de auditoria resiliente.
    """
    # user / username snapshot
    u = user or (getattr(request, "user", None) if request is not None else None)
    username = None
    if u and getattr(u, "is_authenticated", False):
        username = getattr(u, "username", None)
    else:
        u = None

    ip = _get_client_ip(request)
    req_id = _get_request_id(request)

    log = AuditLog.objects.create(
        ts=timezone.now(),
        user=u,
        username_snapshot=username,
        ip=ip,
        request_id=req_id,
        model=str(model),
        object_id=str(object_id),
        action=action,
        changes_json=changes or None,
        reason=(reason or None),
        extra=extra or None,
    )
    return log


# ---------- Wrapper de compatibilidade com seu código atual ----------
def write_product_status_change(*, request, instance, old_status: bool, new_status: bool, reason: Optional[str] = None):
    """
    Compatível com o import existente: from auditoria.utils import write_product_status_change
    Loga uma mudança de status (produto) como 'status_change' com diff do campo Ativo.
    """
    return write_audit(
        request=request,
        model=instance.__class__.__name__,
        object_id=getattr(instance, instance._meta.pk.name, None),
        action="status_change",
        changes={"Ativo": [bool(old_status), bool(new_status)]},
        reason=reason or None,
        extra={
            "referencia": getattr(instance, "referencia", None),
            "descricao": getattr(instance, "Descricao", None),
        },
    )
