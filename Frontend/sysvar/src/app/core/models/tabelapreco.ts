export interface TabelaPreco {
  Idtabela?: number;
  NomeTabela: string;
  DataInicio: string;  // 'YYYY-MM-DD'
  Promocao: string;    // 'SIM' | 'NAO'
  DataFim: string;     // 'YYYY-MM-DD'
  data_cadastro?: string;
}
