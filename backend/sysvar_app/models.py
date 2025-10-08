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
        AUXILIAR = 'Auxiliar', _('Auxiliar')
        ASSISTENTE = 'Assistente', _('Assistente')

    type = models.CharField(max_length=10, choices=Type.choices, default='Regular')
    Idloja = models.ForeignKey('Loja', on_delete=models.SET_NULL, null=True, blank=True, related_name='usuarios')


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
    Estado = models.CharField(max_length=2, null=True, blank=True)
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
    Estado = models.CharField(max_length=2, null=True, blank=True)
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
    Estado = models.CharField(max_length=2, null=True, blank=True)
    Telefone1 = models.CharField(max_length=15, null=True, blank=True)
    Telefone2 = models.CharField(maxlength=15) if False else models.CharField(max_length=15, null=True, blank=True)
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
    Margem = models.DecimalField(max_digits=6, decimal_places=2, default=0)
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
    referencia = models.CharField(max_length=20, unique=True, null=True, blank=True)
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
    Ativo = models.BooleanField(default=True)
    inativado_em = models.DateTimeField(null=True, blank=True)
    inativado_por = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    motivo_inativacao = models.CharField(max_length=255, blank=True, default='')

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
    Ativo = models.BooleanField(default=True)

    def __str__(self):
        return f'{self.CodigodeBarra} - {self.Codigoproduto}'
    # --- Compra padrão ---
    unidade_compra = models.CharField(max_length=10, blank=True, null=True)
    fator_compra = models.DecimalField(max_digits=18, decimal_places=6, default=1)

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
        return f'{self.Documento} - {self.Valor}'  # noqa: E999


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
        # nota: mantém compat da string antiga
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
    TIPO_CARTAO_CHOICES = [('Débito', 'Débito'), ('Crédito', 'Crédito')]
    STATUS_TRANSACAO_CHOICES = [('Aprovada', 'Aprovada'), ('Negada', 'Negada'), ('Pendente', 'Pendente')]

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
    # --- Vínculos com origem ---
    nfe = models.ForeignKey('NFeEntrada', on_delete=models.SET_NULL, null=True, blank=True)
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
    # --- Rateio ---
    tem_rateio = models.BooleanField(default=False)
    data_cadastro = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f'{self.Idpagar} - {self.parcela}'


# =========================
# Pedido de Compra
# =========================
class PedidoCompra(models.Model):
    class TipoPedido(models.TextChoices):
        REVENDA = 'revenda', 'Revenda'
        CONSUMO = 'consumo', 'Uso/Consumo'

    class StatusChoices(models.TextChoices):
        AB = 'AB', 'Aberto'
        AP = 'AP', 'Aprovado'
        RC = 'RC', 'Recebendo'
        CL = 'CL', 'Concluído'
        CA = 'CA', 'Cancelado'

    Idpedidocompra = models.BigAutoField(primary_key=True)
    Idfornecedor = models.ForeignKey(Fornecedor, on_delete=models.CASCADE)
    Idloja = models.ForeignKey(Loja, on_delete=models.CASCADE)

    Datapedido = models.DateField(null=True, blank=True)
    Dataentrega = models.DateField(null=True, blank=True)  # entrega geral (opcional)
    Valorpedido = models.DecimalField(max_digits=18, decimal_places=2)

    Status = models.CharField(max_length=2, null=True, blank=True, choices=StatusChoices.choices, default=StatusChoices.AB)
    Documento = models.CharField(max_length=20, null=True, blank=True)
    data_nf = models.DateField(null=True, blank=True)
    Chave = models.CharField(max_length=100, null=True, blank=True)

    # --- Novos campos do cabeçalho ---
    tipo_pedido = models.CharField(max_length=15, choices=TipoPedido.choices, default=TipoPedido.REVENDA)
    condicao_pagamento = models.CharField(max_length=60, null=True, blank=True)
    condicao_pagamento_detalhe = models.TextField(null=True, blank=True)
    parcelas = models.IntegerField(null=True, blank=True)
    fornecedor_contato = models.CharField(max_length=120, null=True, blank=True)

    aprovado_por = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='pc_aprovados')
    aprovado_em = models.DateTimeField(null=True, blank=True)
    observacoes = models.TextField(null=True, blank=True)

    percentual_desconto_global = models.DecimalField(max_digits=6, decimal_places=3, null=True, blank=True, default=0)
    frete_previsto = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True, default=0)
    outros_previstos = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True, default=0)

    # --- Tolerâncias de recebimento ---
    tolerancia_qtd_percent = models.DecimalField(max_digits=6, decimal_places=3, default=0)
    tolerancia_preco_percent = models.DecimalField(max_digits=6, decimal_places=3, default=0)

    data_cadastro = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.Documento or f'PC-{self.Idpedidocompra}'


