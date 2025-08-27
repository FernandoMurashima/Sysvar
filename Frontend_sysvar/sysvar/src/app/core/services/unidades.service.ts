import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Unidade } from '../models/unidade';

@Injectable({ providedIn: 'root' })
export class UnidadesService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/unidades/`;

  list(params?: { search?: string; ordering?: string; page?: number; page_size?: number }): Observable<Unidade[] | any> {
    let httpParams = new HttpParams();
    if (params?.search)    httpParams = httpParams.set('search', params.search);
    if (params?.ordering)  httpParams = httpParams.set('ordering', params.ordering);
    if (params?.page)      httpParams = httpParams.set('page', String(params.page));
    if (params?.page_size) httpParams = httpParams.set('page_size', String(params.page_size));
    return this.http.get<Unidade[] | any>(this.base, { params: httpParams });
  }

  get(id: number): Observable<Unidade> {
    return this.http.get<Unidade>(`${this.base}${id}/`);
  }

  create(payload: Unidade): Observable<Unidade> {
    return this.http.post<Unidade>(this.base, payload);
  }

  update(id: number, payload: Unidade): Observable<Unidade> {
    return this.http.put<Unidade>(`${this.base}${id}/`, payload);
  }

  patch(id: number, payload: Partial<Unidade>): Observable<Unidade> {
    return this.http.patch<Unidade>(`${this.base}${id}/`, payload);
  }

  remove(id: number): Observable<any> {
    return this.http.delete(`${this.base}${id}/`);
  }
}
