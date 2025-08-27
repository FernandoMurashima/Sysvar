// src/app/core/services/colecoes.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Colecao } from '../models/colecoes';

@Injectable({ providedIn: 'root' })
export class ColecoesService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/colecoes/`;

  list(params?: { search?: string; ordering?: string; page?: number; page_size?: number }): Observable<any> {
    let hp = new HttpParams();
    if (params?.search)    hp = hp.set('search', params.search);
    if (params?.ordering)  hp = hp.set('ordering', params.ordering);
    if (params?.page)      hp = hp.set('page', String(params.page));
    if (params?.page_size) hp = hp.set('page_size', String(params.page_size));
    return this.http.get(this.base, { params: hp });
  }

  get(id: number): Observable<Colecao> {
    return this.http.get<Colecao>(`${this.base}${id}/`);
  }

  create(payload: Colecao): Observable<Colecao> {
    return this.http.post<Colecao>(this.base, payload);
  }

  update(id: number, payload: Colecao): Observable<Colecao> {
    return this.http.put<Colecao>(`${this.base}${id}/`, payload);
  }

  patch(id: number, payload: Partial<Colecao>): Observable<Colecao> {
    return this.http.patch<Colecao>(`${this.base}${id}/`, payload);
  }

  remove(id: number): Observable<any> {
    return this.http.delete(`${this.base}${id}/`);
  }
}
