from django.db import models
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils.translation import gettext_lazy as _
from rest_framework.authtoken.models import Token
from django.utils import timezone

# =========================
# Usuário customizado
# =========================
class User(AbstractUser):
    class Type(models.TextChoices):
        REGULAR = 'Regular', _('Regular')
        CAIXA = 'Caixa', _('Caixa')
        GERENTE = 'Gerente', _('Gerente')
        ADMIN = 'Admin', _('Admin')

    type = models.CharField(max_length=10, choices=Type.choices, default='Regular')

@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_auth_token(sender, instance=None, created=False, **kwargs):
    if created:
        Token.objects.create(user=instance)


# =========================
# Cadastros básicos
# =========================
class Loja(models.Model):
    Idloja = models.BigAutoField(primary_key=True)
    nome_loja = models.CharField(max_length=50)
    Apelido_loja = models.CharField(max_length=20)
    cnpj = models.CharField(max_length=18)
    Logradouro = models.CharField(max_length=10, null=True, blank=True)
    Endereco = models.CharField(max_length=50, null=True, blank=True)
    numero = models.CharField(max_length=10, null=True, blank=True)
    Complemento = models.CharField(max_length=100, null=True, blank=True)
    Cep = models.CharField(max_length=10, null=True, blank=True)
    Bairro = models.CharField(max_length=30, null=True, blank=True)
    Cidade = models.CharField(max_length=50, null=True, blank=True)
    Telefone1 = models.CharField(max_length=15, null=True, blank=True)
    Telefone2 = models.CharField(max_length=15, null=True, blank=True)
    email = models.CharField(max_length=50, null=True, blank=True)
    EstoqueNegativo = models.CharField(max_length=3, null=True, blank=True)
    Rede = models.CharField(max_length=3, null=True, blank=True)
    DataAbertura = models.DateField(null=True, blank=True)
    ContaContabil = models.CharField(max_length=50, null=True, blank=True)
    DataEnceramento = models.DateField(null=True, blank=True)
    Matriz = models.CharField(max_length=3, null=True, blank=True)
    data_cadastro = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.nome_loja


class Cliente(models.Model):
    Idcliente = models.BigAutoField(primary_key=True)
    Nome_cliente = models.CharField(max_length=50)
    Apelido = models.CharField(max_length=18)
    cpf = models.CharField(max_length=15)
    Logradouro = models.CharField(max_length=10, null=True, blank=True)
    Endereco = models.CharField(max_length=50, null=True, blank=True)
    numero = models.CharField(max_length=10, null=True, blank=True)
    Complemento = models.CharField(max_length=100, null=True, blank=True)
    Cep = models.CharField(max_length=10, null=True, blank=True)
    Bairro = models.CharField(max_length=30, null=True, blank=True)
    Cidade = models.CharField(max_length=50, null=True, blank=True)
    Telefone1 = models.CharField(max_length=15, null=True, blank=True)
    Telefone2 = models.CharField(max_length=15, null=True, blank=True)
    email = models.CharField(max_length=50, null=True, blank=True)
    Categoria = models.CharField(max_length=15, null=True, blank=True)
    Bloqueio = models.BooleanField(default=False)
    Aniversario = models.DateField(null=True, blank=True)
    MalaDireta = models.BooleanField(default=False)
    ContaContabil = models.CharField(max_length=15, null=True, blank=True)
    data_cadastro = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.Nome_cliente


class Fornecedor(models.Model):
    Idfornecedor = models.BigAutoField(primary_key=True)
    Nome_fornecedor = models.CharField(max_length=50)
    Apelido = models.CharField(max_length=18)
    Cnpj = models.CharField(max_length=18)
    Logradouro = models.CharField(max_length=10, null=True, blank=True)
    Endereco = models.CharField(max_length=50, null=True, blank=True)
    numero = models.CharField(max_length=10, null=True, blank=True)
    Complemento = models.CharField(max_length=100, null=True, blank=True)
    Cep = models.CharField(max_length=10, null=True, blank=True)
    Bairro = models.CharField(max_length=30, null=True, blank=True)
    Cidade = models.CharField(max_length=50, null=True, blank=True)
    Telefone1 = models.CharField(max_length=15, null=True, blank=True)
    Telefone2 = models.CharField(max_length=15, null=True, blank=True)
    email = models.CharField(max_length=50, null=True, blank=True)
    Categoria = models.CharField(max_length=15, null=True, blank=True)
    Bloqueio = models.BooleanField(default=False)
    MalaDireta = models.BooleanField(default=False)
    ContaContabil = models.CharField(max_length=15, null=True, blank=True)
    data_cadastro = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.Nome_fornecedor


