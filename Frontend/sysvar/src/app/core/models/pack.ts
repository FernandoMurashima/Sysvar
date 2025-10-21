export interface PackItemDTO {
  id?: number;
  tamanho: number;          // Idtamanho
  tamanho_label?: string;   // opcional para exibir no front
  qtd: number;
}

export interface PackDTO {
  id?: number;              // pk
  nome: string | null;
  grade: number;            // Idgrade
  ativo: boolean;
  itens: PackItemDTO[];

  data_cadastro?: string;
  atualizado_em?: string;
}

/** auxiliares para selects */
export interface GradeDTO {
  Idgrade: number;
  Descricao: string;
}

export interface TamanhoDTO {
  Idtamanho: number;
  Descricao: string;
  Tamanho: string;
}
