from django.apps import AppConfig

class SysvarAppConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "sysvar_app"

    def ready(self):
        # Registre sinais aqui sem importar models diretamente.
        try:
            import sysvar_app.signals  # noqa: F401
        except Exception:
            # Se não existirem sinais ainda, tudo bem.
            pass
