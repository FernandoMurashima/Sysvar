// src/app/app.routes.ts
import { Routes } from '@angular/router';

import { LoginComponent } from './features/login/login.component';
import { HomeComponent } from './features/home/home.component';
import { authGuard } from './core/guards/auth.guard';
import { ShellComponent } from './layout/shell/shell.component';

import { ClientesComponent } from './features/clientes/clientes.component';
import { LojasComponent } from './features/lojas/lojas.component';
import { FornecedoresComponent } from './features/fornecedores/fornecedores.component';
import { FuncionariosComponent } from './features/funcionarios/funcionarios.component';
// usuários
import { UsuariosComponent } from './features/usuarios/usuarios.component';
// ⬇️ novo
import { ColecoesComponent } from './features/colecoes/colecoes.component';
import { FamiliasComponent } from './features/familias/familias.component';
import { UnidadesComponent } from './features/unidades/unidades.component';
import { CoresComponent } from './features/cores/cores.component';
import { GradesComponent } from './features/grades/grades.component';
import { GruposComponent } from './features/grupos/grupos.component';
import { TabelasPrecoComponent } from './features/tabelas-preco/tabelas-preco.component';
import { ProdutosComponent } from './features/produtos/produtos.component';
import { EstoqueLancamentoComponent } from './features/estoque-lancamento/estoque-lancamento.component';
import { FormaPagamentosComponent } from './features/forma-pagamentos/forma-pagamentos.component';


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
      { path: 'funcionarios', component: FuncionariosComponent },

      { path: 'config/usuarios', component: UsuariosComponent },

      // ⬇️ rota de coleções
      { path: 'colecoes', component: ColecoesComponent },
      { path: 'familias', component: FamiliasComponent },
      { path: 'unidades', component: UnidadesComponent },
      { path: 'cores', component: CoresComponent },
      { path: 'grades', component: GradesComponent },
      { path: 'grupos', component: GruposComponent }, 
      { path: 'vendas/tabelas', component: TabelasPrecoComponent },
      { path: 'produtos', component: ProdutosComponent },
      { path: 'config/estoque-lancamento', component: EstoqueLancamentoComponent },
      { path: 'config/forma_pagamentos', component: FormaPagamentosComponent },
      
      { path: 'compras/pedidos', loadComponent: () => import('./features/pedidos-compra/pedidos/pedidos.component') .then(m => m.PedidosComponent), },
      { path: '', pathMatch: 'full', redirectTo: 'home' }
    ]
  },

  { path: '**', redirectTo: '' }
];
