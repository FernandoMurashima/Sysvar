from django.db import models
from django.conf import settings

class AuditLog(models.Model):
    resource_type = models.CharField(max_length=64, blank=True, default='')   # << aqui
    resource_id   = models.BigIntegerField()
    resource_ref  = models.CharField(max_length=64, blank=True, null=True)
    resource_desc = models.CharField(max_length=255, blank=True, null=True)

    action_name = models.CharField(max_length=64, blank=True, default='')     # << e aqui
    reason      = models.CharField(max_length=255, blank=True, null=True)

    actor_user  = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    actor_name  = models.CharField(max_length=150, blank=True, null=True)
    actor_email = models.CharField(max_length=254, blank=True, null=True)
    ip_address  = models.GenericIPAddressField(null=True, blank=True)         # << manter esse nome/campo
    user_agent  = models.TextField(blank=True, null=True)
    request_id  = models.CharField(max_length=64, blank=True, null=True)

    before = models.JSONField(null=True, blank=True)
    after  = models.JSONField(null=True, blank=True)
    diff   = models.JSONField(null=True, blank=True)
    extra  = models.JSONField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)


    class Meta:
        db_table = 'audit_log'
        indexes = [
            models.Index(fields=['resource_type', 'resource_id', 'created_at'],  name='idx_audit_rt_rid_dt'),
            models.Index(fields=['resource_type', 'resource_ref', 'created_at'], name='idx_audit_rt_rref_dt'),
            models.Index(fields=['action_name', 'created_at'],                   name='idx_audit_action_dt'),
        ]

    def __str__(self):
        return f"[{self.created_at:%Y-%m-%d %H:%M:%S}] {self.resource_type}#{self.resource_id} {self.action_name}"
