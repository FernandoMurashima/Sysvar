export interface TamanhoModel {
  Idtamanho?: number;
  idgrade: number;           // FK -> Grade
  Tamanho: string;           // ex.: P, M, G, 36, 38...
  Descricao?: string | null; // ex.: "Tamanho", "Adulto", etc.
  Status?: string | null;
  data_cadastro?: string;    // readonly
}
