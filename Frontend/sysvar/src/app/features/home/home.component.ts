import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  me?: { username: string; first_name: string; last_name: string; email: string; type: string };

  ngOnInit() {
    this.auth.me().subscribe({
      next: (data) => this.me = data,
      error: () => this.me = undefined
    });
  }

  sair() {
    // como estamos usando sessionStorage, basta limpar e ir pro login
    this.auth.clearToken();
    this.router.navigateByUrl('/login');
  }
}
