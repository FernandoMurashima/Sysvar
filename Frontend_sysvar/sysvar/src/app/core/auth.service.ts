// src/app/core/services/auth.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

interface TokenResponse { token: string; }
interface MeResponse {
  id: number; username: string; first_name: string; last_name: string; email: string; type: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private tokenKey = 'auth_token';

  // garante que não termina com barra
  private base = environment.apiBaseUrl.replace(/\/$/, '');

  login(username: string, password: string) {
    const url = `${this.base}/auth/token/`;
    return this.http.post<TokenResponse>(url, { username, password })
      .pipe(tap(res => this.setToken(res.token)));
  }

  logout() {
    const token = this.getToken();
    if (!token) { this.clearToken(); return; }
    const url = `${this.base}/auth/logout/`;
    return this.http.post(url, {}, { headers: { Authorization: `Token ${token}` } })
      .pipe(tap(() => this.clearToken()));
  }

  me() {
    const url = `${this.base}/me/`;
    return this.http.get<MeResponse>(url);
  }

  setToken(token: string) { sessionStorage.setItem(this.tokenKey, token); }
  getToken() { return sessionStorage.getItem(this.tokenKey); }
  clearToken() { sessionStorage.removeItem(this.tokenKey); }
  isAuthenticated() { return !!this.getToken(); }
}