class Vendedor(models.Model):
    Idvendedor = models.BigAutoField(primary_key=True)
    nomevendedor = models.CharField(max_length=50)
    apelido = models.CharField(max_length=20)
    cpf = models.CharField(max_length=15)
    aniversario = models.DateField(null=True, blank=True)
    fim = models.DateField(null=True, blank=True)
    categoria = models.CharField(max_length=1, null=True, blank=True)
    data_cadastro = models.DateTimeField(default=timezone.now)
    idloja = models.ForeignKey(Loja, on_delete=models.CASCADE)

    def __str__(self):
        return self.nomevendedor


class Funcionarios(models.Model):
    Idfuncionario = models.BigAutoField(primary_key=True)
    nomefuncionario = models.CharField(max_length=50)
    apelido = models.CharField(max_length=20)
    cpf = models.CharField(max_length=15)
    inicio = models.DateField(null=True, blank=True)
    fim = models.DateField(null=True, blank=True)
    categoria = models.CharField(max_length=15, null=True, blank=True)
    meta = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    data_cadastro = models.DateTimeField(default=timezone.now)
    idloja = models.ForeignKey(Loja, on_delete=models.CASCADE)

    def __str__(self):
        return self.nomefuncionario


class Ncm(models.Model):
    ncm = models.CharField(max_length=20)
    campo1 = models.CharField(max_length=25, blank=True, null=True)
    descricao = models.CharField(max_length=1000)
    aliquota = models.CharField(max_length=20)

    def __str__(self):
        return self.ncm


class Grade(models.Model):
    Idgrade = models.BigAutoField(primary_key=True)
    Descricao = models.CharField(max_length=100)
    Status = models.CharField(max_length=10, null=True, blank=True)
    data_cadastro = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.Descricao


class Tamanho(models.Model):
    Idtamanho = models.BigAutoField(primary_key=True)
    idgrade = models.ForeignKey(Grade, on_delete=models.CASCADE)
    Tamanho = models.CharField(max_length=10)
    Descricao = models.CharField(max_length=100, default="Tamanho")
    Status = models.CharField(max_length=10, null=True, blank=True)
    data_cadastro = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.Descricao


class Cor(models.Model):
    Idcor = models.BigAutoField(primary_key=True)
    Descricao = models.CharField(max_length=100)
    Codigo = models.CharField(max_length=12, null=True, blank=True)
    Cor = models.CharField(max_length=30)
    Status = models.CharField(max_length=10, null=True, blank=True)
    data_cadastro = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.Descricao


class Material(models.Model):
    Idmaterial = models.BigAutoField(primary_key=True)
    Descricao = models.CharField(max_length=100)
    Codigo = models.CharField(max_length=10, null=True, blank=True)
    Status = models.CharField(max_length=10, null=True, blank=True)
    data_cadastro = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.Descricao


class Colecao(models.Model):
    Idcolecao = models.BigAutoField(primary_key=True)
    Descricao = models.CharField(max_length=100)
    Codigo = models.CharField(max_length=2, null=True, blank=True)
    Estacao = models.CharField(max_length=2, null=True, blank=True)
    Status = models.CharField(max_length=10, null=True, blank=True)
    Contador = models.IntegerField(null=True, blank=True, default=0)
    data_cadastro = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.Descricao


class Familia(models.Model):
    Idfamilia = models.BigAutoField(primary_key=True)
    Descricao = models.CharField(max_length=100)
    Codigo = models.CharField(max_length=10, null=True, blank=True)
    data_cadastro = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.Descricao


