// src/app/core/auth.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
  private userTypeKey = 'user_type';
  private userNameKey = 'user_name';

  get api() { return environment.apiBaseUrl; }
  get apiBaseUrl() { return environment.apiBaseUrl; }

  login(username: string, password: string) {
    return this.http.post<TokenResponse>(`${this.api}/auth/token/`, { username, password })
      .pipe(
        tap(res => this.setToken(res.token)),
        tap(() => {
          // após salvar o token, busca /me para armazenar tipo e nome
          this.me().subscribe({
            next: me => {
              this.setUserType(me.type || 'Regular');
              this.setUserName(me.username || '');
            },
            error: () => {
              this.setUserType('Regular');
              this.setUserName('');
            }
          });
        })
      );
  }

  logout() {
    const token = this.getToken();
    if (!token) {
      this.clearToken();
      return this.http.post(`${this.api}/auth/logout/`, {});
    }
    return this.http.post(`${this.api}/auth/logout/`, {}, { headers: { Authorization: `Token ${token}` } })
      .pipe(tap(() => this.clearToken()));
  }

  me() {
    return this.http.get<MeResponse>(`${this.api}/me/`);
  }

  // --- token helpers (sessionStorage) ---
  setToken(token: string) { sessionStorage.setItem(this.tokenKey, token); }
  getToken() { return sessionStorage.getItem(this.tokenKey); }
  clearToken() {
    sessionStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.userTypeKey);
    sessionStorage.removeItem(this.userNameKey);
  }
  isAuthenticated() { return !!this.getToken(); }

  // --- user type/name helpers (para topo/permissions) ---
  setUserType(type: string) { sessionStorage.setItem(this.userTypeKey, type); }
  getUserType(): string | null { return sessionStorage.getItem(this.userTypeKey); }

  setUserName(username: string) { sessionStorage.setItem(this.userNameKey, username); }
  getUserName(): string | null { return sessionStorage.getItem(this.userNameKey); }
}
