// src/app/core/models/nav-item.ts
export type UserRole =
  | 'Regular'
  | 'Caixa'
  | 'Gerente'
  | 'Admin'
  | 'Auxiliar'
  | 'Assistente';

export interface NavItem {
  label: string;
  icon?: string;
  link?: string;        // rota direta
  children?: NavItem[]; // submenus
  roles?: UserRole[];   // <- agora usando o tipo exportado
}
