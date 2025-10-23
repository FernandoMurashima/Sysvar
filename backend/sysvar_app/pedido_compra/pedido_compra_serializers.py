# sysvar_app/pedido_compra/pedido_compra_serializers.py

from decimal import Decimal, ROUND_HALF_UP
from django.db import transaction
from django.db.models import Sum, F
from django.utils import timezone
from rest_framework import serializers

from ..models import (
    PedidoCompra,
    PedidoCompraItem,
    PedidoCompraEntrega,
    Produto,
    PedidoCompraParcela,
    FormaPagamento,
    FormaPagamentoParcela,
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
            "pack",
            "n_packs",
            "qtd_total_pack",
            "data_cadastro",
        ]
        read_only_fields = ["Total_item", "qtd_total_pack", "data_cadastro"]
        # Em REVENDA o servidor calcula Qtp_pc
        extra_kwargs = {"Qtp_pc": {"required": False}}

    # ---------------------------
    # VALIDATIONS
    # ---------------------------
    def _assert_pedido_aberto(self, pedido: PedidoCompra):
        """Bloqueia criação/edição de item se o pedido não estiver AB (Aberto)."""
        if not pedido:
            raise serializers.ValidationError({"Idpedidocompra": "Pedido obrigatório."})
        if pedido.Status and pedido.Status != PedidoCompra.StatusChoices.AB:
            raise serializers.ValidationError(
                {"Idpedidocompra": f"Pedido em estado '{pedido.Status}': edição de itens bloqueada."}
            )

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

        pedido = attrs.get("Idpedidocompra") or getattr(self.instance, "Idpedidocompra", None)

        # 🔒 Lock por status
        if pedido:
            self._assert_pedido_aberto(pedido)

        # --- Regra revenda/consumo + obrigatoriedades
        if pedido and prod:
            # ATENÇÃO: Tipoproduto = '1' revenda | '2' consumo
            tipo_prod = (prod.Tipoproduto or "").strip()
            tipo_ped = (pedido.tipo_pedido or "").strip().lower()

            if tipo_ped == PedidoCompra.TipoPedido.REVENDA and tipo_prod != "1":
                raise serializers.ValidationError({"Idproduto": "Somente produtos de REVenda neste pedido."})
            if tipo_ped == PedidoCompra.TipoPedido.CONSUMO and tipo_prod != "2":
                raise serializers.ValidationError({"Idproduto": "Somente produtos de USO/CONSUMO neste pedido."})

            if tipo_ped == PedidoCompra.TipoPedido.REVENDA:
                pack = attrs.get("pack", getattr(self.instance, "pack", None))
                n_packs = attrs.get("n_packs", getattr(self.instance, "n_packs", None))
                if not pack:
                    raise serializers.ValidationError({"pack": "Pack é obrigatório para pedido de revenda."})
                if not n_packs or int(n_packs) <= 0:
                    raise serializers.ValidationError({"n_packs": "Número de packs deve ser > 0 para revenda."})
            else:
                q_in = attrs.get("Qtp_pc", getattr(self.instance, "Qtp_pc", None))
                if q_in is None or int(q_in) <= 0:
                    raise serializers.ValidationError({"Qtp_pc": "Quantidade é obrigatória para uso/consumo."})

        # Desconto x bruto (se houver dados)
        q = attrs.get("Qtp_pc", getattr(self.instance, "Qtp_pc", 0)) or 0
        pu = _safe_dec(attrs.get("valorunitario", getattr(self.instance, "valorunitario", ZERO)))
        desc = _safe_dec(attrs.get("Desconto", getattr(self.instance, "Desconto", ZERO)))
        bruto = _safe_dec(q) * _safe_dec(pu)
        if desc > bruto and bruto > ZERO:
            raise serializers.ValidationError({"Desconto": "Desconto não pode exceder o total bruto do item."})

        # SKU pertence ao produto
        sku = attrs.get("Idprodutodetalhe", getattr(self.instance, "Idprodutodetalhe", None))
        if sku and prod and getattr(sku, "Idproduto_id", None) and sku.Idproduto_id != prod.Idproduto:
            raise serializers.ValidationError({"Idprodutodetalhe": "SKU não pertence ao Produto informado."})

        return attrs

    # ---------------------------
    # CÁLCULOS + PARCELAS AUTO
    # ---------------------------
    def _quantize(self, v: Decimal) -> Decimal:
        return (v or ZERO).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    def _calc_total(self, q, pu, desc):
        q = _safe_dec(q)
        pu = _safe_dec(pu)
        desc = _safe_dec(desc)
        total = q * pu - desc
        return total if total > ZERO else ZERO

    def _calc_qty_from_pack(self, pack, n_packs: int) -> int:
        if not pack or not n_packs:
            return None
        soma_pack = sum(pi.qtd for pi in pack.itens.all())
        return int(soma_pack) * int(n_packs)

    def _regen_parcelas_if_needed(self, pedido: PedidoCompra):
        if not pedido or pedido.Status != PedidoCompra.StatusChoices.AB:
            return
        if not pedido.condicao_pagamento:
            return
        try:
            forma = FormaPagamento.objects.get(codigo=pedido.condicao_pagamento)
        except FormaPagamento.DoesNotExist:
            return

        PedidoCompraParcela.objects.filter(pedido=pedido).delete()

        total = pedido.Valorpedido or ZERO
        base_dt = pedido.Datapedido or timezone.localdate()

        defs = list(
            FormaPagamentoParcela.objects.filter(forma=forma)
            .order_by("ordem")
            .values("ordem", "dias", "percentual", "valor_fixo")
        )
        if not defs:
            defs = [{"ordem": 1, "dias": 0, "percentual": Decimal("100"), "valor_fixo": Decimal("0")}]

        valores = []
        for d in defs:
            perc = Decimal(str(d.get("percentual") or "0"))
            fixo = Decimal(str(d.get("valor_fixo") or "0"))
            if perc > 0:
                val = self._quantize(total * (perc / Decimal("100")))
            elif fixo > 0:
                val = self._quantize(fixo)
            else:
                val = ZERO
            valores.append(val)

        if total > ZERO and valores:
            diff = self._quantize(total - sum(valores))
            valores[-1] = self._quantize(valores[-1] + diff)

        linhas = []
        for i, d in enumerate(defs):
            prazo = int(d.get("dias") or 0)
            venc = base_dt + timezone.timedelta(days=prazo)
            linhas.append(PedidoCompraParcela(
                pedido=pedido,
                parcela=int(d.get("ordem") or (i + 1)),
                prazo_dias=prazo,
                vencimento=venc,
                valor=valores[i],
                forma=forma.codigo,
                observacao=None,
            ))

        if linhas:
            PedidoCompraParcela.objects.bulk_create(linhas)

        pedido.parcelas = len(linhas)
        pedido.condicao_pagamento_detalhe = forma.descricao
        pedido.save(update_fields=["parcelas", "condicao_pagamento_detalhe"])

    def _refresh_header_total_and_parcelas(self, pedido_id):
        total = (
            PedidoCompraItem.objects.filter(Idpedidocompra_id=pedido_id)
            .aggregate(s=Sum(F("Qtp_pc") * F("valorunitario") - F("Desconto")))["s"] or ZERO
        )
        from ..models import PedidoCompra as PC
        PC.objects.filter(pk=pedido_id).update(Valorpedido=total)

        pedido = PC.objects.select_related().get(pk=pedido_id)
        self._regen_parcelas_if_needed(pedido)

    @transaction.atomic
    def create(self, validated_data):
        pedido = validated_data["Idpedidocompra"]
        # 🔒 Lock ao criar item
        self._assert_pedido_aberto(pedido)

        if pedido.tipo_pedido == PedidoCompra.TipoPedido.REVENDA:
            pack = validated_data.get("pack")
            n_packs = validated_data.get("n_packs")
            if pack and n_packs:
                q_calc = self._calc_qty_from_pack(pack, n_packs)
                validated_data["Qtp_pc"] = q_calc
                validated_data["qtd_total_pack"] = q_calc

        q = validated_data.get("Qtp_pc")
        pu = validated_data["valorunitario"]
        desc = validated_data.get("Desconto") or ZERO
        validated_data["Total_item"] = self._calc_total(q, pu, desc)

        obj = super().create(validated_data)
        self._refresh_header_total_and_parcelas(obj.Idpedidocompra_id)
        return obj

    @transaction.atomic
    def update(self, instance, validated_data):
        pedido = instance.Idpedidocompra
        # 🔒 Lock ao editar item
        self._assert_pedido_aberto(pedido)

        if pedido.tipo_pedido == PedidoCompra.TipoPedido.REVENDA:
            pack = validated_data.get("pack", instance.pack)
            n_packs = validated_data.get("n_packs", instance.n_packs)
            if pack and n_packs:
                q_calc = self._calc_qty_from_pack(pack, n_packs)
                validated_data["Qtp_pc"] = q_calc
                validated_data["qtd_total_pack"] = q_calc

        q = validated_data.get("Qtp_pc", instance.Qtp_pc)
        pu = validated_data.get("valorunitario", instance.valorunitario)
        desc = validated_data.get("Desconto", instance.Desconto or ZERO)
        validated_data["Total_item"] = self._calc_total(q, pu, desc)

        obj = super().update(instance, validated_data)
        self._refresh_header_total_and_parcelas(obj.Idpedidocompra_id)
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





class PedidoCompraParcelaSerializer(serializers.ModelSerializer):
    # Alguns modelos do projeto não usam "id" como PK. Mapeamos para expor "id" no JSON.
    id = serializers.IntegerField(source="Idpedidocompraparcela", read_only=True)

    class Meta:
        model = PedidoCompraParcela
        fields = [
            "id",          # ← aparece no JSON
            "pedido",
            "parcela",
            "prazo_dias",
            "vencimento",
            "valor",
            "forma",
            "observacao",
        ]
        read_only_fields = fields
