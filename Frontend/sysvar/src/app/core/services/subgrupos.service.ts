import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SubgrupoModel } from '../../core/models/subgrupo';
@Injectable({ providedIn: 'root' })
export class SubgruposService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/subgrupos/`;

  list(params?: { Idgrupo?: number; search?: string; ordering?: string }): Observable<SubgrupoModel[] | any> {
    let httpParams = new HttpParams();
    // IMPORTANTE: o campo no backend chama "Idgrupo" (mesmo case)
    if (params?.Idgrupo != null) httpParams = httpParams.set('Idgrupo', String(params.Idgrupo));
    if (params?.search)          httpParams = httpParams.set('search', params.search);
    if (params?.ordering)        httpParams = httpParams.set('ordering', params.ordering);
    return this.http.get<SubgrupoModel[] | any>(this.base, { params: httpParams });
  }

  get(id: number): Observable<SubgrupoModel> {
    return this.http.get<SubgrupoModel>(`${this.base}${id}/`);
  }

  create(payload: Omit<SubgrupoModel, 'Idsubgrupo' | 'data_cadastro'>): Observable<SubgrupoModel> {
    return this.http.post<SubgrupoModel>(this.base, payload);
  }

  update(id: number, payload: Partial<SubgrupoModel>): Observable<SubgrupoModel> {
    return this.http.put<SubgrupoModel>(`${this.base}${id}/`, payload);
  }

  patch(id: number, payload: Partial<SubgrupoModel>): Observable<SubgrupoModel> {
    return this.http.patch<SubgrupoModel>(`${this.base}${id}/`, payload);
  }

  remove(id: number): Observable<any> {
    return this.http.delete(`${this.base}${id}/`);
  }
}