class Unidade(models.Model):
    Idunidade = models.BigAutoField(primary_key=True)
    Descricao = models.CharField(max_length=100)
    Codigo = models.CharField(max_length=10, null=True, blank=True)
    data_cadastro = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.Descricao


class Nat_Lancamento(models.Model):
    idnatureza = models.BigAutoField(primary_key=True)
    codigo = models.CharField(max_length=10)
    categoria_principal = models.CharField(max_length=50)
    subcategoria = models.CharField(max_length=50)
    descricao = models.CharField(max_length=255)
    tipo = models.CharField(max_length=20)
    status = models.CharField(max_length=10)
    tipo_natureza = models.CharField(max_length=10)

    def __str__(self):
        return f"ID: {self.idnatureza}, Código: {self.codigo}, Categoria: {self.categoria_principal}"


class ContaBancaria(models.Model):
    Idconta = models.BigAutoField(primary_key=True)
    descricao = models.CharField(max_length=30)
    banco = models.CharField(max_length=100)
    agencia = models.CharField(max_length=20)
    numero = models.IntegerField()
    DataSaldo = models.DateField(null=True, blank=True)
    Saldo = models.DecimalField(max_digits=18, decimal_places=2)
    data_cadastro = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.descricao


# =========================
# Produtos
# =========================
class Produto(models.Model):
    Idproduto = models.BigAutoField(primary_key=True)
    Tipoproduto = models.CharField(max_length=1)
    Descricao = models.CharField(max_length=100)
    Desc_reduzida = models.CharField(max_length=100)
    referencia = models.CharField(max_length=11, default='00.00.00000', unique=True)
    classificacao_fiscal = models.CharField(max_length=100)
    unidade = models.CharField(max_length=15)
    grupo = models.CharField(max_length=100, null=True, blank=True)
    subgrupo = models.CharField(max_length=100, null=True, blank=True)
    familia = models.CharField(max_length=100, null=True, blank=True)
    grade = models.CharField(max_length=100, null=True, blank=True)
    colecao = models.CharField(max_length=100, null=True, blank=True)
    produto_foto = models.CharField(max_length=1000, null=True, blank=True)
    produto_foto1 = models.CharField(max_length=1000, null=True, blank=True)
    produto_foto2 = models.CharField(max_length=1000, null=True, blank=True)
    Material = models.CharField(max_length=50, null=True, blank=True)
    data_cadastro = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.Descricao


class ProdutoDetalhe(models.Model):
    Idprodutodetalhe = models.BigAutoField(primary_key=True)
    CodigodeBarra = models.CharField(max_length=20, unique=True)
    Codigoproduto = models.CharField(max_length=11, default='00.00.00000')
    data_cadastro = models.DateTimeField(default=timezone.now)
    Idproduto = models.ForeignKey(Produto, on_delete=models.CASCADE)
    Idtamanho = models.ForeignKey(Tamanho, on_delete=models.CASCADE)
    Idcor = models.ForeignKey(Cor, on_delete=models.CASCADE)
    Item = models.IntegerField(null=True, blank=True, default=0)

    def __str__(self):
        return f'{self.CodigodeBarra} - {self.Codigoproduto}'

    class Meta:
        indexes = [
            models.Index(fields=['CodigodeBarra']),
            models.Index(fields=['Codigoproduto']),
        ]


class Tabelapreco(models.Model):
    Idtabela = models.BigAutoField(primary_key=True)
    NomeTabela = models.CharField(max_length=100, default='Tabela')
    DataInicio = models.DateField()
    Promocao = models.CharField(max_length=3)
    DataFim = models.DateField()
    data_cadastro = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f'{self.NomeTabela} ({self.Idtabela})'


