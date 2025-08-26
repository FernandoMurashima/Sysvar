export interface Funcionario {
  Idfuncionario?: number;

  nomefuncionario: string;
  apelido: string;
  cpf?: string;

  inicio?: string;  // yyyy-MM-dd
  fim?: string;     // yyyy-MM-dd

  categoria: 'Tecnico' | 'Caixa' | 'Gerente' | 'Vendedor' | 'Assistente' | 'Auxiliar' | 'Diretoria';
  meta?: number;

  idloja: number;   // FK (Idloja)

  data_cadastro?: string;
}
