from django.contrib import admin
from .models import Produto

@admin.register(Produto)
class ProdutoAdmin(admin.ModelAdmin):
    # Mostra colunas úteis na listagem
    list_display = ('referencia', 'Descricao', 'colecao', 'grupo', 'subgrupo', 'Ativo', 'data_cadastro')
    search_fields = ('Descricao', 'referencia', 'grupo', 'subgrupo', 'colecao')
    list_filter = ('Ativo', 'colecao', 'grupo')

    # Campos somente leitura (mesmo com editable=False no model, coloque aqui para aparecer)
    readonly_fields = ('referencia', 'data_cadastro', 'inativado_em', 'inativado_por')

    # NÃO use 'exclude' aqui, para não esconder nada por engano.
    # Se quiser controlar a ordem/seções e garantir que tudo apareça, use fieldsets:
    fieldsets = (
        ('Identificação', {
            'fields': ('referencia', 'Tipoproduto', 'Descricao', 'Desc_reduzida')
        }),
        ('Classificação', {
            'fields': ('colecao', 'grupo', 'subgrupo', 'familia', 'unidade', 'grade', 'classificacao_fiscal')
        }),
        ('Imagens', {
            'fields': ('produto_foto', 'produto_foto1', 'produto_foto2')
        }),
        ('Status', {
            'fields': ('Ativo', 'inativado_em', 'inativado_por')
        }),
        ('Auditoria', {
            'fields': ('data_cadastro',),
        }),
    )
