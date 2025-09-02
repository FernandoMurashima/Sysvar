import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Fornecedor } from '../models/fornecedor';

@Injectable({ providedIn: 'root' })
export class FornecedoresService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/fornecedores/`;

  list(params?: { search?: string; ordering?: string; page?: number; page_size?: number }): Observable<Fornecedor[]> {
    let httpParams = new HttpParams();
    if (params?.search)    httpParams = httpParams.set('search', params.search);
    if (params?.ordering)  httpParams = httpParams.set('ordering', params.ordering);
    if (params?.page)      httpParams = httpParams.set('page', String(params.page));
    if (params?.page_size) httpParams = httpParams.set('page_size', String(params.page_size));

    return this.http.get<Fornecedor[]>(this.base, { params: httpParams });
  }

  get(id: number): Observable<Fornecedor> {
    return this.http.get<Fornecedor>(`${this.base}${id}/`);
  }

  create(payload: Fornecedor): Observable<Fornecedor> {
    return this.http.post<Fornecedor>(this.base, payload);
  }

  update(id: number, payload: Fornecedor): Observable<Fornecedor> {
    return this.http.put<Fornecedor>(`${this.base}${id}/`, payload);
  }

  patch(id: number, payload: Partial<Fornecedor>): Observable<Fornecedor> {
    return this.http.patch<Fornecedor>(`${this.base}${id}/`, payload);
  }

  remove(id: number): Observable<any> {
    return this.http.delete(`${this.base}${id}/`);
  }
}
