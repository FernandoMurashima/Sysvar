// app/core/models/modelo-documento.ts
export interface ModeloDocumento {
  Idmodelo?: number;         // PK (BigAutoField)
  codigo: string;            // max_length=4, unique
  descricao: string;         // max_length=120
  data_inicial: string;      // Date (yyyy-MM-dd)
  data_final?: string | null;// Date (yyyy-MM-dd) | null
  ativo: boolean;            // Boolean
  data_cadastro?: string;    // DateTime ISO (opcional, read-only)
}

/** Paginação DRF padrão (normalizamos no service) */
export interface Page<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}