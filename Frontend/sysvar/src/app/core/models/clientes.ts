export interface Cliente {
  Idcliente?: number;
  Nome_cliente: string;
  Apelido?: string;
  cpf?: string;
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
  Categoria?: string;
  Bloqueio?: boolean;
  Aniversario?: string;     // yyyy-MM-dd (ou Date se preferir converter)
  MalaDireta?: boolean;
  ContaContabil?: string;
  data_cadastro?: string;   // readonly vindo do backend
}