class PedidoCompraItem(models.Model):
    Idpedidocompraitem = models.BigAutoField(primary_key=True)
    Idpedidocompra = models.ForeignKey(PedidoCompra, on_delete=models.CASCADE)
    Idproduto = models.ForeignKey(Produto, on_delete=models.CASCADE)
    Qtp_pc = models.IntegerField()
    valorunitario = models.DecimalField(max_digits=18, decimal_places=2)
    Desconto = models.DecimalField(max_digits=18, decimal_places=2)
    Total_item = models.DecimalField(max_digits=18, decimal_places=2)
    # --- Recebimento & especificações de compra ---
    Qtd_recebida = models.IntegerField(default=0)
    unid_compra = models.CharField(max_length=10, blank=True, null=True)
    fator_conv = models.DecimalField(max_digits=18, decimal_places=6, default=1)
    Idprodutodetalhe = models.ForeignKey('ProdutoDetalhe', on_delete=models.SET_NULL, null=True, blank=True)

    # Novo: entrega prevista por item (opcional)
    data_entrega_prevista = models.DateField(null=True, blank=True)

    data_cadastro = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f'{self.Idpedidocompra} - {self.Total_item}'


class PedidoCompraEntrega(models.Model):
    """Programação de entregas (split de entregas do pedido)."""
    Idpc_entrega = models.BigAutoField(primary_key=True)
    pedido = models.ForeignKey(PedidoCompra, on_delete=models.CASCADE, related_name='entregas')
    data_entrega = models.DateField()
    quantidade_prevista = models.IntegerField(null=True, blank=True)
    observacao = models.CharField(max_length=200, null=True, blank=True)
    data_cadastro = models.DateTimeField(default=timezone.now)

    class Meta:
        indexes = [models.Index(fields=['pedido', 'data_entrega'])]

    def __str__(self):
        return f'{self.pedido_id} -> {self.data_entrega}'


# =========================
# Grupos / Códigos / Impostos / Caixa / Despesas
# =========================
class Grupo(models.Model):
    Idgrupo = models.BigAutoField(primary_key=True)
    Codigo = models.CharField(max_length=12)
    Descricao = models.CharField(maxlength=100) if False else models.CharField(max_length=100)
    Margem = models.DecimalField(max_digits=6, decimal_places=2)
    data_cadastro = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.Descricao


class Subgrupo(models.Model):
    Idsubgrupo = models.BigAutoField(primary_key=True)
    Idgrupo = models.ForeignKey(Grupo, on_delete=models.CASCADE, null=True, blank=True)
    Descricao = models.CharField(max_length=100)
    Margem = models.DecimalField(max_digits=6, decimal_places=2)
    data_cadastro = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.Descricao


class Codigos(models.Model):
    Idcodigo = models.BigAutoField(primary_key=True)
    colecao = models.CharField(max_length=2, null=False, blank=False, default="00")
    estacao = models.CharField(max_length=2, null=False, blank=False, default="00")
    valor_var = models.IntegerField(default=1)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['colecao', 'estacao'], name='unique_colecao_estacao')
        ]

    def __str__(self):
        return f'{self.colecao}{self.estacao}: {self.valor_var}'


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


