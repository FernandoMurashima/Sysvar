import io
import json
from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework import status

from core.models import (  # ajuste o import do seu app se não for "core"
    NFeEntrada, FornecedorSkuMap, Estoque, MovimentacaoProdutos, ProdutoDetalhe, Produto
)

pytestmark = pytest.mark.django_db


def _upload(api_client, user, loja, fornecedor, xml_bytes):
    url = reverse("nfe-entrada-upload-xml")
    api_client.force_authenticate(user=user)
    data = {
        "Idloja": str(loja.Idloja),
        "Idfornecedor": str(fornecedor.Idfornecedor),
        "xml": io.BytesIO(xml_bytes),
    }
    data["xml"].name = "nfe.xml"
    return api_client.post(url, data, format="multipart")


def test_upload_ok_and_duplicate_conflict(api_client, admin_user, loja1, fornecedor, make_xml):
    chave = "12345678901234567890123456789012345678901234"
    xml = make_xml(
        chave=chave, cnpj_emit="11111111000155", numero="1001", serie="1",
        itens=[{"nItem": 1, "cProd": "VEN-001", "xProd": "Item 1", "qCom": "2", "vUnCom": "10.00", "vProd": "20.00", "ean": ""}],
        totais={"vProd": "20.00", "vNF": "20.00"}
    ).encode("utf-8")

    # 1ª vez: 201
    resp1 = _upload(api_client, admin_user, loja1, fornecedor, xml)
    assert resp1.status_code == status.HTTP_201_CREATED
    nf_id = resp1.data["Idnfe"]
    assert NFeEntrada.objects.filter(pk=nf_id, chave=chave).exists()

    # 2ª vez: 409 (mesma chave)
    resp2 = _upload(api_client, admin_user, loja1, fornecedor, xml)
    assert resp2.status_code == status.HTTP_409_CONFLICT
    assert resp2.data["nfe"]["Idnfe"] == nf_id


def test_upload_permission_denied_other_store(api_client, regular_user_l1, loja2, fornecedor, make_xml):
    chave = "22222222222222222222222222222222222222222222"
    xml = make_xml(
        chave=chave, cnpj_emit="11111111000155", numero="1002", serie="1",
        itens=[{"nItem": 1, "cProd": "VEN-001", "xProd": "Item 1", "qCom": "1", "vUnCom": "5.00", "vProd": "5.00", "ean": ""}],
        totais={"vProd": "5.00", "vNF": "5.00"}
    ).encode("utf-8")

    # user regular da loja1 tentando subir para loja2 => 403
    resp = _upload(api_client, regular_user_l1, loja2, fornecedor, xml)
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_reconciliar_preview_with_ean_and_map(api_client, admin_user, loja1, fornecedor, sku_existente, make_xml):
    # Um item com EAN casado no banco + um item sem EAN casado via FornecedorSkuMap
    chave = "33333333333333333333333333333333333333333333"
    ean = sku_existente.CodigodeBarra

    # cria mapa para o segundo item sem EAN -> apontando para o mesmo SKU (exemplo)
    FornecedorSkuMap.objects.create(
        fornecedor=fornecedor, cProd_vendor="VEN-XYZ", descricao_vendor="Coisa XYZ",
        produtodetalhe=sku_existente
    )

    xml = make_xml(
        chave=chave, cnpj_emit="11111111000155", numero="1003", serie="1",
        itens=[
            {"nItem": 1, "cProd": "VEN-001", "xProd": "Com EAN", "qCom": "3", "vUnCom": "10.00", "vProd": "30.00", "ean": ean},
            {"nItem": 2, "cProd": "VEN-XYZ", "xProd": "Sem EAN", "qCom": "2", "vUnCom": "7.00", "vProd": "14.00", "ean": ""},
        ],
        totais={"vProd": "44.00", "vNF": "44.00"}
    ).encode("utf-8")

    up = _upload(api_client, admin_user, loja1, fornecedor, xml)
    assert up.status_code == status.HTTP_201_CREATED
    nf_id = up.data["Idnfe"]

    url_rec = reverse("nfe-entrada-reconciliar", kwargs={"pk": nf_id})
    api_client.force_authenticate(user=admin_user)
    rec = api_client.post(url_rec)
    assert rec.status_code == status.HTTP_200_OK
    assert rec.data["status"] in ("conciliada", "importada")
    itens = rec.data["itens"]
    # primeiro item deve apontar para sku via EAN
    assert itens[0]["destino"]["tipo"] == "sku"
    # segundo item deve apontar via mapa fornecedor
    assert itens[1]["destino"]["tipo"] == "sku"