class TabelaPrecoItem(models.Model):
    Idtabelaitem = models.BigAutoField(primary_key=True)
    codigoproduto = models.CharField(max_length=11)
    codigodebarra = models.CharField(max_length=20)
    preco = models.DecimalField(max_digits=18, decimal_places=2)
    idtabela = models.ForeignKey(Tabelapreco, on_delete=models.CASCADE)

    def __str__(self):
        return f'Item {self.Idtabelaitem} - Produto {self.codigoproduto} - Tabela {self.idtabela.NomeTabela}'

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['codigodebarra', 'idtabela'], name='uq_precoitem_codigodebarra_tabela'),
        ]
        indexes = [
            models.Index(fields=['codigodebarra']),
            models.Index(fields=['codigoproduto']),
        ]


class Estoque(models.Model):
    Idestoque = models.BigAutoField(primary_key=True)
    CodigodeBarra = models.CharField(max_length=20)
    codigoproduto = models.CharField(max_length=11, default='00.00.00000')
    Idloja = models.ForeignKey(Loja, on_delete=models.CASCADE)
    Estoque = models.IntegerField(null=True, blank=True)
    reserva = models.IntegerField(null=True, blank=True)
    valorestoque = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True)

    def __str__(self):
        return f'{self.CodigodeBarra} - {self.Estoque}'

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['CodigodeBarra', 'Idloja'], name='uq_estoque_codigodebarra_loja'),
        ]
        indexes = [
            models.Index(fields=['CodigodeBarra']),
            models.Index(fields=['codigoproduto']),
        ]


# =========================
# Vendas / Movimentações
# =========================
class Venda(models.Model):
    Idvenda = models.BigAutoField(primary_key=True)
    Idloja = models.ForeignKey(Loja, on_delete=models.CASCADE)
    Idcliente = models.ForeignKey(Cliente, on_delete=models.CASCADE)
    Data = models.DateTimeField(default=timezone.now)
    Desconto = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True)
    Cancelada = models.CharField(max_length=2, null=True, blank=True)
    Documento = models.CharField(max_length=10, default='0000000000')
    Valor = models.DecimalField(max_digits=18, decimal_places=2)
    Tipo_documento = models.CharField(max_length=20, null=True, blank=True)
    Idfuncionario = models.ForeignKey(Funcionarios, on_delete=models.CASCADE, default=None)
    comissao = models.DecimalField(max_digits=18, decimal_places=5)
    acrescimo = models.DecimalField(max_digits=18, decimal_places=5)
    tipopag = models.CharField(max_length=20)
    ticms = models.DecimalField(max_digits=18, decimal_places=5, default=0.00)
    tpis = models.DecimalField(max_digits=18, decimal_places=5, default=0.00)
    tcofins = models.DecimalField(max_digits=18, decimal_places=5, default=0.00)
    tcsll = models.DecimalField(max_digits=18, decimal_places=5, default=0.00)

    def __str__(self):
        return f'{self.Documento} - {self.Valor}'


class VendaItem(models.Model):
    Idvendaitem = models.BigAutoField(primary_key=True)
    Documento = models.CharField(max_length=20, default='')
    CodigodeBarra = models.CharField(max_length=20, default='0000000000000')
    codigoproduto = models.CharField(max_length=11, default='00.00.00000')
    Qtd = models.IntegerField()
    valorunitario = models.DecimalField(max_digits=18, decimal_places=2)
    Desconto = models.DecimalField(max_digits=18, decimal_places=2)
    Total_item = models.DecimalField(max_digits=18, decimal_places=2)
    iicms = models.DecimalField(max_digits=18, decimal_places=5, default=0.00)
    ipis = models.DecimalField(max_digits=18, decimal_places=5, default=0.00)
    icofins = models.DecimalField(max_digits=18, decimal_places=5, default=0.00)
    icsll = models.DecimalField(max_digits=18, decimal_places=5, default=0.00)

    def __str__(self):
        return f'{self.Documento} - {self.Total_item}'


class MovimentacaoFinanceira(models.Model):
    Idmovfin = models.BigAutoField(primary_key=True)
    Idconta = models.ForeignKey(ContaBancaria, on_delete=models.CASCADE)
    data_movimento = models.DateField()
    Titulo = models.CharField(max_length=10, default='00000000-0')
    TipoMov = models.CharField(max_length=1, default='C')
    TipoFluxo = models.CharField(max_length=1, default='R')
    valor = models.DecimalField(max_digits=18, decimal_places=2)
    data_baixa = models.DateField(null=True, blank=True)
    data_cadastro = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f'{self.Titulo} - {self.valor}'


