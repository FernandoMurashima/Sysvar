// app/core/services/modelo-documento.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ModeloDocumento, Page } from '../models/modelo-documento';

@Injectable({ providedIn: 'root' })
export class ModeloDocumentoService {
  private http = inject(HttpClient);
  // AJUSTE AQUI se o slug do endpoint for diferente
  private baseUrl = `${environment.apiBaseUrl}/modelos-documentos/`;

  list(params?: { search?: string; ordering?: string; page?: number; page_size?: number; })
    : Observable<Page<ModeloDocumento>> {
    let httpParams = new HttpParams();
    if (params?.search)    httpParams = httpParams.set('search', params.search);
    if (params?.ordering)  httpParams = httpParams.set('ordering', params.ordering);
    if (params?.page)      httpParams = httpParams.set('page', params.page);
    if (params?.page_size) httpParams = httpParams.set('page_size', params.page_size);

    // Normaliza resposta: tanto array [] quanto {results: []}
    return this.http.get<any>(this.baseUrl, { params: httpParams }).pipe(
      map((res: any): Page<ModeloDocumento> => {
        if (Array.isArray(res)) {
          return { count: res.length, next: null, previous: null, results: res as ModeloDocumento[] };
        }
        return res as Page<ModeloDocumento>;
      })
    );
  }

  get(Idmodelo: number): Observable<ModeloDocumento> {
    return this.http.get<ModeloDocumento>(`${this.baseUrl}${Idmodelo}/`);
  }

  create(data: ModeloDocumento): Observable<ModeloDocumento> {
    return this.http.post<ModeloDocumento>(this.baseUrl, data);
  }

  update(Idmodelo: number, data: ModeloDocumento): Observable<ModeloDocumento> {
    return this.http.put<ModeloDocumento>(`${this.baseUrl}${Idmodelo}/`, data);
  }

  delete(Idmodelo: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}${Idmodelo}/`);
  }
}

