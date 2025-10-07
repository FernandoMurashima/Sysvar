from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AuditLogViewSet, ping

router = DefaultRouter()
router.register(r'logs', AuditLogViewSet, basename='auditlog')

urlpatterns = [
    path('ping/', ping, name='auditoria-ping'),
    path('', include(router.urls)),
]
