import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EstoquesService } from '../../../core/services/estoques.service';

import { Router } from '@angular/router';

@Component({
  selector: 'app-consulta-referencia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './consulta-referencia.component.html',
  styleUrls: ['./consulta-referencia.component.css']
})
export class ConsultaReferenciaComponent {
  private api = inject(EstoquesService);

  constructor(private router: Router) {}

  goHome() {
    this.router.navigate(['/home']);
  }

  ref = '';
  loading = false;
  error = '';
  data: any = null;

  lojas: Array<{id:number; nome:string}> = [];
  cores: Array<{id:number; nome:string}> = [];
  tamanhos: Array<{id:number; sigla:string; descricao:string}> = [];

  buscar(): void {
    this.error = '';
    this.data = null;
    const v = (this.ref || '').trim();
    if (!v) { this.error = 'Informe a referência.'; return; }

    this.loading = true;
    this.api.matrizReferencia(v).subscribe({
      next: (res) => {
        this.loading = false;
        this.data = res;
        this.lojas   = res?.eixos?.lojas || [];
        this.cores   = res?.eixos?.cores || [];
        this.tamanhos= res?.eixos?.tamanhos || [];
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.detail || 'Falha ao consultar.';
      }
    });
  }

  qtd(lid:number, cid:number, tid:number): number {
    const lojas = this.data?.matriz?.por_loja || [];
    const loja = lojas.find((l:any)=>l.loja_id===lid);
    if (!loja) return 0;
    const cor = (loja.cores || []).find((c:any)=>c.cor_id===cid);
    if (!cor) return 0;
    const v = cor.tamanhos?.[String(tid)];
    return typeof v === 'number' ? v : 0;
  }

  totalCorLoja(lid:number, cid:number): number {
    const loja = (this.data?.matriz?.por_loja || []).find((l:any)=>l.loja_id===lid);
    const cor = loja?.cores?.find((c:any)=>c.cor_id===cid);
    return cor?.total_cor ?? 0;
  }

  totalLoja(lid:number): number {
    const loja = (this.data?.matriz?.por_loja || []).find((l:any)=>l.loja_id===lid);
    return loja?.total_loja ?? 0;
  }

  totalPorTamanho(tid:number): number {
    return this.data?.matriz?.totais?.por_tamanho?.[String(tid)] ?? 0;
  }

  totalPorCor(cid:number): number {
    return this.data?.matriz?.totais?.por_cor?.[String(cid)] ?? 0;
  }

  totalGeral(): number {
    return this.data?.matriz?.totais?.geral ?? 0;
  }

  /** Soma por tamanho DENTRO de uma cor específica (varre por loja). */
  totalPorTamanhoDaCor(cid: number, tid: number): number {
    const porLoja = this.data?.matriz?.por_loja || [];
    let soma = 0;
    for (const l of porLoja) {
      const cor = (l.cores || []).find((c: any) => c.cor_id === cid);
      if (!cor) continue;
      const v = cor.tamanhos?.[String(tid)];
      if (typeof v === 'number') soma += v;
    }
    return soma;
  }

}
