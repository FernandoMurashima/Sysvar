import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

export interface Estoque {
  Idestoque?: number;
  CodigodeBarra: string;
  codigoproduto: string;
  Idloja: number;
  Estoque: number;
  reserva?: number | null;
  valorestoque?: string | null;
}

@Injectable({ providedIn: 'root' })
export class EstoquesService {
  private http = inject(HttpClient);
  // ajuste se seu endpoint tiver outro nome
  private base = '/api/estoques/';

  list(params?: any): Observable<Estoque[]> {
    return this.http.get<Estoque[]>(this.base, { params });
  }

  getByUnique(lojaId: number, ean: string): Observable<Estoque | null> {
    return this.list({ Idloja: lojaId, CodigodeBarra: ean }).pipe(
      map(arr => (arr && arr.length ? arr[0] : null))
    );
  }

  create(payload: Estoque): Observable<Estoque> {
    return this.http.post<Estoque>(this.base, payload);
  }

  update(id: number, patch: Partial<Estoque>): Observable<Estoque> {
    return this.http.patch<Estoque>(`${this.base}${id}/`, patch);
  }

  /** Upsert por (CodigodeBarra, Idloja) */
  upsert(lojaId: number, ean: string, quantidade: number, codigoproduto: string): Observable<Estoque> {
    return this.getByUnique(lojaId, ean).pipe(
      switchMap(found => {
        if (found?.Idestoque != null) {
          const novo = Number(found.Estoque || 0) + Number(quantidade);
          return this.update(found.Idestoque, { Estoque: novo });
        }
        const payload: Estoque = { Idloja: lojaId, CodigodeBarra: ean, codigoproduto, Estoque: quantidade };
        return this.create(payload);
      })
    );
  }

  /** Lançamento em lote */
  bulkUpsert(
    lojaId: number,
    itens: { ean: string; qtd: number; codigoproduto: string }[]
  ): Observable<Estoque[]> {
    if (!itens?.length) return of([]);
    const calls = itens.map(it => this.upsert(lojaId, it.ean, it.qtd, it.codigoproduto));
    return forkJoin(calls);
  }
}
