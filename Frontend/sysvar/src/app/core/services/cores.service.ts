//src/app/core/services/cores.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CorModel } from '../models/cor';

@Injectable({ providedIn: 'root' })
export class CoresService {
  private http = inject(HttpClient);
  private base = '/api/cores/';

  // Aceita filtros extras (ex.: produto=ID)
  list(params?: Record<string, any>): Observable<CorModel[] | any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && String(v) !== '') {
          httpParams = httpParams.set(k, String(v));
        }
      });
    }
    return this.http.get<CorModel[] | any>(this.base, { params: httpParams });
  }

  get(id: number): Observable<CorModel> { return this.http.get<CorModel>(`${this.base}${id}/`); }
  create(payload: CorModel): Observable<CorModel> { return this.http.post<CorModel>(this.base, payload); }
  update(id: number, payload: CorModel): Observable<CorModel> { return this.http.put<CorModel>(`${this.base}${id}/`, payload); }
  patch(id: number, payload: Partial<CorModel>): Observable<CorModel> { return this.http.patch<CorModel>(`${this.base}${id}/`, payload); }
  remove(id: number): Observable<any> { return this.http.delete(`${this.base}${id}/`); }
}

