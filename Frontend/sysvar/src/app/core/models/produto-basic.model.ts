export interface ProdutoBasic {
  Idproduto: number;
  Referencia: string;

  Nome_produto: string;
  Descricao?: string;

  // IDs ainda existem, mas não vamos mostrar no card
  Idcolecao?: number | string | null;
  Idgrupo?: number | string | null;
  Idsubgrupo?: number | string | null;
  Idunidade?: number | string | null;

  // Campos de exibição (se o backend retornar; senão mostramos só códigos)
  ColecaoCodigo?: string | null;
  ColecaoDescricao?: string | null;
  Estacao?: string | null;

  GrupoCodigo?: string | null;
  GrupoDescricao?: string | null;

  SubgrupoDescricao?: string | null;

  UnidadeDescricao?: string | null;
  UnidadeSigla?: string | null;

  Ncm?: string | null;

  // Preço
  Preco?: number | null;      // preferencial
  PrecoBase?: number | null;  // fallback

  Marca?: string | null;
  Ativo?: boolean | null;
}
