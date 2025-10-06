import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProdutosService } from '../../../core/services/produtos.service';

/**
 * Overlay standalone para exibir Tabelas de Preço do produto.
 * Aceita:
 *  - aberto: boolean (controla visibilidade)
 *  - produtoId: number (produto alvo)
 *  - referencia: string|null (apenas para exibir no cabeçalho)
 *
 * Exibe linhas no formato: Tabela de Preço | Preço
 * (Assume preço único por produto dentro da tabela; se vierem múltiplos EANs,
 * escolhe o primeiro preço existente.)
 */
@Component({
  selector: 'app-produtos-preco-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './produtos-preco-overlay.component.html',
  styleUrls: ['./produtos-preco-overlay.component.css']
})
export class ProdutosPrecoOverlayComponent {
  @Input() aberto = false;
  @Input() produtoId: number | null = null;
  @Input() referencia: string | null = null;

  @Output() close = new EventEmitter<void>();

  loading = signal(false);
  erroMsg = signal<string | null>(null);

  /**
   * rows: { tabela_id: number; tabela_nome: string; preco: number }[]
   */
  rows = signal<Array<{ tabela_id: number; tabela_nome: string; preco: number }>>([]);

  constructor(private produtosApi: ProdutosService) {}

  ngOnChanges(): void {
    if (this.aberto && this.produtoId) {
      this.recarregar();
    }
  }

  fechar(): void {
    this.close.emit();
  }

  recarregar(): void {
    if (!this.produtoId) return;
    this.loading.set(true);
    this.erroMsg.set(null);
    this.rows.set([]);

    this.produtosApi.getPrecos(this.produtoId).subscribe({
      next: (resp: any) => {
        const tabs = Array.isArray(resp?.tabelas) ? resp.tabelas : [];

        // Normaliza para preço único por tabela (pega o primeiro item com preço válido)
        const out: Array<{ tabela_id: number; tabela_nome: string; preco: number }> = [];
        for (const t of tabs) {
          const tid = t?.tabela_id;
          const tnome = t?.tabela_nome ?? String(tid ?? '');
          let preco = 0;

          const itens = Array.isArray(t?.itens) ? t.itens : [];
          const it = itens.find((x: any) => typeof x?.preco === 'number' || typeof x?.preco === 'string');
          if (it) {
            const p = Number(it.preco);
            if (!Number.isNaN(p)) preco = p;
          }

          if (tid != null) {
            out.push({ tabela_id: Number(tid), tabela_nome: tnome, preco });
          }
        }

        this.rows.set(out);
      },
      error: () => {
        this.erroMsg.set('Falha ao carregar Tabelas de Preço.');
      },
      complete: () => this.loading.set(false)
    });
  }
}
