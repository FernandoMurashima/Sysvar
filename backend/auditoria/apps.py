from django.apps import AppConfig

class AuditoriaConfig(AppConfig):
    name = "auditoria"
    verbose_name = "Auditoria"

    def ready(self):
        # ponto de extensão futuro (sinais, etc.)
        pass
