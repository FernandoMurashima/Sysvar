from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .forma_pagamentos_views import FormaPagamentoViewSet

router = DefaultRouter()
router.register(r"forma-pagamentos", FormaPagamentoViewSet, basename="forma-pagamentos")

urlpatterns = [
    path("", include(router.urls)),
]
