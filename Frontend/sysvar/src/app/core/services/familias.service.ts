import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Familia } from '../models/familia';

@Injectable({ providedIn: 'root' })
export class FamiliasService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/familias/`;

  list(params?: { search?: string; ordering?: string; page?: number; page_size?: number }): Observable<Familia[] | any> {
    let httpParams = new HttpParams();
    if (params?.search)    httpParams = httpParams.set('search', params.search);
    if (params?.ordering)  httpParams = httpParams.set('ordering', params.ordering);
    if (params?.page)      httpParams = httpParams.set('page', String(params.page));
    if (params?.page_size) httpParams = httpParams.set('page_size', String(params.page_size));

    return this.http.get<Familia[] | any>(this.base, { params: httpParams });
  }

  get(id: number): Observable<Familia> {
    return this.http.get<Familia>(`${this.base}${id}/`);
  }

  create(payload: Familia): Observable<Familia> {
    return this.http.post<Familia>(this.base, payload);
  }

  update(id: number, payload: Familia): Observable<Familia> {
    return this.http.put<Familia>(`${this.base}${id}/`, payload);
  }

  patch(id: number, payload: Partial<Familia>): Observable<Familia> {
    return this.http.patch<Familia>(`${this.base}${id}/`, payload);
  }

  remove(id: number): Observable<any> {
    return this.http.delete(`${this.base}${id}/`);
  }
}
