from typing import List
from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from ..models import FormaPagamento, FormaPagamentoParcela
from .forma_pagamentos_serializers import (
    FormaPagamentoListSerializer,
    FormaPagamentoDetailSerializer,
    FormaPagamentoCreateUpdateSerializer,
    FormaPagamentoParcelaWriteSerializer,
)


class FormaPagamentoViewSet(viewsets.ModelViewSet):
    """
    CRUD de Formas de Pagamento.
    - POST /api/forma-pagamentos/ (cria apenas o cabeçalho; opcional: já pode mandar 'parcelas')
    - GET  /api/forma-pagamentos/?search=&ordering=
    - GET  /api/forma-pagamentos/{id}/ (inclui 'parcelas' no detalhe)
    - PATCH/PUT /api/forma-pagamentos/{id}/ (pode também substituir todas as 'parcelas' se enviadas)
    - DELETE /api/forma-pagamentos/{id}/
    - PUT /api/forma-pagamentos/{id}/parcelas/ (apaga e recria parcelas do {id})
    """
    permission_classes = [IsAuthenticated]
    queryset = FormaPagamento.objects.all().order_by("descricao")
    filterset_fields = []
    search_fields = ["codigo", "descricao"]
    ordering_fields = ["descricao", "codigo", "num_parcelas", "ativo", "data_cadastro"]
    ordering = ["descricao"]

    def get_serializer_class(self):
        if self.action in ("list",):
            return FormaPagamentoListSerializer
        if self.action in ("create", "update", "partial_update"):
            return FormaPagamentoCreateUpdateSerializer
        # retrieve
        return FormaPagamentoDetailSerializer

    # Endpoint explícito para salvar/atualizar as parcelas (apaga e recria)
    @action(detail=True, methods=["put"], url_path="parcelas")
    @transaction.atomic
    def parcelas(self, request, pk=None):
        try:
            forma = self.get_queryset().get(pk=pk)
        except FormaPagamento.DoesNotExist:
            return Response({"detail": "Não encontrado."}, status=status.HTTP_404_NOT_FOUND)

        if not isinstance(request.data, list):
            return Response(
                {"detail": "Envie uma lista (array) de parcelas."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # valida cada item com o serializer de escrita
        items = request.data
        ser_list: List[FormaPagamentoParcelaWriteSerializer] = []
        for row in items:
            s = FormaPagamentoParcelaWriteSerializer(data=row)
            s.is_valid(raise_exception=True)
            ser_list.append(s)

        # apaga e recria
        FormaPagamentoParcela.objects.filter(forma=forma).delete()

        novas = []
        for i, s in enumerate(ser_list, start=1):
            data = s.validated_data
            novas.append(
                FormaPagamentoParcela(
                    forma=forma,
                    ordem=data.get("ordem") or i,
                    dias=data.get("dias") or 0,
                    percentual=data.get("percentual") or 0,
                    valor_fixo=data.get("valor_fixo") or 0,
                )
            )
        if novas:
            FormaPagamentoParcela.objects.bulk_create(novas)

        # atualiza num_parcelas e devolve detalhe
        forma.num_parcelas = len(novas) if novas else 1
        forma.save(update_fields=["num_parcelas"])

        detail = FormaPagamentoDetailSerializer(instance=forma, context={"request": request})
        return Response(detail.data, status=status.HTTP_200_OK)