# =========================
# NF-e (Entrada Fiscal)
# =========================
class NFeEntrada(models.Model):
    Idnfe = models.BigAutoField(primary_key=True)
    chave = models.CharField(max_length=44, unique=True)  # 44 dígitos
    numero = models.CharField(max_length=10, blank=True, null=True)
    serie = models.CharField(max_length=5, blank=True, null=True)
    dhEmi = models.DateTimeField(blank=True, null=True)

    cnpj_emitente = models.CharField(max_length=14, blank=True, null=True)
    razao_emitente = models.CharField(max_length=120, blank=True, null=True)

    Idfornecedor = models.ForeignKey('Fornecedor', on_delete=models.SET_NULL, null=True, blank=True)
    Idloja = models.ForeignKey('Loja', on_delete=models.CASCADE)

    xml = models.TextField(blank=True, null=True)

    # totais
    vProd = models.DecimalField(max_digits=18, decimal_places=2, blank=True, null=True)
    vDesc = models.DecimalField(max_digits=18, decimal_places=2, blank=True, null=True)
    vFrete = models.DecimalField(max_digits=18, decimal_places=2, blank=True, null=True)
    vOutro = models.DecimalField(max_digits=18, decimal_places=2, blank=True, null=True)
    vIPI = models.DecimalField(max_digits=18, decimal_places=2, blank=True, null=True)
    vICMSST = models.DecimalField(max_digits=18, decimal_places=2, blank=True, null=True)
    vNF = models.DecimalField(max_digits=18, decimal_places=2, blank=True, null=True)

    # status do fluxo
    status = models.CharField(max_length=20, default='importada')  # importada | conciliada | lancada | cancelada
    # controle do fluxo e deduplicação
    tipo_nota = models.CharField(max_length=20, blank=True, null=True)  # mercadoria/servico/concessionaria
    origem = models.CharField(max_length=10, blank=True, null=True)     # XML ou MANUAL
    fingerprint = models.CharField(max_length=64, unique=True, blank=True, null=True)
    # modelo de documento fiscal
    modelo = models.ForeignKey('ModeloDocumentoFiscal', on_delete=models.PROTECT, null=True, blank=True)

    data_cadastro = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f'NF-e {self.chave} — {self.status}'


class NFeItem(models.Model):
    Idnfeitem = models.BigAutoField(primary_key=True)
    nfe = models.ForeignKey(NFeEntrada, on_delete=models.CASCADE, related_name='itens')
    ordem = models.IntegerField()  # nItem do XML

    cProd = models.CharField(max_length=60)                   # código do fornecedor
    xProd = models.CharField(max_length=255)                  # descrição
    ncm = models.CharField(max_length=20, blank=True, null=True)
    cfop = models.CharField(max_length=10, blank=True, null=True)
    uCom = models.CharField(max_length=10, blank=True, null=True)

    qCom = models.DecimalField(max_digits=18, decimal_places=3)     # quantidade
    vUnCom = models.DecimalField(max_digits=18, decimal_places=6)   # preço unitário
    vProd = models.DecimalField(max_digits=18, decimal_places=2)    # total do item
    cean = models.CharField(max_length=20, blank=True, null=True)   # EAN do item (pode vir vazio)

    # tributos (espelho básico)
    vDesc = models.DecimalField(max_digits=18, decimal_places=2, blank=True, null=True)
    vFrete = models.DecimalField(max_digits=18, decimal_places=2, blank=True, null=True)
    vOutro = models.DecimalField(max_digits=18, decimal_places=2, blank=True, null=True)

    # conciliação & conversão
    pendente = models.BooleanField(default=True)
    fator_conversao = models.DecimalField(max_digits=18, decimal_places=6, blank=True, null=True, default=None)
    unidade_destino = models.CharField(max_length=10, blank=True, null=True)

    data_cadastro = models.DateTimeField(default=timezone.now)

    class Meta:
        indexes = [
            models.Index(fields=['cean']),
            models.Index(fields=['cProd']),
            models.Index(fields=['nfe', 'ordem']),
        ]

    def __str__(self):
        return f'{self.nfe.chave} - item {self.ordem} ({self.cProd})'


