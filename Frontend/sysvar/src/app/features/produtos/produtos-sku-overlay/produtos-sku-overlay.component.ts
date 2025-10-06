import {
  Component, EventEmitter, Input, Output, signal,
  OnChanges, SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProdutosService } from '../../../core/services/produtos.service';

@Component({
  selector: 'app-produtos-sku-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './produtos-sku-overlay.component.html',
  styleUrls: ['./produtos-sku-overlay.component.css']
})
export class ProdutoSkuOverlayComponent implements OnChanges {
  @Input() aberto = false;
  @Input() produtoId: number | null = null;
  @Input() referencia: string | null = null;

  @Output() close = new EventEmitter<void>();

  loading = signal(false);
  erroMsg = signal<string | null>(null);
  skus = signal<Array<{
    sku_id: number | null;
    ean13: string;
    codigoproduto?: string;
    cor?: string;
    cor_codigo?: string;
    tamanho?: string;
    ativo: boolean;
    _saving?: boolean;
  }> | null>(null);

  constructor(private produtosApi: ProdutosService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['aberto'] || changes['produtoId']) && this.aberto && this.produtoId) {
      this.carregarSkus(this.produtoId);
    }
  }

  fechar(): void { this.close.emit(); }

  recarregar(): void {
    if (this.produtoId) this.carregarSkus(this.produtoId);
  }

  private carregarSkus(produtoId: number): void {
    this.loading.set(true);
    this.erroMsg.set(null);
    this.skus.set(null);

    // Usa o endpoint dedicado: /produtos/{id}/skus/
    this.produtosApi.getSkusDoProduto(produtoId).subscribe({
      next: (resp: any) => {
        const rows = (resp?.skus ?? []).map((r: any) => ({ ...r, _saving: false }));
        this.skus.set(rows);
      },
      error: () => this.erroMsg.set('Falha ao carregar SKUs.'),
      complete: () => this.loading.set(false),
    });
  }

  onToggleSku(row: any): void {
    if (!row || !row.sku_id) { alert('SKU sem identificador.'); return; }

    const desativando = !!row.ativo;
    let motivo: string | undefined;

    if (desativando) {
      const m = window.prompt('Motivo da desativação do SKU (opcional):', '');
      motivo = (m || '').trim() || undefined;
    }

    row._saving = true;

    // inativarSku exige (skuId, motivo, senha). Para SKU não usamos senha → ''.
    const obs = desativando
      ? this.produtosApi.inativarSku(row.sku_id, motivo || '', '')
      : this.produtosApi.ativarSku(row.sku_id);

    obs.subscribe({
      next: (r: any) => {
        // aceita tanto {Ativo:true/false} quanto objeto completo com Ativo
        const ativo = typeof r?.Ativo === 'boolean' ? r.Ativo
                    : (typeof r?.ativo === 'boolean' ? r.ativo
                    : (typeof r?.Ativo === 'string' ? r.Ativo.toString().toLowerCase() === 'true' : !!row.ativo));
        row.ativo = !!ativo;
      },
      error: (err) => {
        const msg = err?.error?.detail || 'Falha ao alterar status do SKU.';
        alert(String(msg));
      },
      complete: () => { row._saving = false; }
    });
  }
}

