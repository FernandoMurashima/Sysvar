// src/app/core/models/colecoes.ts
export interface Colecao {
  Idcolecao?: number;
  Descricao: string;
  Codigo: string;     // 2 chars (ex.: "25")
  Estacao: string;    // 2 chars (ex.: "01")
  Status?: string | null;
  Contador?: number | null;  // readonly no backend (usado para referência)
  data_cadastro?: string;    // readonly
}
