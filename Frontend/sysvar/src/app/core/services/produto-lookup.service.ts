import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { ProdutoBasic } from '../models/produto-basic.model';

const API_BASE = '/api';

@Injectable({ providedIn: 'root' })
export class ProdutoLookupService {
  private http = inject(HttpClient);

  getByReferencia(referencia: string): Observable<ProdutoBasic | null> {
    const ref = (referencia || '').trim();
    if (!ref) return of(null);

    return this.tryList({ Referencia: ref, view: 'basic', page_size: '5' }).pipe(
      map(payload => this.extractFirst(payload, ref)),
      switchMap(first => first ? of(first)
        : this.tryList({ referencia: ref, view: 'basic', page_size: '5' }).pipe(
            map(p => this.extractFirst(p, ref))
          )),
      switchMap(firstOrNull => firstOrNull ? of(firstOrNull)
        : this.tryList({ search: ref, view: 'basic', page_size: '10' }).pipe(
            map(p => this.extractFirst(p, ref))
          )),
      catchError(() => of(null))
    );
  }

  private tryList(paramsObj: Record<string, string>): Observable<any> {
    let params = new HttpParams();
    Object.entries(paramsObj).forEach(([k, v]) => params = params.set(k, v));
    return this.http.get<any>(`${API_BASE}/produtos/`, { params });
  }

  private normRef(v: any): string {
    return String(v ?? '').toLowerCase().replace(/[^0-9a-z]/gi, '');
  }

  private extractFirst(payload: any, ref: string): ProdutoBasic | null {
    const want = this.normRef(ref);
    const arr = Array.isArray(payload) ? payload
      : (Array.isArray(payload?.results) ? payload.results : []);
    if (!arr.length) return null;

    let r = arr.find((x: any) => this.normRef(x.Referencia ?? x.referencia) === want) ?? arr[0];
    return this.toProdutoBasic(r);
  }

  private toProdutoBasic(r: any): ProdutoBasic {
    const colecaoObj = r?.colecao || r?.Colecao || null;
    const grupoObj   = r?.grupo   || r?.Grupo   || null;
    const subObj     = r?.subgrupo|| r?.Subgrupo|| null;
    const unObj      = r?.unidade || r?.Unidade || null;

    const pick = (obj: any, ...keys: string[]) =>
      keys.map(k => obj?.[k]).find(v => v !== undefined && v !== null) ?? null;

    return {
      Idproduto: r?.Idproduto ?? r?.id,
      Referencia: r?.Referencia ?? r?.referencia ?? '',

      Nome_produto: r?.Nome_produto ?? r?.Descricao ?? r?.descricao ?? '(sem nome)',
      Descricao: r?.Descricao ?? r?.descricao ?? null,

      Idcolecao: r?.Idcolecao ?? r?.colecao_id ?? r?.colecao ?? null,
      Idgrupo: r?.Idgrupo ?? r?.grupo_id ?? r?.grupo ?? null,
      Idsubgrupo: r?.Idsubgrupo ?? r?.subgrupo_id ?? r?.subgrupo ?? null,
      Idunidade: r?.Idunidade ?? r?.unidade_id ?? r?.unidade ?? null,

      ColecaoCodigo: pick(r, 'colecao_codigo', 'ColecaoCodigo') ??
                     pick(colecaoObj, 'Codigo', 'codigo'),
      ColecaoDescricao: pick(r, 'colecao_descricao', 'ColecaoDescricao') ??
                        pick(colecaoObj, 'Descricao', 'descricao'),
      Estacao: pick(r, 'estacao', 'Estacao') ??
               pick(colecaoObj, 'Estacao', 'estacao'),

      GrupoCodigo: pick(r, 'grupo_codigo', 'GrupoCodigo') ??
                   pick(grupoObj, 'Codigo', 'codigo'),
      GrupoDescricao: pick(r, 'grupo_descricao', 'GrupoDescricao') ??
                      pick(grupoObj, 'Descricao', 'descricao'),

      SubgrupoDescricao: pick(r, 'subgrupo_descricao', 'SubgrupoDescricao') ??
                         pick(subObj, 'Descricao', 'descricao'),

      UnidadeDescricao: pick(r, 'unidade_descricao', 'UnidadeDescricao') ??
                        pick(unObj, 'Descricao', 'descricao'),
      UnidadeSigla: pick(r, 'unidade_sigla', 'UnidadeSigla') ??
                    pick(unObj, 'Sigla', 'sigla'),

      Ncm: r?.Ncm ?? r?.ncm ?? r?.classificacao_fiscal ?? null,

      Preco: r?.Preco ?? r?.preco ?? null,
      PrecoBase: r?.PrecoBase ?? r?.preco_base ?? r?.Preco ?? r?.preco ?? null,

      Marca: r?.Marca ?? r?.marca ?? null,
      Ativo: r?.Ativo ?? r?.ativo ?? null,
    };
  }
}
