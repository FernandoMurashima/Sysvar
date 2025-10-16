// src/app/layout/shell/shell.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

import { AuthService } from '../../core/auth.service';
import { NavItem } from '../../core/models/nav-item';
import { NavItemComponent } from '../../shared/nav-item/nav-item.component';
import { PermissionService } from '../../core/permission.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, NavItemComponent],
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.css']
})
export class ShellComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private perm = inject(PermissionService);

  sidebarOpen = true;

  menuItems: NavItem[] = [
    { label: 'Home', link: '/home', icon: 'bi bi-house', roles: ['Regular'] },

    {
      label: 'Cadastros', icon: 'bi bi-journal-text', roles: ['Regular'],
      children: [
        { label: 'Lojas',        link: '/lojas',        icon: 'bi bi-shop',          roles: ['Regular'] },
        { label: 'Clientes',     link: '/clientes',     icon: 'bi bi-people',        roles: ['Regular'] },
        { label: 'Fornecedores', link: '/fornecedores', icon: 'bi bi-truck',         roles: ['Regular'] },
        { label: 'Funcionários', link: '/funcionarios', icon: 'bi bi-person-badge',  roles: ['Regular'] },
      ]
    },

    {
      label: 'Produtos', icon: 'bi bi-box-seam', roles: ['Regular'],
      children: [
        { label: 'Produtos',   link: '/produtos',   icon: 'bi bi-box',           roles: ['Regular'] },
        { label: 'Grupos',     link: '/grupos',     icon: 'bi bi-diagram-2',     roles: ['Regular'] },        
        { label: 'Famílias',   link: '/familias',   icon: 'bi bi-collection',    roles: ['Regular'] },
        { label: 'Cores',      link: '/cores',      icon: 'bi bi-palette',       roles: ['Regular'] },
        { label: 'Grades',     link: '/grades',     icon: 'bi bi-grid',          roles: ['Regular'] },
        { label: 'Coleções',   link: '/colecoes',   icon: 'bi bi-layers',        roles: ['Regular'] },
        { label: 'Unidades',   link: '/unidades',   icon: 'bi bi-bounding-box',  roles: ['Regular'] },
      ]
    },

    {
  label: 'Estoque', icon: 'bi bi-archive', roles: ['Regular'],
  children: [
    {
      label: 'Consultas', icon: 'bi bi-search', roles: ['Regular'],
      children: [
        { label: 'Por Referência', link: '/estoque/consulta-referencia', icon: 'bi bi-dot', roles: ['Regular'] },
        // adicione outras consultas aqui:
        // { label: 'Por EAN',       link: '/estoque/consulta-ean',         icon: 'bi bi-dot', roles: ['Regular'] },
        // { label: 'Por Loja',      link: '/estoque/consulta-loja',        icon: 'bi bi-dot', roles: ['Regular'] },
      ]
    },
    { label: 'Movimentações', link: '/estoque/movimentacoes', icon: 'bi bi-arrow-left-right', roles: ['Regular'] },
    { label: 'Inventário',    link: '/estoque/inventario',    icon: 'bi bi-clipboard-data',  roles: ['Regular'] },
  ]
},


    {
      label: 'Faturamento', icon: 'bi bi-receipt', roles: ['Regular'],
      children: [
        { label: 'Nota Fiscal'          , link: '/vendas/nota',       icon: 'bi bi-cash',                   roles: ['Regular'] },
        { label: 'Devoluções de vendas' , link: '/vendas/devolucoes', icon: 'bi bi-arrow-counterclockwise', roles: ['Regular'] },
        { label: 'Tabela de Preço'      , link: '/vendas/tabelas'   , icon: 'bi bi-arrow-counterclockwise', roles: ['Regular'] },
      ]
    },

    {
      label: 'Compras', icon: 'bi bi-receipt', roles: ['Regular'],
      children: [
        
        { label: 'Pedido de Compra'          , link: '/compras/pedidos'      , icon: 'bi bi-bag-check',              roles: ['Regular'] },
        { label: 'Devoluções'                  , link: '/compras/devolucoes'   , icon: 'bi bi-arrow-counterclockwise', roles: ['Regular'] },
        { label: 'Cotação de Compras'          , link: '/compras/cotacoes'     , icon: 'bi bi-arrow-counterclockwise', roles: ['Regular'] },
        { label: 'Entrada de Nf-e'             , link: '/compras/nfe/upload'   , icon: 'bi bi-arrow-counterclockwise', roles: ['Regular'] },
        { label: 'Trocas'                      , link: '/compras/trocas'       , icon: 'bi bi-arrow-counterclockwise', roles: ['Regular'] },
        { label: 'Notas Lançadas'              , link: '/compras/notas'        , icon: 'bi bi-arrow-counterclockwise', roles: ['Regular'] },

      ]
    },

    {
      label: 'Financeiro', icon: 'bi bi-cash-coin', roles: ['Regular'],
      children: [
        { label: 'Contas a Receber',          link: '/financeiro/receber',       icon: 'bi bi-cash-stack',       roles: ['Regular'] },
        { label: 'Contas a Pagar',            link: '/financeiro/pagar',         icon: 'bi bi-wallet2',          roles: ['Regular'] },
        { label: 'Caixa',                     link: '/financeiro/caixa',         icon: 'bi bi-safe',             roles: ['Regular'] },
        { label: 'Contas Bancárias',          link: '/financeiro/contas',        icon: 'bi bi-bank',             roles: ['Regular'] },
        { label: 'Movimentações Financeiras', link: '/financeiro/movimentacoes', icon: 'bi bi-arrow-left-right', roles: ['Regular'] },
      ]
    },

    {
      label: 'Relatórios', icon: 'bi bi-graph-up', roles: ['Regular'],
      children: [
        { label: 'Vendas'     ,  link: '/relatorios/vendas',     icon: 'bi bi-bar-chart', roles: ['Regular'] },
        { label: 'Financeiro' ,  link: '/relatorios/financeiro', icon: 'bi bi-pie-chart', roles: ['Regular'] },
        { label: 'Estoque'    ,  link: '/relatorios/estoque',    icon: 'bi bi-clipboard', roles: ['Regular'] },
        { label: 'Compras'    ,  link: '/relatorios/compras',    icon: 'bi bi-clipboard', roles: ['Regular'] },
        

      ]
    },

    {
      label: 'Configurações', icon: 'bi bi-gear', roles: ['Regular'],
      children: [
        { label: 'Usuários',               link: '/config/usuarios',           icon: 'bi bi-person-gear',  roles: ['Regular'] },
        { label: 'Perfis/Acessos',         link: '/config/perfis',             icon: 'bi bi-shield-lock',  roles: ['Regular'] },
        { label: 'Modelo de Documentos',   link: '/config/modelos',            icon: 'bi bi-sliders',      roles: ['Regular'] },
        { label: 'Natureza de Lançamento', link: '/config/contas',             icon: 'bi bi-sliders',      roles: ['Regular'] },
        { label: 'Tabela de Preços',       link: '/config/precos',             icon: 'bi bi-table',        roles: ['Regular'] },
        { label: 'Impostos / NCM',         link: '/config/impostos',           icon: 'bi bi-percent',      roles: ['Regular'] },
        { label: 'Estoque Lançamento',     link: '/config/estoque-lancamento', icon: 'bi bi-percent',      roles: ['Regular'] },
        { label: 'Formas de Pagamento',    link: '/config/forma_pagamentos',   icon: 'bi bi-percent',      roles: ['Regular'] },
        
      ]
    },
  ];

  get filteredMenu(): NavItem[] {
    return this.perm.filterMenu(this.menuItems);
  }

  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; }

  sair() {
    this.auth.clearToken();
    this.router.navigateByUrl('/login');
  }

  // Getters únicos (NÃO declare outra propriedade/variável com o mesmo nome)
  get userName(): string {
    return this.auth.getUserName() || 'Usuário';
  }


  get userType(): string {
    const raw = this.auth.getUserType() || '';
    const t = raw.toLowerCase().trim();

    const map: Record<string, string> = {
      'admin': 'Admin',
      'administrador': 'Admin',
      'regular': 'Regular',
      'user': 'Regular',
      'usuário': 'Regular',
      'usuario': 'Regular',
    };

  return map[t] ?? raw ;
  }

}
