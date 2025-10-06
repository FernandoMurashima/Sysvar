from django.contrib import admin
from .models import AuditLog

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("ts", "model", "object_id", "action", "username_snapshot", "ip")
    list_filter = ("model", "action", "ts")
    search_fields = ("model", "object_id", "username_snapshot", "reason", "request_id")
    readonly_fields = ("ts", "user", "username_snapshot", "ip", "request_id", "model", "object_id", "action", "changes_json", "reason", "extra")
