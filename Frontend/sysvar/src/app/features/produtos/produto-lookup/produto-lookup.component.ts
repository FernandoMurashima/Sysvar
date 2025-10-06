import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ProdutosService } from '../../../core/services/produtos.service';
import { ColecoesService } from '../../../core/services/colecoes.service';
import { GruposService } from '../../../core/services/grupos.service';
import { SubgruposService } from '../../../core/services/subgrupos.service';
import { UnidadesService } from '../../../core/services/unidades.service';

import { ProdutoSkuOverlayComponent } from '../produtos-sku-overlay/produtos-sku-overlay.component';
import { ProdutosPrecoOverlayComponent } from '../produtos-preco-overlay/produtos-preco-overlay.component';

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
  imports: [CommonModule, FormsModule, ProdutoSkuOverlayComponent, ProdutosPrecoOverlayComponent],
  templateUrl: './produto-lookup.component.html',
  styleUrls: ['./produto-lookup.component.css']
})
export class ProdutoLookupComponent {
  @Input() usarCampoInterno = false;

  resultado = signal<ProdutoBasicView | null>(null);
  buscou = signal(false);
  erroMsg = signal<string | null>(null);
  loading = signal(false);

  // Foto
  private imageCandidates: string[] = [];
  private imageIdx = 0;
  imgSrc = signal<string>('');
  imageHidden = signal(false);

  // Modal de senha
  askPwdOpen = signal(false);
  pwdValue = signal('');
  private pwdResolver: ((val: string | null) => void) | null = null;

  // SOBRETELA de SKUs
  overlayOpen = signal(false);
  overlayProdutoId = signal<number | null>(null);
  overlayRef = signal<string>('');

  // SOBRETELA de PREÇO
  precoOverlayOpen = signal(false);
  precoOverlayProdutoId = signal<number | null>(null);
  precoOverlayRef = signal<string>('');

  @Output() selecionado = new EventEmitter<ProdutoBasicModel>();
  @Output() verVariacoes = new EventEmitter<ProdutoBasicModel>();

  constructor(
    private produtosApi: ProdutosService,
    private colecoesApi: ColecoesService,
    private gruposApi: GruposService,
    private subgruposApi: SubgruposService,
    private unidadesApi: UnidadesService,
  ) {}

  // ========================
  // BUSCA POR REFERÊNCIA
  // ========================
  buscarComReferencia(referencia: string): void {
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
          classificacao_fiscal: src.classificacao_fiscal ?? null,
          produto_foto: src.produto_foto ?? null,
          Ativo: !!(src.Ativo ?? src.ativo ?? true),
          colecao_desc: src.colecao_desc ?? null,
          grupo_desc: src.grupo_desc ?? null,
          subgrupo_desc: src.subgrupo_desc ?? null,
          unidade_desc: src.unidade_desc ?? null,
        };

