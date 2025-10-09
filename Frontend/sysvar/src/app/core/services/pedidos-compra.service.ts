import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

// ===== Listagem =====
export interface PedidoCompraRow {
  Idpedidocompra: number;
  Documento: string | null;
  Datapedido: string | null;
  Dataentrega: string | null;
  Status: 'AB' | 'AP' | 'CA' | string;
  Valorpedido: string;
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

// ===== Criação =====
export interface PedidoCompraCreateDTO {
  Idfornecedor: number;
  Idloja: number;
  Datapedido?: string | null;
  Dataentrega?: string | null;
}

export interface PedidoCompraCreated {
  Idpedidocompra: number;
}

// ===== Detalhe =====
export interface PedidoItemDetail {
  Idpedidocompraitem: number;
  Idproduto: number;
  produto_desc?: string;
  Qtp_pc: number;
  valorunitario: number;
  Desconto: number | null;
  Total_item: string | number;
  Idprodutodetalhe?: number | null;
}
export interface PedidoCompraDetail {
  Idpedidocompra: number;
  Datapedido: string | null;
  Dataentrega: string | null;
  Status: 'AB' | 'AP' | 'CA' | string;
  Valorpedido: string | number;
  fornecedor_nome?: string;
  loja_nome?: string;
  itens: PedidoItemDetail[];
}

export interface PedidoItemDTO {
  Idproduto: number;
  Qtp_pc: number;
  valorunitario: number;
  Desconto?: number | null;
  Idprodutodetalhe?: number | null;
}

@Injectable({ providedIn: 'root' })
export class PedidosCompraService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiBaseUrl}/pedidos-compra/`;
  private itensUrl = `${environment.apiBaseUrl}/pedidos-compra-itens/`;
  private lojasUrl = `${environment.apiBaseUrl}/lojas/`;
  private fornecedoresUrl = `${environment.apiBaseUrl}/fornecedores/`;
  private produtosUrl = `${environment.apiBaseUrl}/produtos/`;

  listar(filtro: PedidoCompraFiltro) {
    let params = new HttpParams();
    const entries = Object.entries(filtro ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== '');
    for (const [k, v] of entries) params = params.set(k, String(v));
    return this.http.get<PedidoCompraRow[]>(this.baseUrl, { params });
  }

  // ----- Lookups -----
  getLojaById(id: number) {
    return this.http.get<any>(`${this.lojasUrl}${id}/`);
  }
  getFornecedorById(id: number) {
    return this.http.get<any>(`${this.fornecedoresUrl}${id}/`);
  }
  listLojas() {
    return this.http.get<any[]>(this.lojasUrl);
  }
  getProdutoById(id: number) {
    return this.http.get<any>(`${this.produtosUrl}${id}/`);
  }

  // ----- Cabeçalho -----
  createHeader(dto: PedidoCompraCreateDTO) {
    return this.http.post<PedidoCompraCreated>(this.baseUrl, dto);
  }
  getById(pedidoId: number) {
    return this.http.get<PedidoCompraDetail>(`${this.baseUrl}${pedidoId}/`);
  }
  updateHeader(pedidoId: number, dto: Partial<Pick<PedidoCompraDetail, 'Dataentrega'>>) {
    return this.http.patch(`${this.baseUrl}${pedidoId}/`, dto);
  }

  // ----- Itens -----
  createItem(pedidoId: number, dto: PedidoItemDTO) {
    const payload = { ...dto, Idpedidocompra: pedidoId };
    return this.http.post(this.itensUrl, payload);
  }
  updateItem(itemId: number, dto: Partial<Pick<PedidoItemDetail, 'Qtp_pc'|'valorunitario'|'Desconto'>>) {
    return this.http.patch(`${this.itensUrl}${itemId}/`, dto);
  }

  // ----- Fluxo de criação completo -----
  createWithItems(header: PedidoCompraCreateDTO, itens: PedidoItemDTO[]) {
    return new Promise<PedidoCompraCreated>(async (resolve, reject) => {
      try {
        const created = await this.createHeader(header).toPromise();
        const id = created?.Idpedidocompra;
        if (!id) throw new Error('Cabeçalho criado sem Idpedidocompra');
        for (const it of itens) {
          await this.createItem(id, it).toPromise();
        }
        resolve(created);
      } catch (e) {
        reject(e);
      }
    });
  }

  // ----- Ações -----
  aprovar(pedidoId: number) {
    return this.http.post(`${this.baseUrl}${pedidoId}/aprovar/`, {});
  }
}
