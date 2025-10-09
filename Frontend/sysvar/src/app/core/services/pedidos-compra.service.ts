import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// ---------- Tipos expostos para o componente ----------
export interface PedidoCompraRow {
  Idpedidocompra: number;
  Documento: string | null;
  Datapedido: string | null;
  Dataentrega: string | null;
  // ⬇️ inclui novos status: AT (Atendido), PA (Parcial Aberto), PE (Parcial Encerrado)
  Status: 'AB' | 'AP' | 'CA' | 'AT' | 'PA' | 'PE';
  Valorpedido: number | string;
  fornecedor_nome: string;
  loja_nome: string;
}

export interface PedidoCompraFiltro {
  ordering?: string;
  status?: string;
  fornecedor?: number;
  q_fornecedor?: string;
  loja?: number;
  doc?: string;
  emissao_de?: string;
  emissao_ate?: string;
  entrega_de?: string;
  entrega_ate?: string;
  total_min?: number;
  total_max?: number;
}

export interface PedidoCompraCreateDTO {
  Idfornecedor: number;
  Idloja: number;
  Datapedido: string | null;
  Dataentrega: string | null;
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

export interface PedidoCompraDetail {
  Idpedidocompra: number;
  Documento: string | null;
  Datapedido: string | null;
  Dataentrega: string | null;
  // ⬇️ mesmos status no detalhe
  Status: 'AB' | 'AP' | 'CA' | 'AT' | 'PA' | 'PE';
  Valorpedido: number | string;
  Idfornecedor: number;
  Idloja: number;
  fornecedor_nome: string;
  loja_nome: string;
  itens: PedidoItemDetail[];
}

@Injectable({ providedIn: 'root' })
export class PedidosCompraService {
  private http = inject(HttpClient);
  private base = '/api';

  // --------- Lista + filtro ----------
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
    add('q_fornecedor', f.q_fornecedor);
    add('loja', f.loja);
    add('doc', f.doc);
    add('emissao_de', f.emissao_de);
    add('emissao_ate', f.emissao_ate);
    add('entrega_de', f.entrega_de);
    add('entrega_ate', f.entrega_ate);
    add('total_min', f.total_min);
    add('total_max', f.total_max);

    return this.http.get<PedidoCompraRow[]>(`${this.base}/pedidos-compra/`, { params });
  }

  // --------- Detalhe ----------
  getById(id: number): Observable<PedidoCompraDetail> {
    return this.http.get<PedidoCompraDetail>(`${this.base}/pedidos-compra/${id}/`);
  }

  // --------- Criar pedido + itens ----------
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

  // --------- Atualizações ----------
  updateHeader(id: number, patch: Partial<PedidoCompraCreateDTO & { Dataentrega: string | null }>) {
    return this.http.patch<PedidoCompraDetail>(`${this.base}/pedidos-compra/${id}/`, patch);
  }

  updateItem(idItem: number, patch: Partial<PedidoItemDTO>) {
    return this.http.patch<PedidoItemDetail>(`${this.base}/pedidos-compra-itens/${idItem}/`, patch);
  }

  // --------- Ações de fluxo ----------
  aprovar(id: number) {
    return this.http.post(`${this.base}/pedidos-compra/${id}/aprovar/`, {});
  }
  cancelar(id: number) {
    return this.http.post(`${this.base}/pedidos-compra/${id}/cancelar/`, {});
  }
  reabrir(id: number) {
    return this.http.post(`${this.base}/pedidos-compra/${id}/reabrir/`, {});
  }
  duplicar(id: number) {
    return this.http.post<PedidoCompraDetail>(`${this.base}/pedidos-compra/${id}/duplicar/`, {});
  }

  // --------- Apoio (lookups) ----------
  getProdutoById(id: number) {
    return this.http.get<any>(`${this.base}/produtos/${id}/`);
  }
  getFornecedorById(id: number) {
    return this.http.get<any>(`${this.base}/fornecedores/${id}/`);
  }
  listLojas() {
    return this.http.get<any[]>(`${this.base}/lojas/`);
  }
}
