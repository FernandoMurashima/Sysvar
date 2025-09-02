export interface Estoque {
  Idestoque?: number;
  CodigodeBarra: string;
  codigoproduto: string;  // referencia
  Idloja: number;
  Estoque: number;
  reserva: number;
  valorestoque: number;
}
