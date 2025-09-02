import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Cliente } from '../models/clientes';

@Injectable({ providedIn: 'root' })
export class ClientesService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/clientes/`;

  list(params?: { search?: string; ordering?: string; page?: number; page_size?: number }): Observable<Cliente[]> {
    let httpParams = new HttpParams();
    if (params?.search)    httpParams = httpParams.set('search', params.search);
    if (params?.ordering)  httpParams = httpParams.set('ordering', params.ordering);
    if (params?.page)      httpParams = httpParams.set('page', String(params.page));
    if (params?.page_size) httpParams = httpParams.set('page_size', String(params.page_size));

    // Caso seu ViewSet não tenha paginação, DRF retorna um array direto
    return this.http.get<Cliente[]>(this.base, { params: httpParams });
  }

  get(id: number): Observable<Cliente> {
    return this.http.get<Cliente>(`${this.base}${id}/`);
  }

  create(payload: Cliente): Observable<Cliente> {
    // Campos opcionais podem ser enviados como undefined; o HttpClient ignora.
    return this.http.post<Cliente>(this.base, payload);
  }

  update(id: number, payload: Cliente): Observable<Cliente> {
    return this.http.put<Cliente>(`${this.base}${id}/`, payload);
  }

  patch(id: number, payload: Partial<Cliente>): Observable<Cliente> {
    return this.http.patch<Cliente>(`${this.base}${id}/`, payload);
  }

  remove(id: number): Observable<any> {
    return this.http.delete(`${this.base}${id}/`);
  }
}