class MovimentacaoProdutos(models.Model):
    Idmovprod = models.BigAutoField(primary_key=True)
    Idloja = models.ForeignKey(Loja, on_delete=models.CASCADE)
    Data_mov = models.DateField()
    Documento = models.CharField(max_length=20, default='0000000000')
    Tipo = models.CharField(max_length=1, default='V')
    Qtd = models.IntegerField()
    Valor = models.DecimalField(max_digits=18, decimal_places=2)
    data_cadastro = models.DateTimeField(default=timezone.now)
    CodigodeBarra = models.CharField(max_length=20, default='0000000000000')
    codigoproduto = models.CharField(max_length=11, default='00.00.00000')

    def __str__(self):
        return f'{self.Documento} - {self.Qtd}'


class Inventario(models.Model):
    Idinventario = models.BigAutoField(primary_key=True)
    Idloja = models.ForeignKey(Loja, on_delete=models.CASCADE)
    Data_inventario = models.DateField()
    Descricao = models.CharField(max_length=50)
    status = models.CharField(max_length=2)
    data_cadastro = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.Descricao


class InventarioItem(models.Model):
    Idinventario_item = models.BigAutoField(primary_key=True)
    Idinventario = models.ForeignKey(Inventario, on_delete=models.CASCADE)
    Idproduto = models.ForeignKey(Produto, on_delete=models.CASCADE)
    Idprodutodetalhe = models.ForeignKey(ProdutoDetalhe, on_delete=models.CASCADE)
    Valor_contado = models.IntegerField()
    Valor_ajustado = models.IntegerField()
    data_cadastro = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f'{self.Idinventario} - {self.Valore_contado if hasattr(self,"Valore_contado") else self.Valor_contado}'


# =========================
# Contas a Receber / Pagar
# =========================
class Receber(models.Model):
    Idreceber = models.BigAutoField(primary_key=True)
    idloja = models.ForeignKey(Loja, on_delete=models.CASCADE)
    Documento = models.CharField(max_length=10, default='0000000000')
    Valor = models.DecimalField(max_digits=18, decimal_places=2)
    ContaContabil = models.CharField(max_length=50, blank=True)
    Nat_Lancamento = models.CharField(max_length=50, blank=True)
    data_cadastro = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f'Receber ID: {self.Idreceber} - Documento: {self.Documento}'


class ReceberItens(models.Model):
    Idreceberitens = models.BigAutoField(primary_key=True)
    Idreceber = models.ForeignKey(Receber, on_delete=models.CASCADE)
    Titulo = models.CharField(max_length=10, default='00000000-0')
    Parcela = models.IntegerField(default=1)
    Datavencimento = models.DateField(null=True, blank=True)
    Databaixa = models.DateField(null=True, blank=True)
    valor_parcela = models.DecimalField(max_digits=18, decimal_places=2)
    juros = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True)
    desconto = models.DecimalField(max_digits=18, decimal_places=2)
    Titulo_descontado = models.CharField(max_length=1, null=True, blank=True)
    Data_desconto = models.DateField(null=True, blank=True)
    idconta = models.IntegerField(null=True, blank=True)
    data_cadastro = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f'{self.Titulo} - Parcela {self.Parcela}'


class ReceberCartao(models.Model):
    TIPO_CARTAO_CHOICES = [
        ('Débito', 'Débito'),
        ('Crédito', 'Crédito'),
    ]
    STATUS_TRANSACAO_CHOICES = [
        ('Aprovada', 'Aprovada'),
        ('Negada', 'Negada'),
        ('Pendente', 'Pendente'),
    ]

    idvenda = models.ForeignKey('Venda', on_delete=models.CASCADE)
    tipo_cartao = models.CharField(max_length=20, choices=TIPO_CARTAO_CHOICES)
    data_transacao = models.DateTimeField(default=timezone.now)
    valor_transacao = models.DecimalField(max_digits=10, decimal_places=2)
    codigo_autorizacao = models.CharField(max_length=20)
    bandeira = models.CharField(max_length=50)
    parcelas = models.IntegerField(default=1)
    numero_titulo = models.CharField(max_length=20)
    status_transacao = models.CharField(max_length=20, choices=STATUS_TRANSACAO_CHOICES)
    mensagem_retorno = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Transação {self.codigo_autorizacao} - {self.status_transacao}"


