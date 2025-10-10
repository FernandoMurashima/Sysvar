from decimal import Decimal
from django.db import transaction
from rest_framework import serializers

from ..models import FormaPagamento, FormaPagamentoParcela


# ==============
# Parcelas
# ==============
class FormaPagamentoParcelaReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormaPagamentoParcela
        fields = [
            "Idformapagparcela",
            "ordem",
            "dias",
            "percentual",
            "valor_fixo",
            "data_cadastro",
        ]
        read_only_fields = ["Idformapagparcela", "data_cadastro"]


class FormaPagamentoParcelaWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormaPagamentoParcela
        fields = ["ordem", "dias", "percentual", "valor_fixo"]

    def validate(self, attrs):
        dias = attrs.get("dias")
        perc = attrs.get("percentual")
        val = attrs.get("valor_fixo")

        if dias is None or dias < 0:
            raise serializers.ValidationError({"dias": "Informe dias >= 0."})

        # Pelo menos um dos dois (> 0)
        perc_dec = Decimal(str(perc or "0"))
        val_dec = Decimal(str(val or "0"))
        if perc_dec <= 0 and val_dec <= 0:
            raise serializers.ValidationError(
                "Preencha Percentual (> 0) ou Valor fixo (> 0)."
            )
        return attrs


# ==============
# Forma de Pagamento (listas e detalhe)
# ==============
class FormaPagamentoListSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormaPagamento
        fields = [
            "Idformapagamento",
            "codigo",
            "descricao",
            "num_parcelas",
            "ativo",
            "data_cadastro",
        ]


class FormaPagamentoDetailSerializer(serializers.ModelSerializer):
    parcelas = FormaPagamentoParcelaReadSerializer(many=True, read_only=True)

    class Meta:
        model = FormaPagamento
        fields = [
            "Idformapagamento",
            "codigo",
            "descricao",
            "num_parcelas",
            "ativo",
            "data_cadastro",
            "parcelas",
        ]
        read_only_fields = ["Idformapagamento", "data_cadastro", "num_parcelas", "parcelas"]


# ==============
# Create/Update com suporte opcional a "parcelas"
# ==============
class FormaPagamentoCreateUpdateSerializer(serializers.ModelSerializer):
    parcelas = FormaPagamentoParcelaWriteSerializer(many=True, required=False)

    class Meta:
        model = FormaPagamento
        fields = ["codigo", "descricao", "ativo", "parcelas"]

    # Utilitário: apaga e recria parcelas; atualiza num_parcelas
    def _upsert_parcelas(self, forma: FormaPagamento, parcelas_data):
        FormaPagamentoParcela.objects.filter(forma=forma).delete()

        linhas = []
        for i, row in enumerate(parcelas_data or [], start=1):
            linhas.append(
                FormaPagamentoParcela(
                    forma=forma,
                    ordem=row.get("ordem") or i,
                    dias=row.get("dias") or 0,
                    percentual=row.get("percentual") or Decimal("0"),
                    valor_fixo=row.get("valor_fixo") or Decimal("0"),
                )
            )
        if linhas:
            FormaPagamentoParcela.objects.bulk_create(linhas)

        forma.num_parcelas = len(linhas) if linhas else 1
        forma.save(update_fields=["num_parcelas"])

    @transaction.atomic
    def create(self, validated_data):
        parcelas = validated_data.pop("parcelas", None)
        forma = FormaPagamento.objects.create(**validated_data)
        if parcelas:
            self._upsert_parcelas(forma, parcelas)
        return forma

    @transaction.atomic
    def update(self, instance, validated_data):
        parcelas = validated_data.pop("parcelas", None)

        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()

        if parcelas is not None:
            self._upsert_parcelas(instance, parcelas)

        return instance
