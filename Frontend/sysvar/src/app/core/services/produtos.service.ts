import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, switchMap, of, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Produto } from '../models/produto';
import { ProdutoDetalhe } from '../models/produto-detalhe';
import { Estoque } from '../models/estoque';

@Injectable({ providedIn: 'root' })
export class ProdutosService {
  private http = inject(HttpClient);

  private baseProdutos = `${environment.apiBaseUrl}/produtos/`;
  private baseDetalhes = `${environment.apiBaseUrl}/produtos-detalhes/`;
  private baseEstoques = `${environment.apiBaseUrl}/estoques/`;
  private baseTabelaPrecoItem = `${environment.apiBaseUrl}/tabelaprecoitem/`;

  // ---- Produtos ----
  list(params?: { search?: string; ordering?: string; page?: number; page_size?: number }): Observable<Produto[] | any> {
    let p = new HttpParams();
    if (params?.search)    p = p.set('search', params.search);
    if (params?.ordering)  p = p.set('ordering', params.ordering);
    if (params?.page)      p = p.set('page', String(params.page));
    if (params?.page_size) p = p.set('page_size', String(params.page_size));
    return this.http.get<Produto[] | any>(this.baseProdutos, { params: p });
  }

  get(id: number): Observable<Produto> {
    return this.http.get<Produto>(`${this.baseProdutos}${id}/`);
  }

  create(payload: Produto): Observable<Produto> {
    return this.http.post<Produto>(this.baseProdutos, payload);
  }

  update(id: number, payload: Produto): Observable<Produto> {
    return this.http.put<Produto>(`${this.baseProdutos}${id}/`, payload);
  }

  remove(id: number): Observable<any> {
    return this.http.delete(`${this.baseProdutos}${id}/`);
  }

  /**
   * PATCH de ativação/inativação enviando tudo no BODY
   * - Ativo: boolean
   * - audit_reason / motivo: string
   * - password / senha: string
   */
  private patchAtivo(id: number, ativo: boolean, motivo?: string, senha?: string) {
    const url = `${this.baseProdutos}${id}/`;
    const body: any = { Ativo: ativo };

    const motivoTrim = (motivo ?? '').trim();
    const senhaTrim  = (senha ?? '').trim();

    if (motivoTrim) {
      body.audit_reason = motivoTrim; // backend usa _get_reason
      body.motivo = motivoTrim;       // alias compat
    }
    if (senhaTrim) {
      body.password = senhaTrim; // backend usa _get_password
      body.senha = senhaTrim;    // alias compat
    }

    return this.http.patch<{ Ativo: boolean }>(url, body).pipe(
      catchError(err => throwError(() => err))
    );
  }

  /** INATIVAR: envia motivo + senha em UMA chamada */
  inativarProduto(id: number, motivo: string, senha: string): Observable<{ Ativo: boolean }> {
    return this.patchAtivo(id, false, motivo, senha);
  }

  /** ATIVAR: motivo opcional, sem senha */
  ativarProduto(id: number, motivo?: string): Observable<{ Ativo: boolean }> {
    return this.patchAtivo(id, true, motivo);
  }

  // ---------- SKUs (DETALHES) ----------
  /** Novo: lista SKUs do produto via endpoint dedicado /produtos/{id}/skus/ (traz sku_id) */
  getSkusDoProduto(produtoId: number): Observable<{ produto_id: number; referencia?: string; skus: any[] }> {
    const url = `${this.baseProdutos}${produtoId}/skus/`;
    return this.http.get<any>(url).pipe(
      map((resp: any) => {
        const skus = Array.isArray(resp?.skus) ? resp.skus : [];
        return { produto_id: produtoId, referencia: resp?.referencia, skus };
      })
    );
  }

