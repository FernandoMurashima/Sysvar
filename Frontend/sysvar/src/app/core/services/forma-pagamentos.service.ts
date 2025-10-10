// src/app/core/services/forma-pagamentos.service.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// ===== Tipos =====
export interface FormaPagamentoRow {
  Idformapagamento: number;     // PK
  // Alguns lugares do backend podem expor Idforma igual ao Idformapagamento;
// deixamos opcional para robustez.
  Idforma?: number;
  codigo: string;
  descricao: string;
  num_parcelas: number;
  ativo: boolean;
  data_cadastro: string;        // ISO datetime
}

// Detalhe inclui as parcelas
export interface FormaPagamentoParcelaRead {
  Idformapagparcela: number;    // PK conforme model
  ordem: number;
  dias: number;
  percentual: string;           // vem como decimal/string do backend
  valor_fixo: string;           // idem
  data_cadastro: string;
}

export interface FormaPagamentoParcelaWrite {
  ordem: number;
  dias: number;
  percentual?: string | number; // opcional — servidor valida (>0) ou valor_fixo
  valor_fixo?: string | number; // opcional
}

export interface FormaPagamentoDetail extends FormaPagamentoRow {
  parcelas: FormaPagamentoParcelaRead[];
}

export interface FormaPagamentoFiltro {
  search?: string;    // texto livre (descricao/codigo) — mapeado para ?search=
  ordering?: string;  // ex.: "descricao" ou "-descricao"
  ativo?: boolean;    // opcional — se usarmos no backend depois
}

export interface FormaPagamentoCreateDTO {
  codigo: string;
  descricao: string;
  ativo: boolean;
  parcelas?: FormaPagamentoParcelaWrite[]; // opcional na criação
}

export interface FormaPagamentoUpdateDTO {
  codigo?: string;
  descricao?: string;
  ativo?: boolean;
  parcelas?: FormaPagamentoParcelaWrite[]; // substitui TODAS as parcelas
}

@Injectable({ providedIn: 'root' })
export class FormaPagamentosService {
  private http = inject(HttpClient);
  private base = '/api/forma-pagamentos';

  // Lista (com filtro/ordenação)
  listar(f: FormaPagamentoFiltro = {}): Observable<FormaPagamentoRow[]> {
    let params = new HttpParams();
    const add = (k: string, v: any) => {
      if (v === undefined || v === null) return;
      const s = String(v).trim();
      if (s !== '') params = params.set(k, s);
    };
    add('search', f.search);
    add('ordering', f.ordering);
    if (typeof f.ativo === 'boolean') add('ativo', f.ativo ? 'true' : 'false');

    return this.http.get<FormaPagamentoRow[]>(`${this.base}/`, { params });
  }

  // Detalhe (traz também as parcelas)
  getById(id: number): Observable<FormaPagamentoDetail> {
    return this.http.get<FormaPagamentoDetail>(`${this.base}/${id}/`);
  }

  // Criar
  create(dto: FormaPagamentoCreateDTO): Observable<FormaPagamentoDetail> {
    return this.http.post<FormaPagamentoDetail>(`${this.base}/`, dto);
  }

  // Atualizar (PATCH – permite enviar somente campos alterados; se enviar "parcelas",
  // o backend substitui o conjunto inteiro de parcelas)
  update(id: number, dto: FormaPagamentoUpdateDTO): Observable<FormaPagamentoDetail> {
    return this.http.patch<FormaPagamentoDetail>(`${this.base}/${id}/`, dto);
  }

  // Excluir forma e suas parcelas
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}/`);
  }
}
