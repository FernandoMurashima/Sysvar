
// src/app/core/services/pedidos-compra.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';

export interface PedidoCompraRow {
  Idpedidocompra: number;
  Documento: string | null;
  Datapedido: string | null;
  Dataentrega: string | null;
  Status: 'AB' | 'AP' | 'CA' | 'AT' | 'PA' | 'PE';
  Valorpedido: number | string;
  fornecedor_nome: string;
  loja_nome: string;
  tipo_pedido?: 'revenda' | 'consumo' | string;
  condicao_pagamento?: string | null;
}

export interface PedidoCompraFiltro {
  ordering?: string;
  status?: string;
  fornecedor?: number;
  q_fornecedor?: string;
  loja?: number;
  emissao_de?: string;
  emissao_ate?: string;
  entrega_de?: string;
  entrega_ate?: string;
  total_min?: number;
  total_max?: number;
  tipo_pedido?: 'revenda' | 'consumo' | string;
}

export interface PedidoCompraCreateDTO {
  Idfornecedor: number;
  Idloja: number;
  Datapedido: string | null;
  Dataentrega: string | null;
  tipo_pedido: 'revenda' | 'consumo';
}

export interface PedidoItemDTO {
  Idproduto: number;
  Qtp_pc: number;
  valorunitario: number;
  Desconto?: number;
  Idprodutodetalhe?: number | null;
}

export interface PedidoItemDetail {
  Idpedidocompraitem: number;
  Idproduto: number;
  produto_desc?: string;
  Qtp_pc: number;
  valorunitario: number;
  Desconto: number;
  Total_item: number;
}

export interface PedidoParcela {
  Idpc_parcela: number;
  pedido: number;
  parcela: number;
  prazo_dias: number | null;
  vencimento: string | null;
  valor: number | string;
  forma: string | null;
  observacao: string | null;
  data_cadastro: string;
}

export interface PedidoCompraDetail {
  Idpedidocompra: number;
  Documento: string | null;
  Datapedido: string | null;
  Dataentrega: string | null;
  Status: 'AB' | 'AP' | 'CA' | 'AT' | 'PA' | 'PE';
  Valorpedido: number | string;
  Idfornecedor: number;
  Idloja: number;
  fornecedor_nome: string;
  loja_nome: string;
  condicao_pagamento?: string | null;
  condicao_pagamento_detalhe?: string | null;
  parcelas?: PedidoParcela[];
  itens: PedidoItemDetail[];
}

export type SetFormaPagamentoPayload = {
  codigo?: string;
  Idformapagamento?: number;
};

@Injectable({ providedIn: 'root' })
export class PedidosCompraService {
  private http = inject(HttpClient);
  private base = '/api';

