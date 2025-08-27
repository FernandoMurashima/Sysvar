export interface GrupoModel {
  Idgrupo?: number;        // PK (readonly no front)
  Codigo: string;          // ex.: "10"
  Descricao: string;       // ex.: "Calça"
  Margem: number;          // ex.: 10.00
  data_cadastro?: string;  // ISO (readonly)
}

export type CreateGrupoDto = Omit<GrupoModel, 'Idgrupo' | 'data_cadastro'>;
export type UpdateGrupoDto = Partial<CreateGrupoDto>;
