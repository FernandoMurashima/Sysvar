from rest_framework import serializers
from .models import AuditLog

class AuditLogSerializer(serializers.ModelSerializer):
    user_display = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            'id', 'ts', 'user', 'user_display', 'username_snapshot',
            'ip', 'request_id', 'model', 'object_id', 'action',
            'changes_json', 'reason', 'extra',
        ]

    def get_user_display(self, obj):
        u = getattr(obj, 'user', None)
        if not u:
            return None
        name = (u.get_full_name() or u.username or '').strip()
        return name or u.username