def test_confirmar_full_flow_with_overrides_and_save_map(
    api_client, administrador=pytest.lazy_fixture("admin_user"),
    loja1=pytest.lazy_fixture("loja1"),
    fornecedor=pytest.lazy_fixture("fornecedor"),
    produto_revenda=pytest.lazy_fixture("produto_revenda"),
    grade_ptmg=pytest.lazy_fixture("grade_ptmg"),
    cor_preta=pytest.lazy_fixture("cor_preta"),
    make_xml=pytest.lazy_fixture("make_xml"),
):
    # cria outro SKU para usar em override do item sem EAN
    _, tamanhos = grade_ptmg
    tam = tamanhos[1]  # M
    ean2 = "7891234000093"
    pd2 = ProdutoDetalhe.objects.create(
        Idproduto=produto_revenda,
        Idtamanho=tam,
        Idcor=cor_preta,
        CodigodeBarra=ean2,
        Codigoproduto=produto_revenda.referencia,
        Item=0
    )

    chave = "44444444444444444444444444444444444444444444"
    # item 1 com EAN inexistente => ficará pendente
    # item 2 sem EAN => será resolvido por override (pd2)
    xml = make_xml(
        chave=chave, cnpj_emit="11111111000155", numero="1004", serie="1",
        itens=[
            {"nItem": 1, "cProd": "VEN-AAA", "xProd": "EAN inexistente", "qCom": "4", "vUnCom": "12.50", "vProd": "50.00", "ean": "7890000000000"},
            {"nItem": 2, "cProd": "VEN-BBB", "xProd": "Sem EAN", "qCom": "3", "vUnCom": "10.00", "vProd": "30.00", "ean": ""},
        ],
        totais={"vProd": "80.00", "vDesc": "5.00", "vFrete": "8.00", "vOutro": "2.00", "vNF": "85.00"}
    ).encode("utf-8")

    resp_up = _upload(api_client, administrador, loja1, fornecedor, xml)
    assert resp_up.status_code == status.HTTP_201_CREATED
    nf_id = resp_up.data["Idnfe"]
    itens = resp_up.data["itens"]
    id_item1 = itens[0]["Idnfeitem"]
    id_item2 = itens[1]["Idnfeitem"]

    # confirmar com overrides e permitir_parcial
    url_conf = reverse("nfe-entrada-confirmar", kwargs={"pk": nf_id})
    api_client.force_authenticate(user=administrador)

    payload = {
        "permitir_parcial": True,
        "save_vendor_map": True,
        "overrides": {
            str(id_item1): {"tipo": "produto", "produto_id": produto_revenda.Idproduto},  # uso/consumo
            str(id_item2): {"tipo": "sku", "produtodetalhe_id": pd2.Idprodutodetalhe},   # revenda -> estoque
        }
    }
    conf = api_client.post(url_conf, data=json.dumps(payload), content_type="application/json")
    assert conf.status_code == status.HTTP_200_OK
    assert conf.data["status"] == "lancada"
    assert conf.data["itens_criados"] == 2
    assert conf.data["estoque_atualizado_skus"] == 1

    # estoque incrementado somente para o pd2
    est = Estoque.objects.filter(Idloja=loja1, CodigodeBarra=ean2).first()
    assert est is not None and est.Estoque == 3

    # movimentação criada somente para SKU
    mv = MovimentacaoProdutos.objects.filter(Idloja=loja1, CodigodeBarra=ean2, Tipo="E").first()
    assert mv is not None and mv.Qtd == 3

    # vendor map salvo para os itens override (cProd -> alvo)
    assert FornecedorSkuMap.objects.filter(fornecedor=fornecedor, cProd_vendor="VEN-AAA", produto=produto_revenda).exists()
    assert FornecedorSkuMap.objects.filter(fornecedor=fornecedor, cProd_vendor="VEN-BBB", produtodetalhe=pd2).exists()


