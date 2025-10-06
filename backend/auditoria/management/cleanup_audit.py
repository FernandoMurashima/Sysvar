from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from auditoria.models import AuditLog

class Command(BaseCommand):
    help = "Remove registros de auditoria mais antigos que N dias (padrão: 365)."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=365)

    def handle(self, *args, **opts):
        days = int(opts["days"])
        cutoff = timezone.now() - timedelta(days=days)
        qs = AuditLog.objects.filter(ts__lt=cutoff)
        count = qs.count()
        qs.delete()
        self.stdout.write(self.style.SUCCESS(f"Removidos {count} registros anteriores a {days} dias."))
