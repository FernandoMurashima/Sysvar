import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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

/** Tipos opcionais para a consulta de matriz por referência (podem ser ajustados depois, se quiser) */
export interface MatrizReferenciaResponse {
  referencia: string;
  resumo: { estoque: number; reserva: number; disponivel: number };
  eixos: {
    lojas: Array<{ id: number; nome: string }>;
    cores: Array<{ id: number; nome: string }>;
    tamanhos: Array<{ id: number; sigla: string; descricao: string }>;
  };
  matriz: {
    por_loja: Array<{
      loja_id: number;
      cores: Array<{
        cor_id: number;
        tamanhos: Record<string, number>;
        total_cor: number;
      }>;
      total_loja: number;
    }>;
    totais: {
      por_cor: Record<string, number>;
      por_tamanho: Record<string, number>;
      geral: number;
    };
  };
}

@Injectable({ providedIn: 'root' })
export class EstoquesService {
  private http = inject(HttpClient);
  // ajuste se seu endpoint tiver outro nome
  private base = '/api/estoques/';

  /** LISTAGEM CRUD padrao */
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

  /**
   * >>> NOVO: Consulta de Estoque — Matriz por Referência
   * GET /api/estoques/matriz-referencia/?ref=<REF>&lojas=1,2&incluir_inativos=false
   */
  matrizReferencia(
    ref: string,
    opts?: { lojas?: number[]; incluir_inativos?: boolean }
  ): Observable<MatrizReferenciaResponse> {
    let params = new HttpParams().set('ref', ref);
    if (opts?.lojas?.length) params = params.set('lojas', opts.lojas.join(','));
    if (opts?.incluir_inativos) params = params.set('incluir_inativos', 'true');
    return this.http.get<MatrizReferenciaResponse>(`${this.base}matriz-referencia/`, { params });
  }
}
