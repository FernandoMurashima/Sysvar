import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ProdutosService } from '../../../core/services/produtos.service';
import { ColecoesService } from '../../../core/services/colecoes.service';
import { GruposService } from '../../../core/services/grupos.service';
import { SubgruposService } from '../../../core/services/subgrupos.service';
import { UnidadesService } from '../../../core/services/unidades.service';

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
          classificacao_fiscal: src.classificacao_fiscal ?? null,
          produto_foto: src.produto_foto ?? null,
          Ativo: !!(src.Ativo ?? src.ativo ?? true),
          // descs virão preenchidas pelo hydrate abaixo
          colecao_desc: src.colecao_desc ?? null,
          grupo_desc: src.grupo_desc ?? null,
          subgrupo_desc: src.subgrupo_desc ?? null,
          unidade_desc: src.unidade_desc ?? null,
        };

        this.resultado.set(basic);

        // Reconstroi as descrições caso não tenham vindo no payload
        this.hydrateDescriptions(src);

        // Prepara a imagem
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
  private pad2(v: any): string {
    return (v ?? '').toString().padStart(2, '0');
  }

  /** Busca descrições de Coleção, Grupo, Subgrupo e Unidade a partir de códigos/ids do produto. */
  private hydrateDescriptions(src: any) {
    const cur = this.resultado();
    if (!cur) return;

    // ---- Coleção (normalmente é código de 2 dígitos) ----
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

    // ---- Grupo (código) ----
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

    // ---- Subgrupo (Idsubgrupo) ----
    if (!cur.subgrupo_desc) {
      const sgId = src.subgrupo ?? src.Idsubgrupo ?? null;
      if (sgId) {
        // Preferir GET /subgrupos/{id}/ quando disponível
        const id = Number(sgId);
        if (!Number.isNaN(id) && id > 0 && (this.subgruposApi as any).get) {
          (this.subgruposApi as any).get(id).subscribe({
            next: (sg: any) => {
              if (sg?.Descricao) this.patchResultado({ subgrupo_desc: sg.Descricao });
            },
            error: () => {
              // fallback por busca textual (pode não achar por id)
              this.subgruposApi.list({ search: String(id) }).subscribe({
                next: (res: any) => {
                  const arr = Array.isArray(res) ? res : (res?.results ?? []);
                  const item = arr?.[0];
                  if (item?.Descricao) this.patchResultado({ subgrupo_desc: item.Descricao });
                }
              });
            }
          });
        } else {
          // fallback direto
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

    // ---- Unidade (Idunidade) ----
    if (!cur.unidade_desc) {
      const uid = src.unidade ?? src.Unidade ?? src.unidade_id ?? null;
      const id = Number(uid);
      if (id && !Number.isNaN(id) && (this.unidadesApi as any).get) {
        (this.unidadesApi as any).get(id).subscribe({
          next: (u: any) => {
            if (u?.Descricao) this.patchResultado({ unidade_desc: u.Descricao });
          },
          error: () => {
            // fallback textual
            this.unidadesApi.list({ search: String(uid) }).subscribe({
              next: (res: any) => {
                const arr = Array.isArray(res) ? res : (res?.results ?? []);
                const item = arr?.[0];
                if (item?.Descricao) this.patchResultado({ unidade_desc: item.Descricao });
              }
            });
          }
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

  private patchResultado(partial: Partial<ProdutoBasicView>) {
    const cur = this.resultado();
    if (!cur) return;
    this.resultado.set({ ...cur, ...partial });
  }

  // ========================
  // ATIVAR / INATIVAR
  // ========================
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

  // ========================
  // FOTO
  // ========================
  private resetImage() {
    this.imageCandidates = [];
    this.imageIdx = 0;
    this.imgSrc.set('');
    this.imageHidden.set(false);
  }

  private prepareImage(nomeBruto: string) {
    this.resetImage();

    const basename = (nomeBruto || '').trim().replace(/^.*[\\/]/, '');
    if (!basename) { this.imageHidden.set(true); return; }

    const bases = ['/assets/produtos/', '/assets/'];
    const lower = basename.toLowerCase();
    const hasExt = /\.(jpe?g)$/i.test(lower);
    const noSpaces = lower.replace(/\s+/g, '');

    const candidates = new Set<string>();
    for (const base of bases) {
      candidates.add(base + basename);
      candidates.add(base + lower);
      candidates.add(base + noSpaces);
      if (!hasExt) {
        candidates.add(base + lower + '.jpg');
        candidates.add(base + lower + '.jpeg');
        candidates.add(base + noSpaces + '.jpg');
        candidates.add(base + noSpaces + '.jpeg');
      } else {
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
