import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, switchMap, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CodigoRow {
  Idcodigo: number;
  colecao: string;    // "25"
  estacao: string;    // "01"
  valor_var: number;  // contador atual
}

@Injectable({ providedIn: 'root' })
export class CodigosService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/codigos/`;

  getRow(colecao: string, estacao: string): Observable<CodigoRow | null> {
    let p = new HttpParams().set('colecao', colecao).set('estacao', estacao);
    return this.http.get<any>(this.base, { params: p }).pipe(
      map(res => {
        const rows = Array.isArray(res) ? res : (res?.results ?? []);
        return rows[0] ?? null;
      })
    );
  }

  ensureRow(colecao: string, estacao: string): Observable<CodigoRow> {
    return this.getRow(colecao, estacao).pipe(
      switchMap(row => {
        if (row) {
          return new Observable<CodigoRow>(obs => { obs.next(row); obs.complete(); });
        }
        return this.http.post<CodigoRow>(this.base, { colecao, estacao, valor_var: 1 });
      })
    );
  }

  increment(colecao: string, estacao: string): Observable<CodigoRow> {
    return this.ensureRow(colecao, estacao).pipe(
      switchMap(row => {
        const novo = { valor_var: Number(row.valor_var) + 1 };
        return this.http.patch<CodigoRow>(`${this.base}${row.Idcodigo}/`, novo);
      })
    );
  }

  /** NOVO: requisita ao backend o próximo EAN-13 (usa contador em Codigos: colecao='EA', estacao='13') */
  nextEan13(): Observable<{ ean13: string }> {
    return this.http.post<{ ean13: string }>(`${this.base}ean-next/`, {});
  }
}
