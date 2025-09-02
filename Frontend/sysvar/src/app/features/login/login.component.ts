// src/app/features/login/login.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = false;
  errorMsg = '';
  successMsg = '';

  form = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(4)]],
  });

  submit() {
    this.errorMsg = '';
    this.successMsg = '';
    if (this.form.invalid || this.loading) return;

    this.loading = true;
    const { username, password } = this.form.value;

    this.auth.login(username!, password!).subscribe({
      next: () => {
        this.successMsg = 'Login realizado com sucesso!';
        // pequeno delay só para o usuário ver o feedback
        setTimeout(() => this.router.navigateByUrl('/home'), 400);
      },
      error: (err) => {
        // tenta extrair mensagem vinda do backend; cai em genérica se não houver
        const detail = err?.error?.detail || err?.error?.error || '';
        this.errorMsg = detail ? String(detail) : 'Falha no login. Verifique usuário e senha.';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }
}