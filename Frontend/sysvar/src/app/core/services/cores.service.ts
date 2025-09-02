import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CorModel } from '../models/cor';

@Injectable({ providedIn: 'root' })
export class CoresService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/cores/`;

  list(params?: { search?: string; ordering?: string; page?: number; page_size?: number }): Observable<CorModel[] | any> {
    let httpParams = new HttpParams();
    if (params?.search)    httpParams = httpParams.set('search', params.search);
    if (params?.ordering)  httpParams = httpParams.set('ordering', params.ordering);
    if (params?.page)      httpParams = httpParams.set('page', String(params.page));
    if (params?.page_size) httpParams = httpParams.set('page_size', String(params.page_size));
    return this.http.get<CorModel[] | any>(this.base, { params: httpParams });
  }

  get(id: number): Observable<CorModel> {
    return this.http.get<CorModel>(`${this.base}${id}/`);
  }

  create(payload: CorModel): Observable<CorModel> {
    return this.http.post<CorModel>(this.base, payload);
  }

  update(id: number, payload: CorModel): Observable<CorModel> {
    return this.http.put<CorModel>(`${this.base}${id}/`, payload);
  }

  patch(id: number, payload: Partial<CorModel>): Observable<CorModel> {
    return this.http.patch<CorModel>(`${this.base}${id}/`, payload);
  }

  remove(id: number): Observable<any> {
    return this.http.delete(`${this.base}${id}/`);
  }
}