def test_confirmar_block_when_missing_and_no_partial(
    api_client, admin_user, loja1, fornecedor, make_xml
):
    # Sem EAN e sem mapa; permitir_parcial = False => 400
    chave = "55555555555555555555555555555555555555555555"
    xml = make_xml(
        chave=chave, cnpj_emit="11111111000155", numero="1005", serie="1",
        itens=[{"nItem": 1, "cProd": "VEN-ZZZ", "xProd": "Sem mapa", "qCom": "2", "vUnCom": "20.00", "vProd": "40.00", "ean": ""}],
        totais={"vProd": "40.00", "vNF": "40.00"}
    ).encode("utf-8")

    up = _upload(api_client, admin_user, loja1, fornecedor, xml)
    assert up.status_code == status.HTTP_201_CREATED
    nf_id = up.data["Idnfe"]

    url_conf = reverse("nfe-entrada-confirmar", kwargs={"pk": nf_id})
    api_client.force_authenticate(user=admin_user)
    conf = api_client.post(url_conf, data=json.dumps({"permitir_parcial": False}), content_type="application/json")
    assert conf.status_code == status.HTTP_400_BAD_REQUEST
    assert "faltantes" in conf.data


def test_cancelar_rules(api_client, admin_user, loja1, fornecedor, make_xml):
    chave = "66666666666666666666666666666666666666666666"
    xml = make_xml(
        chave=chave, cnpj_emit="11111111000155", numero="1006", serie="1",
        itens=[{"nItem": 1, "cProd": "VEN-001", "xProd": "X", "qCom": "1", "vUnCom": "10.00", "vProd": "10.00", "ean": ""}],
        totais={"vProd": "10.00", "vNF": "10.00"}
    ).encode("utf-8")

    up = _upload(api_client, admin_user, loja1, fornecedor, xml)
    nf_id = up.data["Idnfe"]

    # cancelar enquanto não lançada => 200
    url_cancel = reverse("nfe-entrada-cancelar", kwargs={"pk": nf_id})
    api_client.force_authenticate(user=admin_user)
    c1 = api_client.post(url_cancel)
    assert c1.status_code == status.HTTP_200_OK
    assert c1.data["status"] == "cancelada"

    # confirmar depois de cancelada (permitir_parcial True) deve lançar normalmente (regra de negócio pode variar)
    url_conf = reverse("nfe-entrada-confirmar", kwargs={"pk": nf_id})
    conf = api_client.post(url_conf, data=json.dumps({"permitir_parcial": True}), content_type="application/json")
    assert conf.status_code in (status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST)

    # se já estiver lancada, cancelar deve bloquear (409)
    nf = NFeEntrada.objects.get(pk=nf_id)
    nf.status = "lancada"
    nf.save(update_fields=["status"])
    c2 = api_client.post(url_cancel)
    assert c2.status_code == status.HTTP_409_CONFLICT


def test_list_scope_multiloja(api_client, regular_user_l1, regular_user_l2, loja1, loja2, fornecedor, make_xml):
    # sobe uma NF na loja1 e outra na loja2
    x1 = make_xml(
        chave="77777777777777777777777777777777777777777777",
        cnpj_emit="11111111000155", numero="2001", serie="1",
        itens=[{"nItem": 1, "cProd": "A", "xProd": "A", "qCom": "1", "vUnCom": "5.00", "vProd": "5.00"}],
        totais={"vProd": "5.00", "vNF": "5.00"}
    ).encode()
    x2 = make_xml(
        chave="88888888888888888888888888888888888888888888",
        cnpj_emit="11111111000155", numero="2002", serie="1",
        itens=[{"nItem": 1, "cProd": "B", "xProd": "B", "qCom": "1", "vUnCom": "6.00", "vProd": "6.00"}],
        totais={"vProd": "6.00", "vNF": "6.00"}
    ).encode()

    resp1 = _upload(api_client, regular_user_l1, loja1, fornecedor, x1)
    assert resp1.status_code == 201
    resp2 = _upload(api_client, regular_user_l2, loja2, fornecedor, x2)
    assert resp2.status_code == 201

    # user1 só enxerga NF da loja1
    api_client.force_authenticate(user=regular_user_l1)
    url_list = reverse("nfe-entrada-list")
    lst1 = api_client.get(url_list)
    assert lst1.status_code == 200
    for nf in lst1.data:
        assert nf["Idloja"] == loja1.Idloja