  /** Compat antigo: lista detalhes direto no /produtos-detalhes/ (sem sku_id garantido) */
  getSkus(produtoId: number): Observable<{ produto_id: number; referencia?: string; skus: any[] }> {
    let params = new HttpParams()
      .set('Idproduto', String(produtoId))
      .set('ativo', 'all')
      .set('ordering', 'Idcor,Idtamanho');

    return this.http.get<any>(this.baseDetalhes, { params }).pipe(
      map((resp: any) => {
        const rows = Array.isArray(resp) ? resp : (resp?.results ?? []);
        // Normaliza shape mínimo esperado
        const skus = rows.map((r: any) => ({
          sku_id: r.Idprodutodetalhe ?? r.id ?? null,
          ean13: r.CodigodeBarra ?? r.ean13,
          codigoproduto: r.Codigoproduto ?? r.codigoproduto,
          cor: r.Idcor?.Descricao ?? r.cor,
          cor_codigo: r.Idcor?.Codigo ?? r.cor_codigo,
          tamanho: r.Idtamanho?.Tamanho ?? r.Idtamanho?.Descricao ?? r.tamanho,
          ativo: r.Ativo ?? r.ativo ?? true,
        }));
        return { produto_id: produtoId, referencia: undefined, skus };
      })
    );
  }

  /** PATCH em um SKU específico (ProdutoDetalhe) */
  private patchSkuAtivoById(skuId: number, ativo: boolean, motivo?: string, senha?: string): Observable<{ Ativo: boolean }> {
    const url = `${this.baseDetalhes}${skuId}/`;
    const body: any = { Ativo: ativo };

    // Mesmo payload do produto (backend ignora se não exigir)
    const motivoTrim = (motivo ?? '').trim();
    const senhaTrim  = (senha ?? '').trim();
    if (motivoTrim) {
      body.audit_reason = motivoTrim;
      body.motivo = motivoTrim;
    }
    if (senhaTrim) {
      body.password = senhaTrim;
      body.senha = senhaTrim;
    }

    return this.http.patch<{ Ativo: boolean }>(url, body).pipe(
      catchError(err => throwError(() => err))
    );
  }

  inativarSku(skuId: number, motivo: string, senha: string): Observable<{ Ativo: boolean }> {
    return this.patchSkuAtivoById(skuId, false, motivo, senha);
  }

  ativarSku(skuId: number, motivo?: string): Observable<{ Ativo: boolean }> {
    return this.patchSkuAtivoById(skuId, true, motivo);
  }

  // ---- Preços (por produto) ----
  getPrecos(produtoId: number): Observable<{ produto_id: number; referencia?: string; tabelas: any[] }> {
    let paramsDetalhe = new HttpParams()
      .set('Idproduto', String(produtoId))
      .set('ativo', 'all');

    return this.http.get<any>(this.baseDetalhes, { params: paramsDetalhe }).pipe(
      switchMap((resp: any) => {
        const detalhes: any[] = Array.isArray(resp) ? resp : (resp?.results ?? []);
        const eans = detalhes.map(d => d?.CodigodeBarra).filter((x: any) => !!x);

        if (!eans.length) {
          return of({ produto_id: produtoId, referencia: undefined, tabelas: [] });
        }

        const eanCsv = eans.join(',');
        let paramsPreco = new HttpParams()
          .set('codigodebarra__in', eanCsv)
          .set('ordering', 'idtabela_id,codigodebarra');

        return this.http.get<any>(this.baseTabelaPrecoItem, { params: paramsPreco }).pipe(
          map((r: any) => {
            const itens = Array.isArray(r) ? r : (r?.results ?? []);
            return { produto_id: produtoId, referencia: undefined, tabelas: itens };
          })
        );
      })
    );
  }

  // ---- Produto Detalhe (CRUD) ----
  createDetalhe(payload: ProdutoDetalhe): Observable<ProdutoDetalhe> {
    return this.http.post<ProdutoDetalhe>(this.baseDetalhes, payload);
  }

  saveSkus(payload: {
    product_id: number;
    tabela_preco_id: number;
    preco_padrao: number;
    lojas?: number[];
    itens: Array<{ cor_id: number; tamanho_id: number; ean13?: string; preco?: number }>;
  }): Observable<{ created: number; updated: number; detalhes: any[]; errors: any[]; }> {
    const url = `${this.baseDetalhes}batch-create/`;
    return this.http.post<any>(url, payload);
  }

  // ---- Estoque ----
  createEstoque(payload: Estoque): Observable<Estoque> {
    return this.http.post<Estoque>(this.baseEstoques, payload);
  }
}
