import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Ncm } from '../models/ncm';

@Injectable({ providedIn: 'root' })
export class NcmsService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/ncms/`;

  list(params?: { search?: string; ordering?: string; page?: number; page_size?: number }): Observable<Ncm[] | any> {
    let p = new HttpParams();
    if (params?.search)    p = p.set('search', params.search);
    if (params?.ordering)  p = p.set('ordering', params.ordering);
    if (params?.page)      p = p.set('page', String(params.page));
    if (params?.page_size) p = p.set('page_size', String(params.page_size));
    return this.http.get<Ncm[] | any>(this.base, { params: p });
  }

  get(ncm: string): Observable<Ncm> {
    return this.http.get<Ncm>(`${this.base}${ncm}/`);
  }
}
