export interface Grade {
  Idgrade?: number;
  Descricao: string;
  Status?: string | null;
  data_cadastro?: string; // readonly do backend
}
