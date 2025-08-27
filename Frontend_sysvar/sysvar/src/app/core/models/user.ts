export interface User {
  id?: number;
  username: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  type: 'Regular' | 'Caixa' | 'Gerente' | 'Admin' | 'Auxiliar' | 'Assistente';
  password?: string; // write-only no backend; só enviar em criação/alteração de senha
}