        this.resultado.set(basic);
        this.hydrateDescriptions(src);
        this.prepareImage(basic.produto_foto || '');
        this.loading.set(false);
      },
      error: () => {
        this.erroMsg.set('Falha ao buscar produto.');
        this.loading.set(false);
      }
    });
  }

  // ========================
  // ENRIQUECER DESCRIÇÕES
  // ========================
  private pad2(v: unknown): string { return (v ?? '').toString().padStart(2, '0'); }

  private hydrateDescriptions(src: any): void {
    const cur = this.resultado();
    if (!cur) return;

    // Coleção
    if (!cur.colecao_desc) {
      const cc = src.colecao ?? src.Colecao ?? src.colecao_codigo ?? null;
      if (cc != null && cc !== '') {
        const cc2 = this.pad2(cc);
        this.colecoesApi.list({ search: cc2, ordering: '-data_cadastro' }).subscribe({
          next: (res: any) => {
            const arr = Array.isArray(res) ? res : (res?.results ?? []);
            const item = arr.find((c: any) => this.pad2(c?.Codigo) === cc2);
            if (item?.Descricao) this.patchResultado({ colecao_desc: item.Descricao });
          }
        });
      }
    }

    // Grupo
    if (!cur.grupo_desc) {
      const gg = src.grupo ?? src.Grupo ?? src.grupo_codigo ?? null;
      if (gg != null && gg !== '') {
        const gg2 = this.pad2(gg);
        this.gruposApi.list({ search: gg2, ordering: 'Descricao' }).subscribe({
          next: (res: any) => {
            const arr = Array.isArray(res) ? res : (res?.results ?? []);
            const item = arr.find((g: any) => this.pad2(g?.Codigo) === gg2);
            if (item?.Descricao) this.patchResultado({ grupo_desc: item.Descricao });
          }
        });
      }
    }

    // Subgrupo
    if (!cur.subgrupo_desc) {
      const sgId = src.subgrupo ?? src.Idsubgrupo ?? null;
      if (sgId) {
        const id = Number(sgId);
        if (!Number.isNaN(id) && id > 0 && (this.subgruposApi as any).get) {
          (this.subgruposApi as any).get(id).subscribe({
            next: (sg: any) => { if (sg?.Descricao) this.patchResultado({ subgrupo_desc: sg.Descricao }); }
          });
        } else {
          this.subgruposApi.list({ search: String(sgId) }).subscribe({
            next: (res: any) => {
              const arr = Array.isArray(res) ? res : (res?.results ?? []);
              const item = arr?.[0];
              if (item?.Descricao) this.patchResultado({ subgrupo_desc: item.Descricao });
            }
          });
        }
      }
    }

    // Unidade
    if (!cur.unidade_desc) {
      const uid = src.unidade ?? src.Unidade ?? src.unidade_id ?? null;
      const id = Number(uid);
      if (id && !Number.isNaN(id) && (this.unidadesApi as any).get) {
        (this.unidadesApi as any).get(id).subscribe({
          next: (u: any) => { if (u?.Descricao) this.patchResultado({ unidade_desc: u.Descricao }); }
        });
      } else if (uid != null) {
        this.unidadesApi.list({ search: String(uid) }).subscribe({
          next: (res: any) => {
            const arr = Array.isArray(res) ? res : (res?.results ?? []);
            const item = arr?.[0];
            if (item?.Descricao) this.patchResultado({ unidade_desc: item.Descricao });
          }
        });
      }
    }
  }

  private patchResultado(partial: Partial<ProdutoBasicView>): void {
    const cur = this.resultado();
    if (!cur) return;
    this.resultado.set({ ...cur, ...partial });
  }

  // ========================
  // PROMPT DE SENHA (modal)
  // ========================
  private askPassword(): Promise<string | null> {
    this.pwdValue.set('');
    this.askPwdOpen.set(true);
    return new Promise<string | null>((resolve) => { this.pwdResolver = resolve; });
  }
  confirmPassword(): void {
    const v = (this.pwdValue() || '').trim();
    this.askPwdOpen.set(false);
    if (this.pwdResolver) { this.pwdResolver(v); this.pwdResolver = null; }
  }
  cancelPassword(): void {
    this.askPwdOpen.set(false);
    if (this.pwdResolver) { this.pwdResolver(null); this.pwdResolver = null; }
  }

  // ========================
  // ATIVAR / INATIVAR PRODUTO
  // ========================
  async onToggleStatus(prod: ProdutoBasicView): Promise<void> {
    if (!prod || !prod.Idproduto) return;

    if (prod.Ativo) {
      const motivo = window.prompt('Informe o motivo da inativação (mín. 3 caracteres):', '');
      if (motivo === null) return;
      if (!motivo || motivo.trim().length < 3) { alert('Motivo inválido.'); return; }

      const senha = await this.askPassword();
      if (senha === null) return;
      if (!senha) { alert('Senha obrigatória.'); return; }

      this.loading.set(true);
      this.produtosApi.inativarProduto(prod.Idproduto, motivo.trim(), senha).subscribe({
        next: (resp) => { this.resultado.set({ ...prod, Ativo: !!resp?.Ativo }); },
        error: (err) => { const msg = err?.error?.detail || 'Não foi possível inativar.'; alert(String(msg)); },
        complete: () => this.loading.set(false)
      });
      return;
    }

    this.loading.set(true);
    this.produtosApi.ativarProduto(prod.Idproduto).subscribe({
      next: (resp) => this.resultado.set({ ...prod, Ativo: !!resp?.Ativo }),
      error: (err) => alert(String(err?.error?.detail || 'Não foi possível ativar.')),
      complete: () => this.loading.set(false)
    });
  }

  // ========================
  // SOBRETELA DE SKUs
  // ========================
  openSkusOverlay(prod: ProdutoBasicView): void {
    if (!prod?.Idproduto) return;
    this.overlayProdutoId.set(prod.Idproduto);
    this.overlayRef.set(prod.Referencia || '');
    this.overlayOpen.set(true);
  }
  closeSkusOverlay(): void {
    this.overlayOpen.set(false);
  }

  // ========================
  // SOBRETELA DE PREÇO
  // ========================
  openPrecoOverlay(prod: ProdutoBasicView): void {
    if (!prod?.Idproduto) return;
    this.precoOverlayProdutoId.set(prod.Idproduto);
    this.precoOverlayRef.set(prod.Referencia || '');
    this.precoOverlayOpen.set(true);
  }
  closePrecoOverlay(): void {
    this.precoOverlayOpen.set(false);
  }

  // ========================
  // FOTO
  // ========================
  private resetImage(): void {
    this.imageCandidates = []; this.imageIdx = 0; this.imgSrc.set(''); this.imageHidden.set(false);
  }
  private prepareImage(nomeBruto: string): void {
    this.resetImage();
    const basename = (nomeBruto || '').trim().replace(/^.*[\\/]/, '');
    if (!basename) { this.imageHidden.set(true); return; }
    const bases = ['/assets/produtos/', '/assets/'];
    const lower = basename.toLowerCase();
    const hasExt = /\.(jpe?g|png|webp)$/i.test(lower);
    const noSpaces = lower.replace(/\s+/g, '');
    const candidates = new Set<string>();
    for (const b of bases) {
      candidates.add(b + basename);
      candidates.add(b + lower);
      candidates.add(b + noSpaces);
      if (!hasExt) for (const ext of ['.jpg', '.jpeg', '.png', '.webp']) {
        candidates.add(b + lower + ext); candidates.add(b + noSpaces + ext);
      }
    }
    this.imageCandidates = Array.from(candidates.values());
    if (this.imageCandidates.length) this.imgSrc.set(this.imageCandidates[0]); else this.imageHidden.set(true);
  }
  onImageError(): void {
    this.imageIdx++;
    if (this.imageIdx < this.imageCandidates.length) this.imgSrc.set(this.imageCandidates[this.imageIdx]);
    else this.imageHidden.set(true);
  }
}
