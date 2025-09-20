import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GrupoModel } from '../../core/models/grupo';

@Injectable({ providedIn: 'root' })
export class GruposService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/grupos/`;

  list(params?: { search?: string; ordering?: string; page?: number; page_size?: number }): Observable<GrupoModel[] | any> {
    let httpParams = new HttpParams();
    if (params?.search)    httpParams = httpParams.set('search', params.search);
    if (params?.ordering)  httpParams = httpParams.set('ordering', params.ordering);
    if (params?.page)      httpParams = httpParams.set('page', String(params.page));
    if (params?.page_size) httpParams = httpParams.set('page_size', String(params.page_size));
    return this.http.get<GrupoModel[] | any>(this.base, { params: httpParams });
  }

  get(id: number): Observable<GrupoModel> {
    return this.http.get<GrupoModel>(`${this.base}${id}/`);
  }

  create(payload: Omit<GrupoModel, 'Idgrupo' | 'data_cadastro'>): Observable<GrupoModel> {
    return this.http.post<GrupoModel>(this.base, payload);
  }

  update(id: number, payload: Partial<GrupoModel>): Observable<GrupoModel> {
    return this.http.put<GrupoModel>(`${this.base}${id}/`, payload);
  }

  patch(id: number, payload: Partial<GrupoModel>): Observable<GrupoModel> {
    return this.http.patch<GrupoModel>(`${this.base}${id}/`, payload);
  }

  remove(id: number): Observable<any> {
    return this.http.delete(`${this.base}${id}/`);
  }
}
