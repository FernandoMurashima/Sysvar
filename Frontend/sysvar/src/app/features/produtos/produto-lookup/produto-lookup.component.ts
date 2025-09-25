import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProdutosService } from '../../../core/services/produtos.service';
import { ProdutoBasic as ProdutoBasicModel } from '../../../core/models/produto-basic.model';

type ProdutoBasicView = ProdutoBasicModel & {
  colecao_desc?: string | null;
  grupo_desc?: string | null;
  subgrupo_desc?: string | null;
  unidade_desc?: string | null;
  classificacao_fiscal?: string | null;
  produto_foto?: string | null;
  Ativo?: boolean;
};

@Component({
  selector: 'app-produto-lookup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './produto-lookup.component.html',
  styleUrls: ['./produto-lookup.component.css']
})
export class ProdutoLookupComponent {
  @Input() usarCampoInterno = false;

  resultado = signal<ProdutoBasicView | null>(null);
  buscou = signal(false);
  erroMsg = signal<string | null>(null);
  loading = signal(false);

  // ---- Foto (com múltiplas tentativas) ----
  private imageCandidates: string[] = [];
  private imageIdx = 0;
  imgSrc = signal<string>('');
  imageHidden = signal(false);

  @Output() selecionado = new EventEmitter<ProdutoBasicModel>();
  @Output() verVariacoes = new EventEmitter<ProdutoBasicModel>();

  constructor(private produtosApi: ProdutosService) {}

  buscarComReferencia(referencia: string) {
    this.erroMsg.set(null);
    this.loading.set(true);
    this.resultado.set(null);
    this.resetImage();
    this.buscou.set(true);

    this.produtosApi.list({ search: referencia.trim(), page: 1, page_size: 1 }).subscribe({
      next: (res: any) => {
        const arr = Array.isArray(res) ? res : (res?.results ?? []);
        const src = arr?.[0] as any | undefined;

        if (!src) {
          this.erroMsg.set('Nenhum produto encontrado.');
          this.loading.set(false);
          return;
        }

        const basic: ProdutoBasicView = {
          Idproduto: src.Idproduto ?? src.id ?? 0,
          Referencia: src.Referencia ?? src.referencia ?? '',
          Nome_produto: src.Nome_produto ?? src.Descricao ?? '',
          colecao_desc: src.colecao_desc ?? null,
          grupo_desc: src.grupo_desc ?? null,
          subgrupo_desc: src.subgrupo_desc ?? null,
          unidade_desc: src.unidade_desc ?? null,
          classificacao_fiscal: src.classificacao_fiscal ?? null,
          produto_foto: src.produto_foto ?? null,
          Ativo: !!(src.Ativo ?? src.ativo ?? true),
        };

        this.resultado.set(basic);
        this.prepareImage(basic.produto_foto || '');
        this.loading.set(false);
      },
      error: () => {
        this.erroMsg.set('Falha ao buscar produto.');
        this.loading.set(false);
      }
    });
  }

  onToggleStatus(prod: ProdutoBasicView) {
    if (!prod || !prod.Idproduto) return;

    if (prod.Ativo) {
      const motivo = window.prompt('Informe o motivo da inativação (mín. 3 caracteres):', '');
      if (motivo === null) return;
      if (!motivo || motivo.trim().length < 3) {
        this.erroMsg.set('Motivo inválido. Digite ao menos 3 caracteres.');
        return;
      }
      this.loading.set(true);
      this.produtosApi.inativarProduto(prod.Idproduto, motivo.trim()).subscribe({
        next: (resp) => {
          const novo = { ...prod, Ativo: !!resp?.Ativo };
          this.resultado.set(novo);
          this.erroMsg.set(null);
          alert('Produto inativado com sucesso.');
        },
        error: (err) => {
          const msg = err?.error?.detail || 'Não foi possível inativar o produto.';
          this.erroMsg.set(String(msg));
        },
        complete: () => this.loading.set(false)
      });
    } else {
      this.loading.set(true);
      this.produtosApi.ativarProduto(prod.Idproduto).subscribe({
        next: (resp) => {
          const novo = { ...prod, Ativo: !!resp?.Ativo };
          this.resultado.set(novo);
          this.erroMsg.set(null);
          alert('Produto ativado com sucesso.');
        },
        error: (err) => {
          const msg = err?.error?.detail || 'Não foi possível ativar o produto.';
          this.erroMsg.set(String(msg));
        },
        complete: () => this.loading.set(false)
      });
    }
  }

  // -------- Foto helpers --------
  private resetImage() {
    this.imageCandidates = [];
    this.imageIdx = 0;
    this.imgSrc.set('');
    this.imageHidden.set(false);
  }

  private prepareImage(nomeBruto: string) {
    this.resetImage();

    // 1) basename: retira qualquer pasta (C:\..., /alguma/pasta/..., etc.)
    const basename = (nomeBruto || '').trim().replace(/^.*[\\/]/, '');
    if (!basename) { this.imageHidden.set(true); return; }

    // 2) bases possíveis (aceita tanto em /assets/produtos quanto /assets)
    const bases = ['/assets/produtos/', '/assets/'];

    // 3) variações de nome
    const lower = basename.toLowerCase();
    const hasExt = /\.(jpe?g)$/i.test(lower);
    const noSpaces = lower.replace(/\s+/g, '');

    const candidates = new Set<string>();

    for (const base of bases) {
      // nome como veio
      candidates.add(base + basename);
      candidates.add(base + lower);
      candidates.add(base + noSpaces);

      // sem extensão → tenta .jpg/.jpeg
      if (!hasExt) {
        candidates.add(base + lower + '.jpg');
        candidates.add(base + lower + '.jpeg');
        candidates.add(base + noSpaces + '.jpg');
        candidates.add(base + noSpaces + '.jpeg');
      } else {
        // troca .jpeg <-> .jpg
        if (lower.endsWith('.jpeg')) {
          candidates.add(base + lower.replace(/\.jpeg$/, '.jpg'));
          candidates.add(base + noSpaces.replace(/\.jpeg$/, '.jpg'));
        }
        if (lower.endsWith('.jpg')) {
          candidates.add(base + lower.replace(/\.jpg$/, '.jpeg'));
          candidates.add(base + noSpaces.replace(/\.jpg$/, '.jpeg'));
        }
      }
    }

    this.imageCandidates = Array.from(candidates.values());
    if (this.imageCandidates.length) {
      this.imgSrc.set(this.imageCandidates[0]);
    } else {
      this.imageHidden.set(true);
    }
  }

  onImageError(_ev: Event): void {
    this.imageIdx++;
    if (this.imageIdx < this.imageCandidates.length) {
      this.imgSrc.set(this.imageCandidates[this.imageIdx]);
    } else {
      this.imageHidden.set(true);
    }
  }
}
