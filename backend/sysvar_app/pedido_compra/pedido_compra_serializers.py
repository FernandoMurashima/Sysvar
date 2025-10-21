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
    ProdutoDetalhe,
    Pack,
)

ZERO = Decimal("0")
UM = Decimal("1")


def _safe_dec(v, default=ZERO):
    if v is None:
        return default
    if isinstance(v, (int, float, str)):
        return Decimal(str(v))
    return v


# =========================
# Mapeamento flexível de códigos
# =========================
PEDIDO_REV_VALUES = {"revenda", "rev", "r", "v"}
PEDIDO_CON_VALUES = {"consumo", "uso/consumo", "cons", "c", "u"}

PROD_REV_VALUES = {"R", "V", "1", "REV", "REVENDA"}
PROD_CON_VALUES = {"C", "U", "2", "CON", "CONSUMO"}


def _norm_pedido_tipo(v: str) -> str:
    return (v or "").strip().lower()


def _norm_prod_tipo(v: str) -> str:
    return (v or "").strip().upper()


class PedidoCompraListSerializer(serializers.ModelSerializer):
    fornecedor_nome = serializers.CharField(source="Idfornecedor.Nome_fornecedor", read_only=True)
    loja_nome = serializers.CharField(source="Idloja.nome_loja", read_only=True)
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
            "condicao_pagamento",
            "condicao_pagamento_detalhe",
            "parcelas",
            "tipo_pedido",
            "tipo_pedido_display",
            "fornecedor_nome",
            "loja_nome",
        ]


