// app/core/models/natureza-lancamento.ts
export interface NaturezaLancamento {
  idnatureza?: number;               // PK no backend
  codigo: string;                    // max_length=10
  categoria_principal: string;       // max_length=50
  subcategoria: string;              // max_length=50
  descricao: string;                 // max_length=255
  tipo: string;                      // "Ativo" | "Passivo" | "Patrimônio Líquido" | "Receita" | "Despesa" | "Transferência" | "Investimento" | "Outro"
  status: string;                    // "Ativa" | "Inativa"
  tipo_natureza: string;             // "Analítica" | "Sintética"
}

/** Paginação DRF padrão */
export interface Page<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