class Pagar(models.Model):
    Idpagar = models.BigAutoField(primary_key=True)
    idloja = models.ForeignKey(Loja, on_delete=models.CASCADE)
    Titulo = models.CharField(max_length=20)
    Parcelado = models.CharField(max_length=1)
    TipoRecebimento = models.CharField(max_length=15)
    Data = models.DateField()
    Data_vencimento = models.DateField()
    Valor = models.DecimalField(max_digits=18, decimal_places=2)
    Idnatureza = models.ForeignKey(Nat_Lancamento, on_delete=models.CASCADE)
    ContaContabil = models.CharField(max_length=50)
    idcliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, null=True, blank=True)
    Idfuncionario = models.ForeignKey(Funcionarios, on_delete=models.CASCADE, null=True, blank=True)
    idcompra = models.IntegerField(null=True, blank=True)
    data_cadastro = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.Titulo


class PagarItem(models.Model):
    Idpagaritem = models.BigAutoField(primary_key=True)
    Idpagar = models.ForeignKey(Pagar, on_delete=models.CASCADE)
    parcela = models.CharField(max_length=1)
    Databaixa = models.DateField(null=True, blank=True)
    valor_parcela = models.DecimalField(max_digits=18, decimal_places=2)
    juros = models.DecimalField(max_digits=18, decimal_places=2)
    desconto = models.DecimalField(max_digits=18, decimal_places=2)
    Titulo_descontado = models.CharField(max_length=1)
    Data_desconto = models.DateField()
    idconta = models.IntegerField()
    data_cadastro = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f'{self.Idpagar} - {self.parcela}'


# =========================
# Compras
# =========================
class Compra(models.Model):
    Idcompra = models.BigAutoField(primary_key=True)
    Idfornecedor = models.ForeignKey(Fornecedor, on_delete=models.CASCADE)
    Idloja = models.ForeignKey(Loja, on_delete=models.CASCADE)
    Datacompra = models.DateField(null=True, blank=True)
    Status = models.CharField(max_length=2, null=True, blank=True)
    Valorpedido = models.DecimalField(max_digits=18, decimal_places=2)
    Documento = models.CharField(max_length=20)
    Datadocumento = models.DateField()
    Idpedidocompra = models.IntegerField(null=True, blank=True)
    data_cadastro = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.Documento


class CompraItem(models.Model):
    Idcompraitem = models.BigAutoField(primary_key=True)
    Idcompra = models.ForeignKey(Compra, on_delete=models.CASCADE)
    Idproduto = models.ForeignKey(Produto, on_delete=models.CASCADE)
    Qtd = models.IntegerField()
    Valorunitario = models.DecimalField(max_digits=18, decimal_places=2)
    Descontoitem = models.DecimalField(max_digits=18, decimal_places=2)
    Totalitem = models.DecimalField(max_digits=18, decimal_places=2)
    data_cadastro = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f'{self.Idcompra} - {self.Totalitem}'


class PedidoCompra(models.Model):
    Idpedidocompra = models.BigAutoField(primary_key=True)
    Idfornecedor = models.ForeignKey(Fornecedor, on_delete=models.CASCADE)
    Datapedido = models.DateField(null=True, blank=True)
    Dataentrega = models.DateField(null=True, blank=True)
    Valorpedido = models.DecimalField(max_digits=18, decimal_places=2)
    Status = models.CharField(max_length=2, null=True, blank=True)
    Documento = models.CharField(max_length=20, null=True, blank=True)
    data_nf = models.DateField(null=True, blank=True)
    Chave = models.CharField(max_length=100, null=True, blank=True)
    Idloja = models.ForeignKey(Loja, on_delete=models.CASCADE)
    data_cadastro = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.Documento


