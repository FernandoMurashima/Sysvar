import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// core/services/produtos-uso-consumo.service.ts
export interface ProdutoUsoConsumo {
  id?: number;
  tipo: string;        // <-- obrigatório agora
  nome: string;
  descricao?: string;
  unidade: string;
  ativo?: boolean;
  created_at?: string;
  updated_at?: string;
}


@Injectable({ providedIn: 'root' })
export class ProdutosUsoConsumoService {
  private baseUrl = '/api/produtos/uso-consumo';

  constructor(private http: HttpClient) {}

  listar(params?: any): Observable<ProdutoUsoConsumo[]> {
    return this.http.get<ProdutoUsoConsumo[]>(this.baseUrl, { params });
  }

  obter(id: number): Observable<ProdutoUsoConsumo> {
    return this.http.get<ProdutoUsoConsumo>(`${this.baseUrl}/${id}/`);
  }

  criar(data: ProdutoUsoConsumo): Observable<ProdutoUsoConsumo> {
    return this.http.post<ProdutoUsoConsumo>(this.baseUrl + '/', data);
  }

  atualizar(id: number, data: ProdutoUsoConsumo): Observable<ProdutoUsoConsumo> {
    return this.http.put<ProdutoUsoConsumo>(`${this.baseUrl}/${id}/`, data);
  }

  excluir(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}/`);
  }
}
