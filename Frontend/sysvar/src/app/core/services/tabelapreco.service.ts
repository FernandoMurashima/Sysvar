import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TabelaPreco } from '../models/tabelapreco';

@Injectable({ providedIn: 'root' })
export class TabelaprecoService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/tabelas-preco/`;

  list(params?: { search?: string; ordering?: string }): Observable<TabelaPreco[] | any> {
    let httpParams = new HttpParams();
    if (params?.search)    httpParams = httpParams.set('search', params.search);
    if (params?.ordering)  httpParams = httpParams.set('ordering', params.ordering);
    return this.http.get<TabelaPreco[] | any>(this.base, { params: httpParams });
  }

  get(id: number): Observable<TabelaPreco> {
    return this.http.get<TabelaPreco>(`${this.base}${id}/`);
  }

  create(payload: TabelaPreco): Observable<TabelaPreco> {
    return this.http.post<TabelaPreco>(this.base, payload);
  }

  update(id: number, payload: TabelaPreco): Observable<TabelaPreco> {
    return this.http.put<TabelaPreco>(`${this.base}${id}/`, payload);
  }

  patch(id: number, payload: Partial<TabelaPreco>): Observable<TabelaPreco> {
    return this.http.patch<TabelaPreco>(`${this.base}${id}/`, payload);
  }

  remove(id: number): Observable<any> {
    return this.http.delete(`${this.base}${id}/`);
  }
}
