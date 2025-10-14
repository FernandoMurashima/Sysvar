// src/app/core/models/colecoes.ts
// src/app/core/models/colecoes.ts
export type CodigoEstacao = '01' | '02' | '03' | '04';
// Mapeamento canônico que combinamos: 01=Primavera, 02=Verão, 03=Outono, 04=Inverno
export const ESTACOES: { value: CodigoEstacao; label: string }[] = [
  { value: '01', label: 'Primavera' },
  { value: '02', label: 'Verão' },
  { value: '03', label: 'Outono' },
  { value: '04', label: 'Inverno' },
];

export type StatusColecao = 'CR' | 'PD' | 'AT' | 'EN' | 'AR';
export const STATUS_COLECAO: { value: StatusColecao; label: string }[] = [
  { value: 'CR', label: 'Criação' },
  { value: 'PD', label: 'Produção' },
  { value: 'AT', label: 'Ativa' },
  { value: 'EN', label: 'Encerrada' },
  { value: 'AR', label: 'Arquivada' },
];

export interface Colecao {
  Idcolecao?: number;
  Descricao: string;
  Codigo: string;                  // 2 chars (ex.: "25")
  Estacao: CodigoEstacao;          // 2 chars (ex.: "01")
  Status?: StatusColecao | null;   // Opção A (CR, PD, AT, EN, AR)
  Contador?: number | null;        // readonly no backend (referência)
  data_cadastro?: string;          // readonly
}

