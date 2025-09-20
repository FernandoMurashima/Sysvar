import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../models/user';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/users/`;

  list(params?: { search?: string; ordering?: string; page?: number; page_size?: number }): Observable<User[]> {
    let httpParams = new HttpParams();
    if (params?.search)    httpParams = httpParams.set('search', params.search);
    if (params?.ordering)  httpParams = httpParams.set('ordering', params.ordering);
    if (params?.page)      httpParams = httpParams.set('page', String(params.page));
    if (params?.page_size) httpParams = httpParams.set('page_size', String(params.page_size));
    return this.http.get<User[]>(this.base, { params: httpParams });
  }

  get(id: number): Observable<User> {
    return this.http.get<User>(`${this.base}${id}/`);
  }

  create(payload: User): Observable<User> {
    return this.http.post<User>(this.base, payload);
  }

  update(id: number, payload: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.base}${id}/`, payload);
  }

  patch(id: number, payload: Partial<User>): Observable<User> {
    return this.http.patch<User>(`${this.base}${id}/`, payload);
  }

  remove(id: number): Observable<any> {
    return this.http.delete(`${this.base}${id}/`);
  }
}
