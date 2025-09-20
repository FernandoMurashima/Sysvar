export interface CorModel {
  Idcor?: number;
  Descricao: string;
  Codigo?: string | null;
  Cor: string;              // nome da cor (ex.: Azul, Vermelho)
  Status?: string | null;   // opcional: 'Ativo' | 'Inativo' | ''
  data_cadastro?: string;   // readonly (backend)
}
