# auditoria/admin.py
from django.contrib import admin
from .models import AuditLog

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'resource_type',
        'resource_id',
        'resource_ref',
        'action_name',
        'actor_display',
        'ip_address',
        'created_at',
    )
    list_display_links = ('id', 'resource_ref')
    list_filter = ('resource_type', 'action_name', 'actor_user', 'created_at')
    search_fields = (
        'resource_ref',
        'resource_desc',
        'reason',
        'actor_name',
        'actor_email',
        'ip_address',
        'user_agent',
    )
    readonly_fields = (
        'resource_type',
        'resource_id',
        'resource_ref',
        'resource_desc',
        'action_name',
        'reason',
        'actor_user',
        'actor_name',
        'actor_email',
        'ip_address',
        'user_agent',
        'request_id',
        'before',
        'after',
        'diff',
        'extra',
        'created_at',
    )
    ordering = ('-created_at',)
    date_hierarchy = 'created_at'

    def actor_display(self, obj):
        if obj.actor_name:
            return obj.actor_name
        return obj.actor_user.username if obj.actor_user else ''
    actor_display.short_description = 'Ator'
