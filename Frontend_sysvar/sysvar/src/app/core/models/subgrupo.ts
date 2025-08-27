export interface SubgrupoModel {
  Idsubgrupo?: number;     // PK (readonly no front)
  Idgrupo: number;         // FK -> Grupo (ID numérico)
  Descricao: string;       // ex.: "Jeans"
  Margem: number;          // ex.: 10.00
  data_cadastro?: string;  // ISO (readonly)
}

export type CreateSubgrupoDto = Omit<SubgrupoModel, 'Idsubgrupo' | 'data_cadastro'>;
export type UpdateSubgrupoDto = Partial<CreateSubgrupoDto>;
