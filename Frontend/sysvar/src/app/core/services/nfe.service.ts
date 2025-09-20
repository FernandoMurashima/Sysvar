import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface NfeUploadResp { Idnfe: number; [k: string]: any }
export interface ReconciliarItem {
  item_id: number; ordem: number; cProd: string; xProd: string; ean: string|null;
  qtd: string; vUnCom: string; vProd: string;
  destino?: null | (
    { tipo: 'sku', Idprodutodetalhe: number, ean?: string, codigoproduto?: string, produto_id: number, produto_ref: string, produto_desc: string } |
    { tipo: 'produto', Idproduto: number, produto_ref: string, produto_desc: string }
  );
}
export interface ReconciliarResp { status: string; itens: ReconciliarItem[] }
export interface ConfirmarResp { nfeId?: number; status: string; compra_id?: number; itens_sem_mapeamento?: any[] }

@Injectable({ providedIn: 'root' })
export class NfeService {
  private http = inject(HttpClient);
  private api = environment.apiBaseUrl; // ex.: http://127.0.0.1:8000/api

  // POST /api/nfe-entradas/upload-xml/   (xml + Idloja [+ Idfornecedor])
  uploadXml(file: File, lojaId: number, fornecedorId?: number): Observable<NfeUploadResp> {
    const form = new FormData();
    form.append('xml', file);                // <- seu backend espera 'xml'
    form.append('Idloja', String(lojaId));   // <- obrigatório
    if (fornecedorId) form.append('Idfornecedor', String(fornecedorId)); // opcional
    return this.http.post<NfeUploadResp>(`${this.api}/nfe-entradas/upload-xml/`, form);
  }

  // GET /api/nfe-entradas/{id}/   (caso queira ler o registro e itens crus)
  getEntrada(Idnfe: number) {
    return this.http.get<any>(`${this.api}/nfe-entradas/${Idnfe}/`);
  }

  // POST /api/nfe-entradas/{id}/reconciliar/  (fornecedor_id opcional)
  reconciliar(Idnfe: number, fornecedorId?: number) {
    const body = fornecedorId ? { fornecedor_id: fornecedorId } : {};
    return this.http.post<ReconciliarResp>(`${this.api}/nfe-entradas/${Idnfe}/reconciliar/`, body);
  }

  // POST /api/nfe-entradas/{id}/confirmar/   ({ permitir_parcial })
  confirmar(Idnfe: number, permitirParcial = false) {
    return this.http.post<ConfirmarResp>(`${this.api}/nfe-entradas/${Idnfe}/confirmar/`, { permitir_parcial: permitirParcial });
  }
}
