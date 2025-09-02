import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TamanhoModel } from '../models/tamanho';

@Injectable({ providedIn: 'root' })
export class TamanhosService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/tamanhos/`;

  list(params?: { idgrade?: number; search?: string; ordering?: string }): Observable<TamanhoModel[] | any> {
    let httpParams = new HttpParams();
    if (params?.idgrade)   httpParams = httpParams.set('idgrade', String(params.idgrade));
    if (params?.search)    httpParams = httpParams.set('search', params.search);
    if (params?.ordering)  httpParams = httpParams.set('ordering', params.ordering);
    return this.http.get<TamanhoModel[] | any>(this.base, { params: httpParams });
  }

  get(id: number): Observable<TamanhoModel> {
    return this.http.get<TamanhoModel>(`${this.base}${id}/`);
  }

  create(payload: TamanhoModel): Observable<TamanhoModel> {
    return this.http.post<TamanhoModel>(this.base, payload);
  }

  update(id: number, payload: TamanhoModel): Observable<TamanhoModel> {
    return this.http.put<TamanhoModel>(`${this.base}${id}/`, payload);
  }

  patch(id: number, payload: Partial<TamanhoModel>): Observable<TamanhoModel> {
    return this.http.patch<TamanhoModel>(`${this.base}${id}/`, payload);
  }

  remove(id: number): Observable<any> {
    return this.http.delete(`${this.base}${id}/`);
  }
}
