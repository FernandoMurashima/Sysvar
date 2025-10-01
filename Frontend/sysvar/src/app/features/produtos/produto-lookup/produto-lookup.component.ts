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

  // Foto
  private imageCandidates: string[] = [];
  private imageIdx = 0;
  imgSrc = signal<string>('');
  imageHidden = signal(false);

  // Detalhamento
  skus = signal<any[] | null>(null);
  tabelas = signal<any[] | null>(null);
  mostrandoSkus = signal(false);
  mostrandoTabelas = signal(false);

  // Modal de senha
  askPwdOpen = signal(false);
  pwdValue = signal('');
  private pwdResolver: ((val: string | null) => void) | null = null;

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
    this.skus.set(null);
    this.tabelas.set(null);
    this.mostrandoSkus.set(false);
    this.mostrandoTabelas.set(false);
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
      error: (_err: any) => {
        this.erroMsg.set('Falha ao buscar produto.');
        this.loading.set(false);
      }
    });
  }

  // ========================
  // ENRIQUECER DESCRIÇÕES
  // ========================
  private pad2(v: unknown): string {
    return (v ?? '').toString().padStart(2, '0');
  }

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
            next: (sg: any) => {
              if (sg?.Descricao) this.patchResultado({ subgrupo_desc: sg.Descricao });
            },
            error: (_e: any) => {
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
          next: (u: any) => {
            if (u?.Descricao) this.patchResultado({ unidade_desc: u.Descricao });
          },
          error: (_e: any) => {
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
    return new Promise<string | null>((resolve) => {
      this.pwdResolver = resolve;
    });
  }

  confirmPassword(): void {
    const v = (this.pwdValue() || '').trim();
    this.askPwdOpen.set(false);
    if (this.pwdResolver) {
      this.pwdResolver(v);
      this.pwdResolver = null;
    }
  }

  cancelPassword(): void {
    this.askPwdOpen.set(false);
    if (this.pwdResolver) {
      this.pwdResolver(null);
      this.pwdResolver = null;
    }
  }

  // ========================
  // ATIVAR / INATIVAR
  // ========================
  async onToggleStatus(prod: ProdutoBasicView): Promise<void> {
    if (!prod || !prod.Idproduto) return;

    // INATIVAR
    if (prod.Ativo) {
      const motivo = window.prompt('Informe o motivo da inativação (mín. 3 caracteres):', '');
      if (motivo === null) return; // cancelado
      if (!motivo || motivo.trim().length < 3) {
        const msg = 'Motivo inválido. Digite ao menos 3 caracteres.';
        this.erroMsg.set(msg);
        alert(msg);
        return;
      }

      // senha via modal (oculta)
      const senha = await this.askPassword();
      if (senha === null) return; // cancelado
      if (!senha) {
        const msg = 'Senha obrigatória.';
        this.erroMsg.set(msg);
        alert(msg);
        return;
      }

      this.loading.set(true);
      this.produtosApi.inativarProduto(prod.Idproduto, motivo.trim(), senha).subscribe({
        next: (resp: { Ativo: boolean }) => {
          const novo = { ...prod, Ativo: !!resp?.Ativo };
          this.resultado.set(novo);
          this.erroMsg.set(null);
          alert('Produto inativado com sucesso.');
        },
        error: (err: any) => {
          this.loading.set(false);

          if (err?.status === 0) {
            const msg = 'Falha de rede/CORS: verifique CORS e o header X-Audit-Reason.';
            this.erroMsg.set(msg);
            alert(msg);
            return;
          }

          const status = err?.status;
          const detail = (err?.error?.detail || '').toString();

          if (status === 403 || detail.toLowerCase().includes('senha')) {
            const msg = 'Senha errada. Desativação não autorizada.';
            this.erroMsg.set(msg);
            alert(msg);
          } else if (detail) {
            this.erroMsg.set(detail);
            alert(detail);
          } else {
            const msg = 'Não foi possível inativar o produto.';
            this.erroMsg.set(msg);
            alert(msg);
          }
        },
        complete: () => this.loading.set(false)
      });

      return;
    }

    // ATIVAR
    this.loading.set(true);
    this.produtosApi.ativarProduto(prod.Idproduto).subscribe({
      next: (resp: { Ativo: boolean }) => {
        const novo = { ...prod, Ativo: !!resp?.Ativo };
        this.resultado.set(novo);
        this.erroMsg.set(null);
        alert('Produto ativado com sucesso.');
      },
      error: (err: any) => {
        this.loading.set(false);
        const msg = err?.error?.detail || 'Não foi possível ativar o produto.';
        this.erroMsg.set(String(msg));
        alert(String(msg));
      },
      complete: () => this.loading.set(false)
    });
  }

  // ========================
  // DETALHAMENTO (SKUs / Tabelas)
  // ========================
  carregarSkus(prod: ProdutoBasicView): void {
    if (!prod?.Idproduto) return;
    this.mostrandoTabelas.set(false);
    this.mostrandoSkus.set(true);
    this.skus.set(null);

    this.produtosApi.getSkus(prod.Idproduto).subscribe({
      next: (resp: any) => this.skus.set(resp?.skus ?? []),
      error: (_e: any) => {
        this.erroMsg.set('Falha ao carregar SKUs.');
        alert('Falha ao carregar SKUs.');
      }
    });
  }

  carregarTabelas(prod: ProdutoBasicView): void {
    if (!prod?.Idproduto) return;
    this.mostrandoSkus.set(false);
    this.mostrandoTabelas.set(true);
    this.tabelas.set(null);

    this.produtosApi.getPrecos(prod.Idproduto).subscribe({
      next: (resp: any) => this.tabelas.set(resp?.tabelas ?? []),
      error: (_e: any) => {
        this.erroMsg.set('Falha ao carregar Tabelas/Preços.');
        alert('Falha ao carregar Tabelas/Preços.');
      }
    });
  }

  // ========================
  // FOTO
  // ========================
  private resetImage(): void {
    this.imageCandidates = [];
    this.imageIdx = 0;
    this.imgSrc.set('');
    this.imageHidden.set(false);
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
    for (const base of bases) {
      candidates.add(base + basename);
      candidates.add(base + lower);
      candidates.add(base + noSpaces);
      if (!hasExt) {
        for (const ext of ['.jpg', '.jpeg', '.png', '.webp']) {
          candidates.add(base + lower + ext);
          candidates.add(base + noSpaces + ext);
        }
      } else {
        for (const [from, to] of [['.jpeg', '.jpg'], ['.jpg', '.jpeg']]) {
          if (lower.endsWith(from)) {
            candidates.add(base + lower.replace(from, to));
            candidates.add(base + noSpaces.replace(from, to));
          }
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
