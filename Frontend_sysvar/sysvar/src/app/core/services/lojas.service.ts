import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Loja } from '../models/loja';

@Injectable({ providedIn: 'root' })
export class LojasService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/lojas/`;

  list(params?: { search?: string; ordering?: string; page?: number; page_size?: number }): Observable<Loja[]> {
    let httpParams = new HttpParams();
    if (params?.search)    httpParams = httpParams.set('search', params.search);
    if (params?.ordering)  httpParams = httpParams.set('ordering', params.ordering);
    if (params?.page)      httpParams = httpParams.set('page', String(params.page));
    if (params?.page_size) httpParams = httpParams.set('page_size', String(params.page_size));
    return this.http.get<Loja[]>(this.base, { params: httpParams });
  }

  get(id: number): Observable<Loja> {
    return this.http.get<Loja>(`${this.base}${id}/`);
  }

  create(payload: Loja): Observable<Loja> {
    return this.http.post<Loja>(this.base, payload);
  }

  update(id: number, payload: Loja): Observable<Loja> {
    return this.http.put<Loja>(`${this.base}${id}/`, payload);
  }

  patch(id: number, payload: Partial<Loja>): Observable<Loja> {
    return this.http.patch<Loja>(`${this.base}${id}/`, payload);
  }

  remove(id: number): Observable<any> {
    return this.http.delete(`${this.base}${id}/`);
  }
}