# =========================
# Modelo de Documentos Fiscais (Tabela de referência)
# =========================
class ModeloDocumentoFiscal(models.Model):
    Idmodelo = models.BigAutoField(primary_key=True)
    codigo = models.CharField(max_length=4, unique=True)  # ex.: '55', '65', '1B'
    descricao = models.CharField(max_length=120)
    data_inicial = models.DateField()
    data_final = models.DateField(null=True, blank=True)
    ativo = models.BooleanField(default=True)
    data_cadastro = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['codigo']
        verbose_name = 'Modelo de Documento Fiscal'
        verbose_name_plural = 'Modelos de Documentos Fiscais'

    def __str__(self):
        return f"{self.codigo} - {self.descricao}"


# =========================
# Centro de Custo
# =========================
class CentroCusto(models.Model):
    Idcentrocusto = models.BigAutoField(primary_key=True)
    codigo = models.CharField(max_length=20, unique=True)
    descricao = models.CharField(max_length=120)
    pai = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL)
    ativo = models.BooleanField(default=True)
    data_cadastro = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.codigo} - {self.descricao}"


# =========================
# Vínculo Fornecedor ↔ SKU (versão mantida)
# =========================
class FornecedorSkuMap(models.Model):
    Idforn_sku_map = models.BigAutoField(primary_key=True)
    Idfornecedor = models.ForeignKey('Fornecedor', on_delete=models.CASCADE)
    cprod_fornecedor = models.CharField(max_length=60)  # cProd do XML
    ean_fornecedor = models.CharField(max_length=20, blank=True, null=True)
    Idprodutodetalhe = models.ForeignKey('ProdutoDetalhe', on_delete=models.CASCADE, null=True, blank=True)
    Idproduto = models.ForeignKey('Produto', on_delete=models.CASCADE, null=True, blank=True)
    unid_fornecedor = models.CharField(max_length=10, blank=True, null=True)
    fator_conversao = models.DecimalField(max_digits=18, decimal_places=6, default=1)
    ativo = models.BooleanField(default=True)
    data_cadastro = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['Idfornecedor', 'cprod_fornecedor'], name='uq_fornecedor_cprod')
        ]
        indexes = [
            models.Index(fields=['ean_fornecedor']),
        ]

    def __str__(self):
        return f"{self.Idfornecedor_id} -> {self.cprod_fornecedor}"


# =========================
# EANs adicionais por SKU
# =========================
class ProdutoEAN(models.Model):
    Idprodutoean = models.BigAutoField(primary_key=True)
    Idprodutodetalhe = models.ForeignKey('ProdutoDetalhe', on_delete=models.CASCADE, related_name='eans')
    ean = models.CharField(max_length=20)
    principal = models.BooleanField(default=False)
    data_cadastro = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['Idprodutodetalhe', 'ean'], name='uq_produtoean_sku_ean')
        ]
        indexes = [
            models.Index(fields=['ean']),
        ]

    def __str__(self):
        return f"{self.Idprodutodetalhe_id} - {self.ean}"


# =========================
# Staging da conciliação por item da NF
# =========================
class NFeConciliacaoItem(models.Model):
    Idconciliacao = models.BigAutoField(primary_key=True)
    nfe_item = models.ForeignKey('NFeItem', on_delete=models.CASCADE, related_name='conciliacoes')
    destino_tipo = models.CharField(max_length=10)  # 'sku' ou 'produto'
    Idprodutodetalhe = models.ForeignKey('ProdutoDetalhe', on_delete=models.CASCADE, null=True, blank=True)
    Idproduto = models.ForeignKey('Produto', on_delete=models.CASCADE, null=True, blank=True)
    origem_match = models.CharField(max_length=10)  # 'auto' ou 'manual'
    fator_unidade = models.DecimalField(max_digits=18, decimal_places=6, default=1)
    salvar_vinculo = models.BooleanField(default=False)
    Idpedidocompraitem = models.ForeignKey('PedidoCompraItem', on_delete=models.SET_NULL, null=True, blank=True)
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    data_cadastro = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.nfe_item_id} -> {self.destino_tipo}"


