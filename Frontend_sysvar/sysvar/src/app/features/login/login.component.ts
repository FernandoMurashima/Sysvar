// src/app/features/login/login.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html'
})
export class LoginComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  username = '';
  password = '';
  loading = false;
  errorMsg = '';

  ngOnInit(): void {
    // Se já estiver autenticado e tentar acessar /login, manda para /home
    if (this.auth.isAuthenticated()) {
      this.router.navigateByUrl('/home');
    }
  }

  onSubmit() {
    this.errorMsg = '';
    this.loading = true;
    this.auth.login(this.username, this.password).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigateByUrl('/home');   // <- navega após sucesso
      },
      error: () => {
        this.loading = false;
        this.errorMsg = 'Falha no login. Verifique usuário/senha.';
      }
    });
  }
}
