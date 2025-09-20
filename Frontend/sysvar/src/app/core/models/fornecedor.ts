export interface Fornecedor {
  Idfornecedor?: number;

  Nome_fornecedor: string;
  Apelido: string;
  Cnpj: string;

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

  Categoria?: string;      // A | B | C | D | E (default C)
  Bloqueio?: boolean;
  MalaDireta?: boolean;

  ContaContabil?: string;

  data_cadastro?: string;
}
