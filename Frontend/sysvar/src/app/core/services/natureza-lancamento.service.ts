// app/core/services/natureza-lancamento.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NaturezaLancamento, Page } from '../models/natureza-lancamento';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class NaturezaLancamentoService {
  private http = inject(HttpClient);
  // AJUSTE AQUI se o slug do endpoint for diferente
  private baseUrl = `${environment.apiBaseUrl}/nat-lancamentos/`;

list(params?: { search?: string; ordering?: string; page?: number; page_size?: number; })
  : Observable<Page<NaturezaLancamento>> {
  let httpParams = new HttpParams();
  if (params?.search)    httpParams = httpParams.set('search', params.search);
  if (params?.ordering)  httpParams = httpParams.set('ordering', params.ordering);
  if (params?.page)      httpParams = httpParams.set('page', params.page);
  if (params?.page_size) httpParams = httpParams.set('page_size', params.page_size);

  // OBS: o backend pode devolver array [] (sem paginação) OU {results: []} (paginado).
  // Aqui normalizamos para SEMPRE devolver Page<T> com .results preenchido.
  return this.http.get<any>(this.baseUrl, { params: httpParams }).pipe(
    // import { map } from 'rxjs/operators';
    map((res: any): Page<NaturezaLancamento> => {
      if (Array.isArray(res)) {
        return { count: res.length, next: null, previous: null, results: res as NaturezaLancamento[] };
      }
      // já está paginado
      return res as Page<NaturezaLancamento>;
    })
  );
}


  get(idnatureza: number): Observable<NaturezaLancamento> {
    return this.http.get<NaturezaLancamento>(`${this.baseUrl}${idnatureza}/`);
  }

  create(data: NaturezaLancamento): Observable<NaturezaLancamento> {
    return this.http.post<NaturezaLancamento>(this.baseUrl, data);
  }

  update(idnatureza: number, data: NaturezaLancamento): Observable<NaturezaLancamento> {
    return this.http.put<NaturezaLancamento>(`${this.baseUrl}${idnatureza}/`, data);
  }

  delete(idnatureza: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}${idnatureza}/`);
  }
}
