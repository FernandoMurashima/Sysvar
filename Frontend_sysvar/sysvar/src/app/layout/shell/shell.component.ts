import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

import { AuthService } from '../../core/auth.service';
import { NavItem } from '../../core/models/nav-item';
import { NavItemComponent } from '../../shared/nav-item/nav-item.component';

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

  sidebarOpen = true;

  // Menu plano (sem submenus por enquanto)
/*   menuItems: NavItem[] = [
    { label: 'Home',        link: '/home',        icon: 'bi bi-house' },
    { label: 'Lojas',       link: '/lojas',       icon: 'bi bi-shop' },
    { label: 'Clientes',    link: '/clientes',    icon: 'bi bi-people' },
    { label: 'Produtos',    link: '/produtos',    icon: 'bi bi-box-seam' },
    { label: 'Estoque',     link: '/estoque',     icon: 'bi bi-archive' },
    { label: 'Vendas',      link: '/vendas',      icon: 'bi bi-receipt' },
    { label: 'Financeiro',  link: '/financeiro',  icon: 'bi bi-cash-coin' },
    { label: 'Relatórios',  link: '/relatorios',  icon: 'bi bi-graph-up' },
    { label: 'Configurações', link: '/config',    icon: 'bi bi-gear' },
  ]; */

  menuItems: NavItem[] = [
  { label: 'Home', link: '/home', icon: 'bi bi-house' },

  {
    label: 'Cadastros', icon: 'bi bi-folder',
    children: [
      { label: 'Lojas',      link: '/lojas',      icon: 'bi bi-shop' },
      { label: 'Clientes',   link: '/clientes',   icon: 'bi bi-people' },
      { label: 'Produtos',   link: '/produtos',   icon: 'bi bi-box-seam' },
    ]
  },

  { label: 'Estoque',    link: '/estoque',    icon: 'bi bi-archive' },
  { label: 'Vendas',     link: '/vendas',     icon: 'bi bi-receipt' },
  { label: 'Financeiro', link: '/financeiro', icon: 'bi bi-cash-coin' },
  { label: 'Relatórios', link: '/relatorios', icon: 'bi bi-graph-up' },
  { label: 'Configurações', link: '/config',  icon: 'bi bi-gear' },
];



  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; }

  sair() {
    this.auth.clearToken();
    this.router.navigateByUrl('/login');
  }
}
