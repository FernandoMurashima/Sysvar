export interface ProdutoDetalhe {
  Idprodutodetalhe?: number;
  CodigodeBarra: string;          // único
  Codigoproduto: string;          // referencia
  Idproduto: number;
  Idtamanho: number;
  Idcor: number;
  Item?: number | null;
  data_cadastro?: string;
}
