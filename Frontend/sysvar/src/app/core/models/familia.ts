export interface Familia {
  Idfamilia?: number;
  Descricao: string;
  Codigo?: string | null;
  Margem?: number;          // decimal; tratamos como number no front
  data_cadastro?: string;   // readonly (backend)
}
