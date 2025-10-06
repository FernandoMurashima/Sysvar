import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProdutosService } from '../../../core/services/produtos.service';

/**
 * Overlay standalone para listar SKUs (e, depois, ativar/desativar).
 * Inputs:
 *  - aberto: boolean (opcional; só para detectar abertura)
 *  - produtoId: number
 *  - referencia: string|null (exibição)
 * Output:
 *  - close(): fechar
 */
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
  }> | null>(null);

  constructor(private produtosApi: ProdutosService) {}

  /**
   * Dispara carga sempre que produtoId OU aberto mudar.
   * (Quando o pai abre a tela, overlay é criado e os @Input chegam.)
   */
  ngOnChanges(changes: SimpleChanges): void {
    const pid = Number(this.produtoId || 0);
    if ((changes['produtoId'] || changes['aberto']) && pid > 0) {
      this.carregarSkus(pid);
    }
  }

  fechar(): void {
    this.close.emit();
  }

  private carregarSkus(produtoId: number): void {
    this.loading.set(true);
    this.erroMsg.set(null);
    this.skus.set(null);

    // Usa endpoint dedicado /produtos/{id}/skus/ (retorna sku_id garantido)
    this.produtosApi.getSkusDoProduto(produtoId).subscribe({
      next: (resp) => {
        const rows = Array.isArray(resp?.skus) ? resp.skus : [];
        this.skus.set(rows);
      },
      error: () => this.erroMsg.set('Falha ao carregar SKUs.'),
      complete: () => this.loading.set(false)
    });
  }
}
