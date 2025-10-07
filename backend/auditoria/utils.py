# auditoria/utils.py
from typing import Any, Dict
from django.utils import timezone
from django.forms.models import model_to_dict
from .models import AuditLog

AUDIT_SAFE_KEYS = {"HTTP_X_FORWARDED_FOR", "REMOTE_ADDR"}

def _get_client_ip(request) -> str | None:
    xfwd = request.META.get("HTTP_X_FORWARDED_FOR")
    if xfwd:
        return xfwd.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")

def _build_diff(before: Dict[str, Any], after: Dict[str, Any]) -> Dict[str, list]:
    diff = {}
    for k in after.keys() | before.keys():
        if before.get(k) != after.get(k):
            diff[k] = [before.get(k), after.get(k)]
    return diff

def snapshot_instance(instance) -> Dict[str, Any]:
    data = model_to_dict(instance)
    # normalizações simples para JSON
    for k, v in list(data.items()):
        if hasattr(v, "isoformat"):
            data[k] = v.isoformat()
    return data

def write_audit(
    *,
    request,
    model_name: str,
    object_id: str,
    action: str,
    before: Dict[str, Any] | None = None,
    after: Dict[str, Any] | None = None,
    reason: str | None = None,
    extra: Dict[str, Any] | None = None,
):
    user = getattr(request, "user", None)
    username_snapshot = (user.get_full_name() if user and user.is_authenticated else None) or (user.username if user and user.is_authenticated else None)

    changes = None
    if before is not None or after is not None:
        changes = _build_diff(before or {}, after or {})

    return AuditLog.objects.create(
        ts=timezone.now(),
        user=user if (user and user.is_authenticated) else None,
        username_snapshot=username_snapshot,
        ip=_get_client_ip(request),
        request_id=getattr(request, "request_id", None) or request.META.get("HTTP_X_REQUEST_ID"),
        model=model_name,
        object_id=str(object_id),
        action=action,
        changes_json=changes,
        reason=reason or "",
        extra=extra or {},
    )