class PedidoCompraItem(models.Model):
    Idpedidocompraitem = models.BigAutoField(primary_key=True)
    Idpedidocompra = models.ForeignKey(PedidoCompra, on_delete=models.CASCADE)
    Idproduto = models.ForeignKey(Produto, on_delete=models.CASCADE)
    Qtp_pc = models.IntegerField()
    valorunitario = models.DecimalField(max_digits=18, decimal_places=2)
    Desconto = models.DecimalField(max_digits=18, decimal_places=2)
    Total_item = models.DecimalField(max_digits=18, decimal_places=2)
    data_cadastro = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f'{self.Idpedidocompra} - {self.Total_item}'


# =========================
# Grupos / Códigos / Impostos / Caixa / Despesas
# =========================
class Grupo(models.Model):
    Idgrupo = models.BigAutoField(primary_key=True)
    Codigo = models.CharField(max_length=12)
    Descricao = models.CharField(max_length=100)
    Margem = models.DecimalField(max_digits=6, decimal_places=2)
    data_cadastro = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.Descricao


class Subgrupo(models.Model):
    Idsubgrupo = models.BigAutoField(primary_key=True)
    Descricao = models.CharField(max_length=100)
    Margem = models.DecimalField(max_digits=6, decimal_places=2)
    data_cadastro = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.Descricao


class GrupoDetalhe(models.Model):
    IdGrupoDetalhe = models.BigAutoField(primary_key=True)
    idgrupo = models.ForeignKey(Grupo, on_delete=models.CASCADE)
    idsubgrupo = models.ForeignKey(Subgrupo, on_delete=models.CASCADE)

    def __str__(self):
        return f'{self.idgrupo_id} - {self.idsubgrupo_id}'

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['idgrupo', 'idsubgrupo'], name='uq_grupodetalhe_grupo_subgrupo'),
        ]


class Codigos(models.Model):
    Idcodigo = models.BigAutoField(primary_key=True)
    variavel = models.CharField(max_length=7)
    valor_var = models.CharField(max_length=15)

    def __str__(self):
        return f'{self.variavel}: {self.valor_var}'


class Imposto(models.Model):
    idloja = models.ForeignKey(Loja, on_delete=models.CASCADE)
    icms = models.DecimalField(max_digits=5, decimal_places=2)
    pis = models.DecimalField(max_digits=5, decimal_places=2)
    cofins = models.DecimalField(max_digits=5, decimal_places=2)
    csll = models.DecimalField(max_digits=5, decimal_places=2)

    def __str__(self):
        return f"ICMS: {self.icms}%, PIS: {self.pis}%, COFINS: {self.cofins}%, CSLL: {self.csll}%"


class Caixa(models.Model):
    idcaixa = models.AutoField(primary_key=True)
    idloja = models.ForeignKey(Loja, on_delete=models.CASCADE)
    data = models.DateField()
    saldoanterior = models.DecimalField(max_digits=10, decimal_places=2)
    saldofinal = models.DecimalField(max_digits=10, decimal_places=2)
    despesas = models.DecimalField(max_digits=10, decimal_places=2)
    pix = models.DecimalField(max_digits=10, decimal_places=2)
    debito = models.DecimalField(max_digits=10, decimal_places=2)
    credito = models.DecimalField(max_digits=10, decimal_places=2)
    parcelado = models.DecimalField(max_digits=10, decimal_places=2)
    dinheiro = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=1, default='A')
    enviado = models.BooleanField(default=False)
    usuario = models.CharField(max_length=100, default='none')

    def __str__(self):
        return f"Caixa {self.idcaixa} - {self.data}"


class Despesa(models.Model):
    iddespesa = models.AutoField(primary_key=True)
    idloja = models.ForeignKey(Loja, on_delete=models.CASCADE)
    data = models.DateField()
    descricao = models.CharField(max_length=200)
    autorizado = models.CharField(max_length=20)
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    recibo = models.CharField(max_length=20)

    def __str__(self):
        return f"Despesa {self.iddespesa} - {self.descricao}"
