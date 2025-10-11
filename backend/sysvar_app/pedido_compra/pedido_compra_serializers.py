# sysvar_app/pedido_compra/pedido_compra_serializers.py

from decimal import Decimal
from django.db import transaction
from django.db.models import Sum, F
from rest_framework import serializers

from ..models import (
    PedidoCompra,
    PedidoCompraItem,
    PedidoCompraEntrega,
    Produto,
    PedidoCompraParcela,
)

ZERO = Decimal("0")
UM = Decimal("1")


def _safe_dec(v, default=ZERO):
    if v is None:
        return default
    if isinstance(v, (int, float, str)):
        return Decimal(str(v))
    return v


class PedidoCompraListSerializer(serializers.ModelSerializer):
    fornecedor_nome = serializers.CharField(source="Idfornecedor.Nome_fornecedor", read_only=True)
    loja_nome = serializers.CharField(source="Idloja.nome_loja", read_only=True)
    # legenda do choice (somente leitura)
    tipo_pedido_display = serializers.CharField(source="get_tipo_pedido_display", read_only=True)

    class Meta:
        model = PedidoCompra
        fields = [
            "Idpedidocompra",
            "Documento",
            "Datapedido",
            "Dataentrega",
            "Status",
            "Valorpedido",
            # ⬇️ formas de pagamento (lista – read/write conforme modelo)
            "condicao_pagamento",
            "condicao_pagamento_detalhe",
            "parcelas",
            "tipo_pedido",          # <— adicionado
            "tipo_pedido_display",  # <— adicionado
            "fornecedor_nome",
            "loja_nome",
        ]


class PedidoCompraItemSerializer(serializers.ModelSerializer):
    produto_desc = serializers.CharField(source="Idproduto.Descricao", read_only=True)

    class Meta:
        model = PedidoCompraItem
        fields = [
            "Idpedidocompraitem",
            "Idpedidocompra",
            "Idproduto",
            "produto_desc",
            "Qtp_pc",
            "valorunitario",
            "Desconto",
            "Total_item",
            "Qtd_recebida",
            "unid_compra",
            "fator_conv",
            "Idprodutodetalhe",
            "data_cadastro",
        ]
        read_only_fields = ["Total_item", "data_cadastro"]

    def validate_Qtp_pc(self, v):
        if v is None or v <= 0:
            raise serializers.ValidationError("Quantidade deve ser > 0.")
        return v

    def validate_valorunitario(self, v):
        if _safe_dec(v) < ZERO:
            raise serializers.ValidationError("Preço unitário não pode ser negativo.")
        return v

    def validate_Desconto(self, v):
        if v is None:
            return ZERO
        if _safe_dec(v) < ZERO:
            raise serializers.ValidationError("Desconto não pode ser negativo.")
        return v

    def validate_fator_conv(self, v):
        if _safe_dec(v, UM) <= ZERO:
            raise serializers.ValidationError("Fator de conversão deve ser > 0.")
        return v

    def validate(self, attrs):
        prod = attrs.get("Idproduto") or getattr(self.instance, "Idproduto", None)
        if not isinstance(prod, Produto):
            if prod is None and self.initial_data.get("Idproduto"):
                try:
                    prod = Produto.objects.get(pk=self.initial_data.get("Idproduto"))
                    attrs["Idproduto"] = prod
                except Produto.DoesNotExist:
                    raise serializers.ValidationError({"Idproduto": "Produto não encontrado."})

        if prod and hasattr(prod, "Ativo") and prod.Ativo is False:
            raise serializers.ValidationError({"Idproduto": "Produto inativo."})

        q = attrs.get("Qtp_pc", getattr(self.instance, "Qtp_pc", None))
        pu = _safe_dec(attrs.get("valorunitario", getattr(self.instance, "valorunitario", None)))
        desc = _safe_dec(attrs.get("Desconto", getattr(self.instance, "Desconto", ZERO)))
        bruto = _safe_dec(q) * _safe_dec(pu)

        if desc > bruto:
            raise serializers.ValidationError({"Desconto": "Desconto não pode exceder o total bruto do item."})

        sku = attrs.get("Idprodutodetalhe", getattr(self.instance, "Idprodutodetalhe", None))
        if sku and prod and getattr(sku, "Idproduto_id", None) and sku.Idproduto_id != prod.Idproduto:
            raise serializers.ValidationError({"Idprodutodetalhe": "SKU não pertence ao Produto informado."})

        return attrs

    def _calc_total(self, q, pu, desc):
        q = _safe_dec(q)
        pu = _safe_dec(pu)
        desc = _safe_dec(desc)
        total = q * pu - desc
        return total if total > ZERO else ZERO

    def _refresh_header_total(self, pedido_id):
        total = (
            PedidoCompraItem.objects.filter(Idpedidocompra_id=pedido_id)
            .aggregate(s=Sum(F("Qtp_pc") * F("valorunitario") - F("Desconto")))["s"] or ZERO
        )
        PedidoCompra.objects.filter(pk=pedido_id).update(Valorpedido=total)

    @transaction.atomic
    def create(self, validated_data):
        q = validated_data["Qtp_pc"]
        pu = validated_data["valorunitario"]
        desc = validated_data.get("Desconto") or ZERO
        validated_data["Total_item"] = self._calc_total(q, pu, desc)
        obj = super().create(validated_data)
        self._refresh_header_total(obj.Idpedidocompra_id)
        return obj

    @transaction.atomic
    def update(self, instance, validated_data):
        q = validated_data.get("Qtp_pc", instance.Qtp_pc)
        pu = validated_data.get("valorunitario", instance.valorunitario)
        desc = validated_data.get("Desconto", instance.Desconto or ZERO)
        validated_data["Total_item"] = self._calc_total(q, pu, desc)
        obj = super().update(instance, validated_data)
        self._refresh_header_total(obj.Idpedidocompra_id)
        return obj


