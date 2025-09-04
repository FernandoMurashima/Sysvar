import pytest
from django.utils import timezone
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

from core.models import (  # ajuste o import do seu app se não for "core"
    Loja, Fornecedor, Grade, Tamanho, Cor, Produto, ProdutoDetalhe,
)

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def loja1(db):
    return Loja.objects.create(
        nome_loja="Loja 1", Apelido_loja="LJ01", cnpj="00.000.000/0001-01"
    )

@pytest.fixture
def loja2(db):
    return Loja.objects.create(
        nome_loja="Loja 2", Apelido_loja="LJ02", cnpj="00.000.000/0002-02"
    )

@pytest.fixture
def fornecedor(db):
    # cnpj com pontuação; o parser limpa dígitos
    return Fornecedor.objects.create(
        Nome_fornecedor="Fornecedor X",
        Apelido="FORX",
        Cnpj="11.111.111/0001-55",
        Cidade="SP",
        email="fx@x.com",
    )

@pytest.fixture
def admin_user(db):
    User = get_user_model()
    u = User.objects.create_user(
        username="admin", password="123456", type="Admin", is_staff=True, is_superuser=True
    )
    return u

@pytest.fixture
def gerente_user(db, loja1):
    User = get_user_model()
    u = User.objects.create_user(
        username="gerente", password="123456", type="Gerente"
    )
    u.Idloja = loja1
    u.save()
    return u

@pytest.fixture
def regular_user_l1(db, loja1):
    User = get_user_model()
    u = User.objects.create_user(
        username="user1", password="123456", type="Regular"
    )
    u.Idloja = loja1
    u.save()
    return u

@pytest.fixture
def regular_user_l2(db, loja2):
    User = get_user_model()
    u = User.objects.create_user(
        username="user2", password="123456", type="Regular"
    )
    u.Idloja = loja2
    u.save()
    return u

@pytest.fixture
def grade_ptmg(db):
    g = Grade.objects.create(Descricao="P-M-G", Status="A")
    tP = Tamanho.objects.create(idgrade=g, Tamanho="P", Descricao="P", Status="A")
    tM = Tamanho.objects.create(idgrade=g, Tamanho="M", Descricao="M", Status="A")
    tG = Tamanho.objects.create(idgrade=g, Tamanho="G", Descricao="G", Status="A")
    return g, [tP, tM, tG]

@pytest.fixture
def cor_preta(db):
    return Cor.objects.create(Descricao="Preto", Codigo="001", Cor="#000", Status="A")

@pytest.fixture
def produto_revenda(db):
    # produto de revenda (Tipoproduto='1'); referencia obrigatória para PD.Codigoproduto
    return Produto.objects.create(
        Tipoproduto="1",
        Descricao="Blusa Básica",
        Desc_reduzida="Blusa",
        referencia="01.01.01001",
        classificacao_fiscal="61046200",
        unidade="UN",
        grupo="01",
        subgrupo="Básico",
        familia="Casual",
        grade="P-M-G",
        colecao="0101",
        Material="ALG",
    )

@pytest.fixture
def sku_existente(db, produto_revenda, grade_ptmg, cor_preta):
    _, tamanhos = grade_ptmg
    tam = tamanhos[0]  # P
    # EAN válido não é exigido pelo backend; só precisa ser único
    ean = "7891234000017"
    return ProdutoDetalhe.objects.create(
        Idproduto=produto_revenda,
        Idtamanho=tam,
        Idcor=cor_preta,
        CodigodeBarra=ean,
        Codigoproduto=produto_revenda.referencia,
        Item=0
    )

@pytest.fixture
def make_xml():
    # constrói um XML mínimo de NFe/nfeProc com itens flexíveis
    def _build_xml(chave, cnpj_emit, numero, serie, itens, totais):
        # itens: lista de dicts {nItem, cProd, xProd, ncm, qCom, vUnCom, vProd, ean (opcional)}
        # totais: dict {vProd, vDesc, vFrete, vOutro, vIPI, vST, vNF}
        dets = []
        for it in itens:
            ean = it.get("ean", "")
            dets.append(f"""
            <det nItem="{it['nItem']}">
              <prod>
                <cProd>{it['cProd']}</cProd>
                <xProd>{it['xProd']}</xProd>
                <NCM>{it.get('ncm','61046200')}</NCM>
                <CFOP>5102</CFOP>
                <uCom>UN</uCom>
                <qCom>{it['qCom']}</qCom>
                <vUnCom>{it['vUnCom']}</vUnCom>
                <vProd>{it['vProd']}</vProd>
                <cEAN>{ean}</cEAN>
                <cEANTrib>{ean}</cEANTrib>
              </prod>
            </det>
            """)
        dets_xml = "\n".join(dets)
        tot = totais
        dhEmi = timezone.now().strftime("%Y-%m-%dT10:00:00-03:00")
        return f"""<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe Id="NFe{chave}">
      <ide>
        <nNF>{numero}</nNF>
        <serie>{serie}</serie>
        <dhEmi>{dhEmi}</dhEmi>
      </ide>
      <emit>
        <CNPJ>{cnpj_emit}</CNPJ>
        <xNome>Fornecedor X</xNome>
      </emit>
      {dets_xml}
      <total>
        <ICMSTot>
          <vProd>{tot.get('vProd','0.00')}</vProd>
          <vDesc>{tot.get('vDesc','0.00')}</vDesc>
          <vFrete>{tot.get('vFrete','0.00')}</vFrete>
          <vOutro>{tot.get('vOutro','0.00')}</vOutro>
          <vIPI>{tot.get('vIPI','0.00')}</vIPI>
          <vST>{tot.get('vST','0.00')}</vST>
          <vNF>{tot.get('vNF','0.00')}</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
</nfeProc>
"""
    return _build_xml
