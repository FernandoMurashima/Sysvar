import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProdutosBuscaService {
  private http = inject(HttpClient);

  /** Busca produtos (descrição/código) */
  searchProdutos(params: any): Observable<any[]> {
    // ajuste o endpoint se for diferente
    return this.http.get<any[]>('/api/produtos/', { params });
  }

  /** Busca SKU/ProdutoDetalhe (por EAN, etc.) */
  searchDetalhes(params: any): Observable<any[]> {
    // ajuste o endpoint se for diferente
    return this.http.get<any[]>('/api/produtodetalhe/', { params });
  }
}
