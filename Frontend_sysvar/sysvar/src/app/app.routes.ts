import { Routes } from '@angular/router';

import { LoginComponent } from './features/login/login.component';
import { HomeComponent } from './features/home/home.component';
import { authGuard } from './core/guards/auth.guard';
import { ShellComponent } from './layout/shell/shell.component';

import { ClientesComponent } from './features/clientes/clientes.component';
import { LojasComponent } from './features/lojas/lojas.component';
import { FornecedoresComponent } from './features/fornecedores/fornecedores.component';
import { FuncionariosComponent } from './features/funcionarios/funcionarios.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },

  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: 'home', component: HomeComponent },

      { path: 'clientes', component: ClientesComponent },
      { path: 'lojas', component: LojasComponent },
      { path: 'fornecedores', component: FornecedoresComponent },
      { path: 'funcionarios', component: FuncionariosComponent },  // ← NOVO

      { path: '', pathMatch: 'full', redirectTo: 'home' }
    ]
  },

  { path: '**', redirectTo: '' }
];
