import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

// ===== Listagem (já existente) =====
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
  Datapedido?: string | null;   // YYYY-MM-DD
  Dataentrega?: string | null;  // YYYY-MM-DD
  // Documento removido; número do pedido é o Idpedidocompra retornado
}

export interface PedidoCompraCreated {
  Idpedidocompra: number;
  // demais campos retornados pelo DetailSerializer...
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
    // caso sua API de lojas não pagine, ok; se paginar, ajuste conforme necessário
    return this.http.get<any[]>(this.lojasUrl);
  }
  getProdutoById(id: number) {
    return this.http.get<any>(`${this.produtosUrl}${id}/`);
  }

  // ----- Criação (cabeçalho) -----
  createHeader(dto: PedidoCompraCreateDTO) {
    return this.http.post<PedidoCompraCreated>(this.baseUrl, dto);
  }

  // ----- Criação de itens -----
  createItem(pedidoId: number, dto: PedidoItemDTO) {
    // API espera Idpedidocompra no corpo
    const payload = { ...dto, Idpedidocompra: pedidoId };
    return this.http.post(this.itensUrl, payload);
  }

  // Conveniência: cria cabeçalho e, em seguida, os itens
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
}
