from django.conf import settings
from django.db import models
from django.utils import timezone


class AuditLog(models.Model):
    ACTION_CHOICES = (
        ("create", "Create"),
        ("update", "Update"),
        ("delete", "Delete"),
        ("custom", "Custom"),
        ("status_change", "Status Change"),
    )

    ts = models.DateTimeField(default=timezone.now, db_index=True)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="audit_logs"
    )
    username_snapshot = models.CharField(max_length=150, null=True, blank=True)

    ip = models.GenericIPAddressField(null=True, blank=True)
    request_id = models.CharField(max_length=64, null=True, blank=True)

    model = models.CharField(max_length=100, db_index=True)
    object_id = models.CharField(max_length=64, db_index=True)

    action = models.CharField(max_length=32, choices=ACTION_CHOICES, default="custom", db_index=True)

    # Mudanças em forma de diff {campo: [antes, depois]} ou snapshot completo
    changes_json = models.JSONField(null=True, blank=True)
    reason = models.TextField(null=True, blank=True)
    extra = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = "audit_log"
        indexes = [
            models.Index(fields=["model", "object_id", "ts"], name="audit_model_obj_ts"),
            models.Index(fields=["user", "ts"], name="audit_user_ts"),
        ]
        ordering = ["-ts"]

    def __str__(self):
        return f"[{self.ts:%Y-%m-%d %H:%M:%S}] {self.model}#{self.object_id} {self.action}"