class PedidoCompraEntregaSerializer(serializers.ModelSerializer):
    class Meta:
        model = PedidoCompraEntrega
        fields = [
            "Idpc_entrega",
            "pedido",
            "parcela",
            "data_entrega",
            "quantidade",
            "valor_previsto",
            "observacao",
            "data_cadastro",
        ]
        read_only_fields = ["data_cadastro"]

    def validate_quantidade(self, v):
        if _safe_dec(v) <= ZERO:
            raise serializers.ValidationError("Quantidade programada deve ser > 0.")
        return v

    def validate(self, attrs):
        from ..models import PedidoCompraItem  # evitar ciclos

        pedido = attrs.get("pedido") or getattr(self.instance, "pedido", None)
        if not pedido:
            raise serializers.ValidationError({"pedido": "Pedido obrigatório."})

        d_ent = attrs.get("data_entrega", getattr(self.instance, "data_entrega", None))
        if pedido.Datapedido and d_ent and d_ent < pedido.Datapedido:
            raise serializers.ValidationError({"data_entrega": "Data de entrega não pode ser anterior à data do pedido."})

        qtd_nova = _safe_dec(attrs.get("quantidade", getattr(self.instance, "quantidade", ZERO)))

        qs = PedidoCompraEntrega.objects.filter(pedido=pedido)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        soma_atual = _safe_dec(qs.aggregate(s=Sum("quantidade"))["s"], ZERO)

        qtd_pedida = _safe_dec(
            PedidoCompraItem.objects.filter(Idpedidocompra=pedido)
            .aggregate(s=Sum("Qtp_pc"))["s"],
            ZERO,
        )

        toler = _safe_dec(pedido.tolerancia_qtd_percent or ZERO) / Decimal("100")
        limite = qtd_pedida * (UM + toler)

        if qtd_pedida > ZERO and soma_atual + qtd_nova > limite:
            raise serializers.ValidationError(
                {"quantidade": f"Soma programada ({soma_atual + qtd_nova}) excede o limite permitido ({limite})."}
            )

        return attrs


# --- NOVO: Serializer para as parcelas do pedido ---
class PedidoCompraParcelaSerializer(serializers.ModelSerializer):
    class Meta:
        model = PedidoCompraParcela
        fields = [
            "Idpc_parcela",
            "pedido",
            "parcela",
            "prazo_dias",
            "vencimento",
            "valor",
            "forma",
            "observacao",
            "data_cadastro",
        ]
        read_only_fields = ["Idpc_parcela", "pedido", "data_cadastro"]


class PedidoCompraDetailSerializer(serializers.ModelSerializer):
    fornecedor_nome = serializers.CharField(source="Idfornecedor.Nome_fornecedor", read_only=True)
    loja_nome = serializers.CharField(source="Idloja.nome_loja", read_only=True)
    itens = PedidoCompraItemSerializer(source="pedidocompraitem_set", many=True, read_only=True)
    entregas = PedidoCompraEntregaSerializer(many=True, read_only=True)
    # NOVO: expõe as parcelas geradas para este pedido
    parcelas = PedidoCompraParcelaSerializer(source="parcelas_rel", many=True, read_only=True)
    # legenda do choice (somente leitura)
    tipo_pedido_display = serializers.CharField(source="get_tipo_pedido_display", read_only=True)

    class Meta:
        model = PedidoCompra
        fields = [
            "Idpedidocompra",
            "Documento",
            "Datapedido",
            "Dataentrega",
            "Status",
            "Valorpedido",
            "Idfornecedor",
            "Idloja",
            # ⬇️ formas de pagamento (detalhe – read/write conforme modelo)
            "condicao_pagamento",
            "condicao_pagamento_detalhe",
            "parcelas",                  # ⬅️ NOVO (lista detalhada)
            "tipo_pedido",               # <— gravável
            "tipo_pedido_display",       # <— read-only
            "tolerancia_qtd_percent",
            "tolerancia_preco_percent",
            "fornecedor_nome",
            "loja_nome",
            "itens",
            "entregas",
        ]
        # Não exigir no POST
        read_only_fields = ["Valorpedido", "Documento"]

    @transaction.atomic
    def create(self, validated_data):
        # Garante NOT NULL no banco
        if validated_data.get("Valorpedido") is None:
            validated_data["Valorpedido"] = ZERO
        return super().create(validated_data)

    def _recalc_valorpedido(self, pedido: PedidoCompra):
        total = (
            PedidoCompraItem.objects.filter(Idpedidocompra=pedido)
            .aggregate(s=Sum(F("Qtp_pc") * F("valorunitario") - F("Desconto")))["s"] or ZERO
        )
        if pedido.Valorpedido != total:
            PedidoCompra.objects.filter(pk=pedido.pk).update(Valorpedido=total)

    @transaction.atomic
    def update(self, instance, validated_data):
        obj = super().update(instance, validated_data)
        self._recalc_valorpedido(obj)
        return obj
