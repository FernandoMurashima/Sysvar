import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
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

  /** >>> Atualizado: inativar exige motivo + password */
  // antes:
  // inativarProduto(id: number, motivo: string): Observable<{ Ativo: boolean }>

  // depois:
  inativarProduto(id: number, motivo: string, password: string): Observable<{ Ativo: boolean }> {
    return this.http.post<{ Ativo: boolean }>(
      `${this.baseProdutos}${id}/inativar/`,
      { motivo, password }  // >>> envia senha junto
    );
  }


  ativarProduto(id: number, motivo?: string): Observable<{ Ativo: boolean }> {
    const body = motivo && motivo.trim().length ? { audit_reason: motivo.trim() } : {};
    return this.http.post<{ Ativo: boolean }>(`${this.baseProdutos}${id}/ativar/`, body);
  }

  // ---- Detalhamento ----
  getSkus(produtoId: number): Observable<{ produto_id: number; referencia: string; skus: any[] }> {
    return this.http.get<{ produto_id: number; referencia: string; skus: any[] }>(`${this.baseProdutos}${produtoId}/skus/`);
  }

  getPrecos(produtoId: number): Observable<{ produto_id: number; referencia: string; tabelas: any[] }> {
    return this.http.get<{ produto_id: number; referencia: string; tabelas: any[] }>(`${this.baseProdutos}${produtoId}/precos/`);
  }

  // ---- Produto Detalhe ----
  createDetalhe(payload: ProdutoDetalhe): Observable<ProdutoDetalhe> {
    return this.http.post<ProdutoDetalhe>(this.baseDetalhes, payload);
  }

  /** Salva SKUs em lote via ProdutoDetalheViewSet.batch_create */
  saveSkus(payload: {
    product_id: number;
    tabela_preco_id: number;
    preco_padrao: number;
    lojas?: number[];
    itens: Array<{ cor_id: number; tamanho_id: number; ean13?: string; preco?: number }>;
  }): Observable<{
    created: number;
    updated: number;
    detalhes: any[];
    errors: any[];
  }> {
    const url = `${this.baseDetalhes}batch-create/`;
    return this.http.post<any>(url, payload);
  }

  // ---- Estoque ----
  createEstoque(payload: Estoque): Observable<Estoque> {
    return this.http.post<Estoque>(this.baseEstoques, payload);
  }
}
