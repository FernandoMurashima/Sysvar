import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Funcionario } from '../models/funcionario';

@Injectable({ providedIn: 'root' })
export class FuncionariosService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/funcionarios/`;

  list(params?: { search?: string; ordering?: string; page?: number; page_size?: number }): Observable<Funcionario[]> {
    let httpParams = new HttpParams();
    if (params?.search)    httpParams = httpParams.set('search', params.search);
    if (params?.ordering)  httpParams = httpParams.set('ordering', params.ordering);
    if (params?.page)      httpParams = httpParams.set('page', String(params.page));
    if (params?.page_size) httpParams = httpParams.set('page_size', String(params.page_size));
    return this.http.get<Funcionario[]>(this.base, { params: httpParams });
  }

  get(id: number): Observable<Funcionario> {
    return this.http.get<Funcionario>(`${this.base}${id}/`);
  }

  create(payload: Funcionario): Observable<Funcionario> {
    return this.http.post<Funcionario>(this.base, payload);
  }

  update(id: number, payload: Funcionario): Observable<Funcionario> {
    return this.http.put<Funcionario>(`${this.base}${id}/`, payload);
  }

  patch(id: number, payload: Partial<Funcionario>): Observable<Funcionario> {
    return this.http.patch<Funcionario>(`${this.base}${id}/`, payload);
  }

  remove(id: number): Observable<any> {
    return this.http.delete(`${this.base}${id}/`);
  }
}