  listar(f: PedidoCompraFiltro): Observable<PedidoCompraRow[]> {
    let params = new HttpParams();
    const add = (k: string, v: any) => {
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        params = params.set(k, String(v));
      }
    };
    add('ordering', f.ordering);
    add('status', f.status);
    add('fornecedor', f.fornecedor);
    add('Idfornecedor', f.fornecedor);
    add('q_fornecedor', f.q_fornecedor);
    add('loja', f.loja);
    add('Idloja', f.loja);
    add('emissao_de', f.emissao_de);
    add('emissao_ate', f.emissao_ate);
    add('entrega_de', f.entrega_de);
    add('entrega_ate', f.entrega_ate);
    add('tipo_pedido', f.tipo_pedido);
    add('total_min', f.total_min);
    add('total_max', f.total_max);
    return this.http.get<PedidoCompraRow[]>(`${this.base}/pedidos-compra/`, { params });
  }

  getById(id: number): Observable<PedidoCompraDetail> {
    return this.http.get<PedidoCompraDetail>(`${this.base}/pedidos-compra/${id}/`);
  }

  createHeader(dto: PedidoCompraCreateDTO): Observable<PedidoCompraDetail> {
    return this.http.post<PedidoCompraDetail>(`${this.base}/pedidos-compra/`, dto);
  }

  createItem(dto: PedidoItemDTO & { Idpedidocompra: number }): Observable<PedidoItemDetail> {
    return this.http.post<PedidoItemDetail>(`${this.base}/pedidos-compra-itens/`, dto);
  }

  async createWithItems(header: PedidoCompraCreateDTO, itens: PedidoItemDTO[]): Promise<PedidoCompraDetail> {
    const created = await this.createHeader(header).toPromise();
    if (!created?.Idpedidocompra) return created as PedidoCompraDetail;
    for (const it of itens) {
      await this.createItem({
        Idpedidocompra: created.Idpedidocompra,
        Idproduto: it.Idproduto,
        Qtp_pc: it.Qtp_pc,
        valorunitario: it.valorunitario,
        Desconto: it.Desconto ?? 0,
        Idprodutodetalhe: it.Idprodutodetalhe ?? null,
      }).toPromise();
    }
    return await this.getById(created.Idpedidocompra).toPromise() as PedidoCompraDetail;
  }

  updateHeader(id: number, patch: Partial<PedidoCompraCreateDTO & { Dataentrega: string | null }>) {
    return this.http.patch<PedidoCompraDetail>(`${this.base}/pedidos-compra/${id}/`, patch);
  }
  updateItem(idItem: number, patch: Partial<PedidoItemDTO>) {
    return this.http.patch<PedidoItemDetail>(`${this.base}/pedidos-compra-itens/${idItem}/`, patch);
  }

  aprovar(id: number) { return this.http.post(`${this.base}/pedidos-compra/${id}/aprovar/`, {}); }
  cancelar(id: number) { return this.http.post(`${this.base}/pedidos-compra/${id}/cancelar/`, {}); }
  reabrir(id: number) { return this.http.post(`${this.base}/pedidos-compra/${id}/reabrir/`, {}); }
  duplicar(id: number) { return this.http.post<PedidoCompraDetail>(`${this.base}/pedidos-compra/${id}/duplicar/`, {}); }

  setFormaPagamento(pedidoId: number, payload: SetFormaPagamentoPayload) {
    return this.http.post<PedidoCompraDetail>(
      `${this.base}/pedidos-compra/${pedidoId}/set-forma-pagamento/`, payload);
  }

  // --- Lookups já existentes no seu backend ---
  getProdutoById(id: number) { return this.http.get<any>(`${this.base}/produtos/${id}/`); }
  getFornecedorById(id: number) { return this.http.get<any>(`${this.base}/fornecedores/${id}/`); }
  listLojas() { return this.http.get<any[]>(`${this.base}/lojas/`); }

  // === ProdutoDetalhe para descobrir cores disponíveis por produto ===
  listProdutoDetalhes(Idproduto: number) {
    const params = new HttpParams().set('Idproduto', String(Idproduto)).set('page_size', '1000');
    // endpoints típicos: /api/produtos-detalhes/ ou /api/produtodetalhes/
    return this.http.get<any>(`${this.base}/produtos-detalhes/`, { params });
  }

  // ===== ADIÇÕES: forma de pagamento por código + loja por ID =====
  async getFormaByCodigo(codigo: string): Promise<{ codigo: string; descricao: string } | null> {
    if (!codigo) return null;
    let params = new HttpParams().set('codigo', codigo);
    const res1: any = await firstValueFrom(this.http.get(`${this.base}/forma-pagamentos/`, { params }).pipe());
    const arr1 = (res1?.results ?? res1) as any[];
    if (Array.isArray(arr1) && arr1.length) {
      const it = arr1[0];
      return { codigo: it.codigo, descricao: it.descricao ?? it.nome ?? it.detalhe ?? '' };
    }
    params = new HttpParams().set('search', codigo);
    const res2: any = await firstValueFrom(this.http.get(`${this.base}/forma-pagamentos/`, { params }).pipe());
    const arr2 = (res2?.results ?? res2) as any[];
    if (Array.isArray(arr2) && arr2.length) {
      const it = arr2[0];
      return { codigo: it.codigo, descricao: it.descricao ?? it.nome ?? it.detalhe ?? '' };
    }
    return null;
  }

  async getLojaNomeById(id: number): Promise<string | null> {
    if (!id) return null;
    const all = await firstValueFrom(this.listLojas());
    const list = (all as any)?.results ?? (all as any);
    const found = Array.isArray(list) ? list.find((x: any) => Number(x.id ?? x.Idloja) === Number(id)) : null;
    return found ? (found.nome ?? found.loja_nome ?? found.descricao ?? String(id)) : null;
  }
}
