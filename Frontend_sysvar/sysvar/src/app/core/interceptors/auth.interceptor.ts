// src/app/core/interceptors/auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../auth.service';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();

  // normaliza a base e detecta chamadas para a API
  const base = environment.apiBaseUrl.replace(/\/$/, '');
  const isApiCall =
    req.url.startsWith(base) ||            // ex.: http://127.0.0.1:8000/api/...
    req.url.startsWith('/api');            // ex.: /api/... (quando usando proxy)

  if (token && isApiCall) {
    req = req.clone({
      setHeaders: { Authorization: `Token ${token}` },
    });
  }

  return next(req);
};
