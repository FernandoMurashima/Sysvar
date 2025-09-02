import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PdvService {
  // Ajuste se o seu prefixo for diferente
  private base = '/api';

  constructor(private http: HttpClient) {}

  buscarPorEan(ean: string, lojaId: number): Observable<any> {
    // ajuste o endpoint conforme seu backend
    const params = new HttpParams().set('ean', ean).set('loja', String(lojaId));
    return this.http.get<any>(`${this.base}/pdv/produto-ean/`, { params });
  }

  buscar(q: string, lojaId?: number): Observable<any> {
    let params = new HttpParams().set('q', q);
    if (lojaId) params = params.set('loja', String(lojaId));
    return this.http.get<any>(`${this.base}/pdv/produtos/`, { params });
  }

  finalizarVenda(payload: any): Observable<any> {
    return this.http.post<any>(`${this.base}/pdv/vendas/`, payload);
  }
}
