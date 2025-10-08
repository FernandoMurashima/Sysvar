export interface PedidoCompraRow {
  Idpedidocompra: number;
  Documento: string | null;
  Datapedido: string | null;   // ISO YYYY-MM-DD
  Dataentrega: string | null;  // ISO YYYY-MM-DD
  Status: 'AB' | 'AP' | 'CA' | string;
  Valorpedido: string;         // decimal em string
  fornecedor_nome: string;
  loja_nome: string;
}

export interface PedidoCompraFiltro {
  ordering?: string; // ex: "-Datapedido,Idpedidocompra"
  status?: string;
  fornecedor?: number;
  q_fornecedor?: string;
  loja?: number;
  doc?: string;
  emissao_de?: string;   // YYYY-MM-DD
  emissao_ate?: string;
  entrega_de?: string;
  entrega_ate?: string;
  total_min?: number;
  total_max?: number;
}