class PedidoCompraItemSerializer(serializers.ModelSerializer):
    produto_desc = serializers.CharField(source="Idproduto.Descricao", read_only=True)
    # pack
    pack = serializers.PrimaryKeyRelatedField(queryset=Pack.objects.all(), required=False, allow_null=True)
    n_packs = serializers.IntegerField(required=False, allow_null=True)
    qtd_total_pack = serializers.IntegerField(required=False, allow_null=True, read_only=True)

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
            "pack",
            "n_packs",
            "qtd_total_pack",
            "data_entrega_prevista",
        ]
        read_only_fields = ["Total_item", "data_cadastro", "qtd_total_pack"]

    # ---- validações básicas
    def validate_Qtp_pc(self, v):
        if v is None:
            return v
        if v <= 0:
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

    # ---- helpers
    def _calc_total(self, q, pu, desc):
        q = _safe_dec(q or ZERO)
        pu = _safe_dec(pu or ZERO)
        desc = _safe_dec(desc or ZERO)
        total = q * pu - desc
        return total if total > ZERO else ZERO

    def _refresh_header_total(self, pedido_id):
        total = (
            PedidoCompraItem.objects.filter(Idpedidocompra_id=pedido_id)
            .aggregate(s=Sum(F("Qtp_pc") * F("valorunitario") - F("Desconto")))["s"] or ZERO
        )
        PedidoCompra.objects.filter(pk=pedido_id).update(Valorpedido=total)

    def _calc_pack_qty(self, pack_obj: Pack, n_packs: int) -> int:
        if not pack_obj or not n_packs:
            return 0
        soma_pack = sum(pi.qtd for pi in pack_obj.itens.all())
        return int(soma_pack) * int(n_packs)

    def _validar_tipo_produto_vs_pedido(self, pedido: PedidoCompra, produto: Produto):
        """
        - Pedido 'revenda' => Produto em PROD_REV_VALUES
        - Pedido 'consumo' => Produto em PROD_CON_VALUES
        """
        tipo_pc = _norm_pedido_tipo(pedido.tipo_pedido)
        tipo_prod = _norm_prod_tipo(produto.Tipoproduto)

        if tipo_pc in PEDIDO_REV_VALUES:
            if tipo_prod not in PROD_REV_VALUES:
                raise serializers.ValidationError(
                    {"Idproduto": f"Produto incompatível com pedido REV. Tipoproduto='{produto.Tipoproduto}'"}
                )
        elif tipo_pc in PEDIDO_CON_VALUES:
            if tipo_prod not in PROD_CON_VALUES:
                raise serializers.ValidationError(
                    {"Idproduto": f"Produto incompatível com pedido CONSUMO. Tipoproduto='{produto.Tipoproduto}'"}
                )
        # se vier vazio/desconhecido, consideramos inválido
        else:
            raise serializers.ValidationError({"Idpedidocompra": "tipo_pedido inválido no cabeçalho do pedido."})

    # ---- validação cruzada
    def validate(self, attrs):
        pedido = attrs.get("Idpedidocompra") or getattr(self.instance, "Idpedidocompra", None)
        if not isinstance(pedido, PedidoCompra) and pedido:
            try:
                pedido = PedidoCompra.objects.get(pk=pedido)
                attrs["Idpedidocompra"] = pedido
            except PedidoCompra.DoesNotExist:
                raise serializers.ValidationError({"Idpedidocompra": "Pedido não encontrado."})

        prod = attrs.get("Idproduto") or getattr(self.instance, "Idproduto", None)
        if not isinstance(prod, Produto) and prod:
            try:
                prod = Produto.objects.get(pk=prod)
                attrs["Idproduto"] = prod
            except Produto.DoesNotExist:
                raise serializers.ValidationError({"Idproduto": "Produto não encontrado."})

        if prod and hasattr(prod, "Ativo") and prod.Ativo is False:
            raise serializers.ValidationError({"Idproduto": "Produto inativo."})

        if pedido and prod:
            self._validar_tipo_produto_vs_pedido(pedido, prod)

        # SKU pertence ao produto (se informado)
        sku = attrs.get("Idprodutodetalhe", getattr(self.instance, "Idprodutodetalhe", None))
        if sku and prod and getattr(sku, "Idproduto_id", None) and sku.Idproduto_id != prod.Idproduto:
            raise serializers.ValidationError({"Idprodutodetalhe": "SKU não pertence ao Produto informado."})

        # Desconto não pode exceder o bruto
        q = attrs.get("Qtp_pc", getattr(self.instance, "Qtp_pc", None))
        pu = _safe_dec(attrs.get("valorunitario", getattr(self.instance, "valorunitario", None)))
        desc = _safe_dec(attrs.get("Desconto", getattr(self.instance, "Desconto", ZERO)))
        bruto = _safe_dec(q) * _safe_dec(pu)
        if desc > bruto:
            raise serializers.ValidationError({"Desconto": "Desconto não pode exceder o total bruto do item."})

        return attrs

    # ---- create/update com pack
    @transaction.atomic
    def create(self, validated_data):
        pack_obj = validated_data.get("pack", None)
        n_packs = validated_data.get("n_packs", None)
        if pack_obj and n_packs:
            qty = self._calc_pack_qty(pack_obj, n_packs)
            validated_data["Qtp_pc"] = qty
            validated_data["qtd_total_pack"] = qty

        q = validated_data.get("Qtp_pc")
        pu = validated_data.get("valorunitario")
        desc = validated_data.get("Desconto") or ZERO
        validated_data["Total_item"] = self._calc_total(q, pu, desc)

        obj = super().create(validated_data)
        self._refresh_header_total(obj.Idpedidocompra_id)
        return obj

    @transaction.atomic
    def update(self, instance, validated_data):
        pack_obj = validated_data.get("pack", getattr(instance, "pack", None))
        n_packs = validated_data.get("n_packs", getattr(instance, "n_packs", None))
        if pack_obj and n_packs:
            qty = self._calc_pack_qty(pack_obj, n_packs)
            validated_data["Qtp_pc"] = qty
            validated_data["qtd_total_pack"] = qty

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
            "data_entrega",
            "quantidade_prevista",
            "observacao",
            "data_cadastro",
        ]
        read_only_fields = ["data_cadastro"]

    def validate_quantidade_prevista(self, v):
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

        qtd_nova = _safe_dec(attrs.get("quantidade_prevista", getattr(self.instance, "quantidade_prevista", ZERO)))

        qs = PedidoCompraEntrega.objects.filter(pedido=pedido)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        soma_atual = _safe_dec(qs.aggregate(s=Sum("quantidade_prevista"))["s"], ZERO)

        qtd_pedida = _safe_dec(
            PedidoCompraItem.objects.filter(Idpedidocompra=pedido)
            .aggregate(s=Sum("Qtp_pc"))["s"],
            ZERO,
        )

        toler = _safe_dec(pedido.tolerancia_qtd_percent or ZERO) / Decimal("100")
        limite = qtd_pedida * (UM + toler)

        if qtd_pedida > ZERO and soma_atual + qtd_nova > limite:
            raise serializers.ValidationError(
                {"quantidade_prevista": f"Soma programada ({soma_atual + qtd_nova}) excede o limite permitido ({limite})."}
            )

        return attrs


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
    parcelas = PedidoCompraParcelaSerializer(source="parcelas_rel", many=True, read_only=True)
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
            "condicao_pagamento",
            "condicao_pagamento_detalhe",
            "parcelas",
            "tipo_pedido",
            "tipo_pedido_display",
            "tolerancia_qtd_percent",
            "tolerancia_preco_percent",
            "fornecedor_nome",
            "loja_nome",
            "itens",
            "entregas",
        ]
        read_only_fields = ["Valorpedido", "Documento"]

    @transaction.atomic
    def create(self, validated_data):
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
