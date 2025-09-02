import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Grade } from '../models/grade';

@Injectable({ providedIn: 'root' })
export class GradesService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/grades/`;

  list(params?: { search?: string; ordering?: string; page?: number; page_size?: number }): Observable<Grade[] | any> {
    let httpParams = new HttpParams();
    if (params?.search)    httpParams = httpParams.set('search', params.search);
    if (params?.ordering)  httpParams = httpParams.set('ordering', params.ordering);
    if (params?.page)      httpParams = httpParams.set('page', String(params.page));
    if (params?.page_size) httpParams = httpParams.set('page_size', String(params.page_size));
    return this.http.get<Grade[] | any>(this.base, { params: httpParams });
  }

  get(id: number): Observable<Grade> {
    return this.http.get<Grade>(`${this.base}${id}/`);
  }

  create(payload: Grade): Observable<Grade> {
    return this.http.post<Grade>(this.base, payload);
  }

  update(id: number, payload: Grade): Observable<Grade> {
    return this.http.put<Grade>(`${this.base}${id}/`, payload);
  }

  patch(id: number, payload: Partial<Grade>): Observable<Grade> {
    return this.http.patch<Grade>(`${this.base}${id}/`, payload);
  }

  remove(id: number): Observable<any> {
    return this.http.delete(`${this.base}${id}/`);
  }
}