# =========================
# Recebimento x Pedido de Compra (auditoria/saldos)
# =========================
class RecebimentoPCItem(models.Model):
    Idrecpc = models.BigAutoField(primary_key=True)
    Idpedidocompraitem = models.ForeignKey('PedidoCompraItem', on_delete=models.CASCADE)
    nfe_item = models.ForeignKey('NFeItem', on_delete=models.SET_NULL, null=True, blank=True)
    quantidade_atendida = models.DecimalField(max_digits=18, decimal_places=3)
    valor_atendido = models.DecimalField(max_digits=18, decimal_places=2)
    data_cadastro = models.DateTimeField(default=timezone.now)

    def __str__(self):
        base = f"PCItem {self.Idpedidocompraitem_id}"
        if self.nfe_item_id:
            base += f" <= NFeItem {self.nfe_item_id}"
        return base


# =========================
# Modelos de Rateio
# =========================
class ModeloRateio(models.Model):
    Idmodelorateio = models.BigAutoField(primary_key=True)
    descricao = models.CharField(max_length=120)
    Idfornecedor = models.ForeignKey('Fornecedor', on_delete=models.SET_NULL, null=True, blank=True)
    Idnatureza = models.ForeignKey('Nat_Lancamento', on_delete=models.SET_NULL, null=True, blank=True)
    ativo = models.BooleanField(default=True)
    data_cadastro = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.descricao


class ModeloRateioLinha(models.Model):
    Idmodelorateiolinha = models.BigAutoField(primary_key=True)
    modelorateio = models.ForeignKey(ModeloRateio, on_delete=models.CASCADE, related_name='linhas')
    Idcentrocusto = models.ForeignKey('CentroCusto', on_delete=models.CASCADE)
    percentual = models.DecimalField(max_digits=9, decimal_places=6)  # 0-100%
    data_cadastro = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.modelorateio_id} - {self.percentual}%"


# =========================
# Rateio por parcela de AP
# =========================
class APParcelaRateio(models.Model):
    Idparcela_rateio = models.BigAutoField(primary_key=True)
    Idpagaritem = models.ForeignKey('PagarItem', on_delete=models.CASCADE, related_name='rateios')
    Idcentrocusto = models.ForeignKey('CentroCusto', on_delete=models.CASCADE)
    Idnatureza = models.ForeignKey('Nat_Lancamento', on_delete=models.SET_NULL, null=True, blank=True)
    percentual = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    valor = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True)
    data_cadastro = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"Parcela {self.Idpagaritem_id} - CC {self.Idcentrocusto_id}"


# =========================
# Parâmetros de Entrada de NF
# =========================
class ParametrosEntradaNFe(models.Model):
    Idparam = models.BigAutoField(primary_key=True)
    frete_no_custo = models.BooleanField(default=True)
    tolerancia_qtd_percent = models.DecimalField(max_digits=6, decimal_places=3, default=0)
    tolerancia_preco_percent = models.DecimalField(max_digits=6, decimal_places=3, default=0)
    tolerancia_totais = models.DecimalField(max_digits=6, decimal_places=3, default=0)
    ap_confirmacao_parcial_por_valor_confirmado = models.BooleanField(default=True)
    data_cadastro = models.DateTimeField(default=timezone.now)


# =========================
# Logs de Entrada
# =========================
class EntradaNFeLog(models.Model):
    Idlog = models.BigAutoField(primary_key=True)
    nfe = models.ForeignKey('NFeEntrada', on_delete=models.CASCADE, related_name='logs')
    acao = models.CharField(max_length=40)  # vinculo_manual, salvar_vinculo, reconciliar, confirmar, etc.
    detalhes = models.TextField(blank=True, null=True)
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    data_cadastro = models.DateTimeField(default=timezone.now)
