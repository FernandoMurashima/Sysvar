export interface Loja {
  Idloja?: number;
  nome_loja: string;
  Apelido_loja?: string;
  cnpj?: string;

  Logradouro?: string;
  Endereco?: string;
  numero?: string;
  Complemento?: string;
  Cep?: string;
  Bairro?: string;
  Cidade?: string;

  Telefone1?: string;
  Telefone2?: string;
  email?: string;

  EstoqueNegativo?: string;  // "SIM" | "NAO" | null
  Rede?: string;             // "SIM" | "NAO" | null
  DataAbertura?: string;     // yyyy-MM-dd
  ContaContabil?: string;
  DataEnceramento?: string;  // yyyy-MM-dd
  Matriz?: string;           // "SIM" | "NAO" | null

  data_cadastro?: string;
}
