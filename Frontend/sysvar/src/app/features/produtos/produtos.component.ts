import { Component, OnInit, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, UntypedFormBuilder, UntypedFormGroup, ReactiveFormsModule } from '@angular/forms';

import { ProdutosService } from '../../core/services/produtos.service';
import { ColecoesService } from '../../core/services/colecoes.service';
import { GruposService } from '../../core/services/grupos.service';
import { SubgruposService } from '../../core/services/subgrupos.service';
import { UnidadesService } from '../../core/services/unidades.service';
import { NcmsService } from '../../core/services/ncms.service';
import { CodigosService, CodigoRow } from '../../core/services/codigos.service';
import { TabelaprecoService } from '../../core/services/tabelapreco.service';
import { GradesService } from '../../core/services/grades.service';
import { TamanhosService } from '../../core/services/tamanhos.service';
import { CoresService } from '../../core/services/cores.service';

import { LojasSelectorComponent } from '../../shared/lojas-selector/lojas-selector.component';
import { ProdutoLookupComponent } from './produto-lookup/produto-lookup.component';
import { RouterLink } from '@angular/router';

import { GrupoModel } from '../../core/models/grupo';
import { SubgrupoModel } from '../../core/models/subgrupo';
import { Unidade } from '../../core/models/unidade';
import { Colecao } from '../../core/models/colecoes';
import { TabelaPreco } from '../../core/models/tabelapreco';
import { Grade } from '../../core/models/grade';
import { TamanhoModel } from '../../core/models/tamanho';
import { CorModel } from '../../core/models/cor';
import { ProdutoBasic } from '../../core/models/produto-basic.model';

import { firstValueFrom } from 'rxjs';

// === NOVO: sobretelas dentro do modal de detalhe ===
import { ProdutoSkuOverlayComponent } from './produtos-sku-overlay/produtos-sku-overlay.component';
import { ProdutosPrecoOverlayComponent } from './produtos-preco-overlay/produtos-preco-overlay.component';

type Ncm = { ncm: string; descricao?: string };
type AcaoProduto = '' | 'novo' | 'consultar' | 'editar' | 'uso';

@Component({
  selector: 'app-produtos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    LojasSelectorComponent,
    ProdutoLookupComponent,
    RouterLink,
    // === NOVO: registra as sobretelas aqui também ===
    ProdutoSkuOverlayComponent,
    ProdutosPrecoOverlayComponent
  ],
  templateUrl: './produtos.component.html',
  styleUrls: ['./produtos.component.css']
})
export class ProdutosComponent implements OnInit {
  action: AcaoProduto = '';

  constructor(
    private produtosApi: ProdutosService,
    private colecoesApi: ColecoesService,
    private gruposApi: GruposService,
    private subgruposApi: SubgruposService,
    private unidadesApi: UnidadesService,
    private ncmsApi: NcmsService,
    private codigosApi: CodigosService,
    private tabelasApi: TabelaprecoService,
    private gradesApi: GradesService,
    private tamanhosApi: TamanhosService,
    private coresApi: CoresService,
    private fb: UntypedFormBuilder
  ) {}

  @ViewChild(ProdutoLookupComponent) lookupCmp!: ProdutoLookupComponent;

  // ===== listas (catálogos) =====
  grupos: GrupoModel[] = [];
  subgrupos: SubgrupoModel[] = [];
  unidades: Unidade[] = [];
  ncms: Ncm[] = [];
  tabelasPreco: TabelaPreco[] = [];
  grades: Grade[] = [];

  colecoes: Colecao[] = [];
  colecoesCodigos: string[] = [];
  estacoesDaColecao: string[] = [];

  // ===== cores / tamanhos =====
  cores: CorModel[] = [];
  corFiltro = '';
  coresSelecionadas = new Set<number>();
  tamanhosDaGrade: TamanhoModel[] = [];

  // ===== mensagens =====
  errorMsg = '';
  successMsg = '';
  infoMsg = '';
  fieldErrors: Array<{ field: string; messages: string[] }> = [];

  // ===== batch SKUs =====
  batchMsg = '';
  batchErrors: string[] = [];
  savingSkus = false;

  // ===== referência (revenda) =====
  referenciaPreview = '';

  // ===== produto atual =====
  productId: number | null = null;

  // ===== lojas para estoque inicial =====
  lojasMarcadas: number[] = [];

  // ===== SKUs gerados (preview — revenda) =====
  combinacoes: Array<{ cor: CorModel; tamanho: TamanhoModel; ean13: string; preco: number | null; }> = [];

  // ===== pós-salvar SKUs =====
  awaitKeyAfterSave = false;

  // ===== foto (revenda) =====
  private fotoCandidates: string[] = [];
  private fotoIdx = 0;
  fotoSrc = '';
  fotoHidden = false;

  // ===== modais =====
  lojasDialogOpen = false;
  coresDialogOpen = false;

  // ===== DETALHE (modal) =====
  detailDialogOpen = false;
  detailData: any = null;

  // === NOVO: foto do detalhe com fallback de candidatos ===
  private detailFotoCandidates: string[] = [];
  private detailFotoIdx = 0;
  detailFotoSrc = '';
  detailFotoHidden = false;

  // === NOVO: sobretelas (VLSI e VFW) dentro do modal ===
  detailProdutoId: number | null = null;
  detailReferencia: string = '';
  detailSkuOverlayOpen = false;
  detailPrecoOverlayOpen = false;

  // === NOVO: loading de ação de status no detalhe ===
  detailLoading = false;

  // ===== forms =====
  /** REV**ENDA** */
  form = {
    colecao: null as string | null,
    estacao: null as string | null,
    grupo: null as string | null,
    subgrupo: null as number | null,
    unidade: null as number | null,
    classificacao_fiscal: '' as string,
    tabela_preco: null as number | null,
    Preco: null as number | null,
    grade: null as number | null,
    Descricao: '' as string,
    Desc_reduzida: '' as string | null,
    produto_foto: '' as string | null
  };

  /** USO & CONSUMO (simples) */
  formUso = {
    Descricao: '' as string,
    descricao_longa: '' as string,
    unidade: null as number | null,
    classificacao_fiscal: '' as string,
    ativo: true as boolean
  };

  // ===== CONSULTA / LISTVIEW =====
  filtrosFG: UntypedFormGroup = this.fb.group({
    tipo: [''],
    grupo: [''],
    referencia: [''],
    descricao: [''],
    ativo: ['all'],
    ordering: ['-id']
  });

  rows: any[] = [];
  loading = false;

  // paginação client-side
  page = 1;
  pageSize = 10;
  pageSizeOptions = [10, 25, 50, 100];
  get totalRows(): number { return this.rows.length; }
  get totalPages(): number { const n = Math.ceil((this.totalRows || 0) / (this.pageSize || 1)); return Math.max(1, n || 1); }
  get pageStart(): number { return this.totalRows === 0 ? 0 : (this.page - 1) * this.pageSize + 1; }
  get pageEnd(): number { return Math.min(this.page * this.pageSize, this.totalRows); }
  get rowsPaged(): any[] { const ini = (this.page - 1) * this.pageSize; return this.rows.slice(ini, ini + this.pageSize); }
  goFirst(){ this.page = 1; }
  goPrev(){ if (this.page > 1) this.page--; }
  goNext(){ if (this.page < this.totalPages) this.page++; }
  goLast(){ this.page = this.totalPages; }

  // ===== EDIÇÃO =====
  editingId: number | null = null;
  editTipo: '1' | '2' | null = null; // 1=Revenda 2=Uso

  ngOnInit(): void {
    // catálogos
    this.loadColecoes();

    this.gruposApi.list({ ordering: 'Descricao' }).subscribe({ next: (res: any) => { this.grupos = Array.isArray(res) ? res : (res?.results ?? []); } });
    this.unidadesApi.list({ ordering: 'Descricao' }).subscribe({ next: (res: any) => { this.unidades = Array.isArray(res) ? res : (res?.results ?? []); } });
    this.ncmsApi.list({ ordering: 'ncm' }).subscribe({ next: (res: any) => { this.ncms = Array.isArray(res) ? res : (res?.results ?? []); } });
    this.tabelasApi.list({ ordering: 'NomeTabela' }).subscribe({ next: (res: any) => { this.tabelasPreco = Array.isArray(res) ? res : (res?.results ?? []); } });
    this.gradesApi.list({ ordering: 'Descricao' }).subscribe({ next: (res: any) => { this.grades = Array.isArray(res) ? res : (res?.results ?? []); } });
    this.coresApi.list({ ordering: 'Descricao' }).subscribe({ next: (res: any) => { this.cores = Array.isArray(res) ? res : (res?.results ?? []); } });

    // primeira carga
    this.buscarProdutos();
  }

  private loadColecoes(): void {
    this.colecoesApi.list({ ordering: '-data_cadastro' }).subscribe({
      next: (res: any) => {
        this.colecoes = Array.isArray(res) ? res : (res?.results ?? []),
        this.colecoesCodigos = Array.from(new Set(
          this.colecoes.map(c => (c.Codigo || '').toString().padStart(2,'0'))
        )).sort();
      }
    });
  }

  setAction(a: AcaoProduto): void {
    this.action = a;
    this.clearMessages();
    if (a === 'novo') this.resetFormRevenda();
    if (a === 'uso') this.resetFormUso();
    if (a === 'consultar') this.buscarProdutos();
  }

  cancelar(): void {
    this.action = '';
    this.clearMessages();
    this.editingId = null;
    this.editTipo = null;
  }

  /* ======================= LISTVIEW / CONSULTA ======================= */

  private normTipoFiltro(v: any): '1' | '2' | '' {
    const s = String(v ?? '').trim().toUpperCase();
    if (s === '1' || s === 'REV' || s === 'REVENDA') return '1';
    if (s === '2' || s === 'USO' || s === 'USO&CONSUMO' || s === 'USO_CONSUMO' || s === 'USOCONSUMO') return '2';
    return '';
  }

  private normGrupoFiltro(v: any): string | '' {
    if (v === null || v === undefined) return '';
    const s = String(v).trim();
    if (!s) return '';
    const n = Number(s);
    if (Number.isFinite(n)) return String(Math.trunc(n)).padStart(2, '0');
    return s.padStart(2, '0');
  }

  private buildFilterParams() {
    const f = this.filtrosFG.getRawValue();

    const params: any = {};
    params.ordering = f.ordering || '-id';

    const ativo: 'true' | 'false' | 'all' = (f.ativo || 'all') as any;
    if (ativo !== 'all') {
      params.ativo = ativo;
      params.Ativo = ativo;
      params.is_active = ativo;
    }

    const tipo = this.normTipoFiltro(f.tipo);
    if (tipo) {
      params.tipo = tipo;
      params.Tipo = tipo;
      params.Tipoproduto = tipo;
      params.tipo_produto = tipo;
      params.tipo__exact = tipo;
    }

    const grupo = this.normGrupoFiltro(f.grupo);
    if (grupo) {
      params.grupo = grupo;
      params.Grupo = grupo;
      params.grupo_cod = grupo;
      params.grupo__codigo = grupo;
      params.grupo_codigo = grupo;
    }

    const referencia = String(f.referencia || '').trim();
    if (referencia) {
      params.referencia = referencia;
      params.ref = referencia;
      params.Referencia = referencia;
      params.referencia__icontains = referencia;
      params.ref__icontains = referencia;
    }

    const descricao = String(f.descricao || '').trim();
    if (descricao) {
      params.search = descricao;
      params.Descricao__icontains = descricao;
    }

    return params;
  }

  async buscarProdutos(): Promise<void> {
    this.loading = true;
    this.page = 1;

    try {
      const params = this.buildFilterParams();
      const data = await firstValueFrom(this.produtosApi.list(params));
      const arr = Array.isArray(data) ? data : (data?.results ?? []);
      this.rows = arr;
    } catch {
      this.rows = [];
    } finally {
      this.loading = false;
    }
  }

  setOrdenacao(campo: string) {
    const cur = String(this.filtrosFG.get('ordering')?.value || '');
    const plain = cur.replace(/^-/, '');
    const next = (plain === campo) ? (cur.startsWith('-') ? campo : `-${campo}`) : campo;
    this.filtrosFG.patchValue({ ordering: next }, { emitEvent: false });
    this.buscarProdutos();
  }

  limparFiltros() {
    this.filtrosFG.reset({
      tipo: '',
      grupo: '',
      referencia: '',
      descricao: '',
      ativo: 'all',
      ordering: '-id'
    }, { emitEvent: false });
    this.page = 1;
    this.rows = [];
  }

  /* ============================ DETALHAR ============================ */

  async detalharLinha(p: any) {
    this.clearMessages();

    const id = Number(p?.Idproduto ?? p?.id ?? 0);
    if (!id) return;

    const tipo = this.normalizeTipo(p);
    if (tipo === '2') {
      // Uso & Consumo -> só mensagem
      this.infoMsg = 'Produto sem detalhe.';
      this.detailDialogOpen = false;
      this.detailData = null;
      return;
    }

    // Revenda -> abre modal sobreposto
    try {
      const det = await firstValueFrom(this.produtosApi.get(id) as any).catch(() => p);
      this.detailData = det || p || {};

      // === NOVO: referencia + id para ações internas ===
      this.detailProdutoId = Number(this.detailData?.Idproduto ?? this.detailData?.id ?? id);
      this.detailReferencia = String(this.detailData?.referencia ?? p?.referencia ?? '');

      // === NOVO: preparar foto robusta (candidatos + fallback) ===
      const nome = (this.detailData?.produto_foto || '').toString().trim();
      this.prepareDetailFoto(nome);

      this.detailDialogOpen = true;
    } catch {
      this.detailData = p || {};
      this.detailProdutoId = Number(p?.Idproduto ?? p?.id ?? null);
      this.detailReferencia = String(p?.referencia ?? '');
      this.prepareDetailFoto((p?.produto_foto || '').toString());
      this.detailDialogOpen = true;
    }
  }

  closeDetailDialog(): void {
    this.detailDialogOpen = false;
    this.detailData = null;

    // limpa estados de foto/sobretelas
    this.resetDetailFoto();
    this.detailSkuOverlayOpen = false;
    this.detailPrecoOverlayOpen = false;
  }

  // === NOVO: status no detalhe ===
  isDetailAtivo(): boolean {
    const d = this.detailData;
    return !!(d?.Ativo ?? d?.ativo ?? true);
  }

  async toggleDetailStatus(): Promise<void> {
    const id = this.detailProdutoId;
    if (!id) return;

    // se ativo -> pedir motivo + senha; se inativo -> ativar direto
    if (this.isDetailAtivo()) {
      const motivo = window.prompt('Informe o motivo da inativação (mín. 3 caracteres):', '');
      if (motivo === null) return;
      if (!motivo || motivo.trim().length < 3) { alert('Motivo inválido.'); return; }

      const senha = window.prompt('Digite sua senha para confirmar:', '');
      if (senha === null) return;
      if (!senha || !senha.trim()) { alert('Senha obrigatória.'); return; }

      this.detailLoading = true;
      this.produtosApi.inativarProduto(id, motivo.trim(), senha.trim()).subscribe({
        next: (resp) => {
          const novoAtivo = !!resp?.Ativo;
          // reflete nos dois campos para não haver desencontro
          if (this.detailData) {
            this.detailData.Ativo = novoAtivo;
            this.detailData.ativo = novoAtivo;
          }
        },
        error: (err) => {
          const msg = err?.error?.detail || 'Não foi possível inativar.';
          alert(String(msg));
        },
        complete: () => { this.detailLoading = false; }
      });
      return;
    }

    this.detailLoading = true;
    this.produtosApi.ativarProduto(id).subscribe({
      next: (resp) => {
        const novoAtivo = !!resp?.Ativo;
        if (this.detailData) {
          this.detailData.Ativo = novoAtivo;
          this.detailData.ativo = novoAtivo;
        }
      },
      error: (err) => {
        const msg = err?.error?.detail || 'Não foi possível ativar.';
        alert(String(msg));
      },
      complete: () => { this.detailLoading = false; }
    });
  }

  /* ============================ EDIÇÃO ============================ */

  async editarLinha(p: any) {
    // Editar SOMENTE para Uso & Consumo (tipo 2)
    const tipo = this.normalizeTipo(p);
    if (tipo !== '2') {
      return;
    }

    const id = Number(p?.Idproduto ?? p?.id ?? 0);
    if (!id) return;

    const toNum = (v: any): number | null => {
      if (v === null || v === undefined || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    try {
      const det: any = await firstValueFrom(this.produtosApi.get(id) as any);
      this.editingId = id;
      this.editTipo = '2';

      // USO — preencher formUso
      this.formUso.Descricao            = det?.Descricao ?? det?.descricao ?? '';
      this.formUso.descricao_longa      = det?.descricao_longa ?? det?.Descricao ?? '';
      this.formUso.unidade              = toNum(det?.unidade ?? det?.Unidade ?? null);
      this.formUso.classificacao_fiscal = det?.classificacao_fiscal ?? det?.NCM ?? '';
      this.formUso.ativo                = (det?.Ativo ?? det?.ativo ?? true) ? true : false;

      this.action = 'editar';
    } catch {
      this.editingId = null;
      this.editTipo = null;
    }
  }

  salvar(): void {
    this.clearMessages();

    if (!this.form.colecao || !this.form.estacao || !this.form.grupo || !this.form.Descricao) {
      this.errorMsg = 'Preencha Coleção, Estação, Grupo e Descrição.'; return;
    }
    if (!this.form.unidade) { this.errorMsg = 'Selecione a Unidade.'; return; }
    if (!this.form.classificacao_fiscal) { this.errorMsg = 'Selecione a Classificação Fiscal (NCM).'; return; }
    if (!this.form.tabela_preco) { this.errorMsg = 'Selecione a Tabela de Preço.'; return; }
    if (this.form.Preco == null || this.form.Preco < 0) { this.errorMsg = 'Informe um Preço de venda válido.'; return; }

    const fotoBasename = this.sanitizeFotoName(this.form.produto_foto || '');

    const payload: any = {
      Tipoproduto: '1',       // Revenda
      tipo: 'REV',
      Descricao: this.form.Descricao,
      Desc_reduzida: (this.form.Desc_reduzida ?? this.form.Descricao ?? '').toString(),
      colecao: this.form.colecao.toString().padStart(2, '0'),
      estacao: this.form.estacao.toString().padStart(2, '0'),
      grupo: this.form.grupo.toString().padStart(2, '0'),
      subgrupo: this.form.subgrupo,
      unidade: this.form.unidade,
      classificacao_fiscal: this.form.classificacao_fiscal,
      grade: this.form.grade,
      tabela_preco: this.form.tabela_preco,
      preco: this.form.Preco,
      produto_foto: fotoBasename || null
    };

    const doAfter = (p: any) => {
      this.productId = p?.Idproduto ?? p?.id ?? null;
      this.successMsg = `Produto salvo${p?.referencia ? ` (${p.referencia})` : ''}.`;
      this.action = 'consultar';
      this.buscarProdutos();
    };

    if (this.editingId) {
      this.produtosApi.update(this.editingId, payload).subscribe({
        next: doAfter,
        error: (err) => this.handleFieldErrors(err, 'Não foi possível atualizar o produto.')
      });
    } else {
      this.produtosApi.create(payload).subscribe({
        next: doAfter,
        error: (err) => this.handleFieldErrors(err, 'Não foi possível salvar o produto.')
      });
    }
  }

  salvarUso(): void {
    this.clearMessages();

    if (!this.formUso.Descricao) { this.errorMsg = 'Informe o Nome do produto.'; return; }
    if (!this.formUso.unidade) { this.errorMsg = 'Selecione a Unidade.'; return; }
    if (!this.formUso.classificacao_fiscal) { this.errorMsg = 'Selecione o NCM.'; return; }

    const payload: any = {
      Tipoproduto: '2',
      tipo: '2',
      Descricao: this.formUso.Descricao,
      descricao: this.formUso.descricao_longa ?? '',
      unidade: this.formUso.unidade,
      classificacao_fiscal: this.formUso.classificacao_fiscal,
      Ativo: this.formUso.ativo
    };

    const done = () => {
      this.successMsg = 'Produto de Uso & Consumo salvo com sucesso.';
      this.action = 'consultar';
      this.buscarProdutos();
    };

    if (this.editingId && this.editTipo === '2') {
      this.produtosApi.update(this.editingId, payload).subscribe({
        next: done,
        error: (err) => this.handleFieldErrors(err, 'Não foi possível atualizar o produto de Uso & Consumo.')
      });
    } else {
      this.produtosApi.create(payload).subscribe({
        next: done,
        error: (err) => this.handleFieldErrors(err, 'Não foi possível salvar o produto de Uso & Consumo.')
      });
    }
  }

  /* ---------------------- callbacks do lookup ---------------------- */
  buscarProduto(ref: string): void {
    const referencia = (ref || '').trim();
    if (!referencia) return;
    if (this.lookupCmp) this.lookupCmp.buscarComReferencia(referencia);
  }
  limparBusca(inputEl: HTMLInputElement): void {
    if (inputEl) inputEl.value = '';
    if (this.lookupCmp) {
      (this.lookupCmp as any).resultado?.set(null);
      (this.lookupCmp as any).buscou?.set(false);
      (this.lookupCmp as any).erroMsg?.set(null);
    }
  }
  onProdutoSelecionado(_prod: ProdutoBasic): void { /* opcional */ }
  onVerVariacoes(_prod: ProdutoBasic): void { /* opcional */ }

  /* ---------------- Revenda — dependências e helpers --------------- */
  onColecaoChange(): void {
    this.estacoesDaColecao = [];
    this.form.estacao = null;
    this.referenciaPreview = '';

    if (!this.form.colecao) return;
    const cc = this.form.colecao.toString().padStart(2, '0');

    const estSet = new Set<string>();
    this.colecoes
      .filter(c => (c.Codigo || '').toString().padStart(2, '0') === cc)
      .forEach(c => estSet.add((c.Estacao || '').toString().padStart(2, '0')));
    this.estacoesDaColecao = Array.from(estSet).sort();

    this.updateReferenciaPreview();
  }

  onEstacaoChange(): void { this.updateReferenciaPreview(); }

  onGrupoChange(): void {
    this.form.subgrupo = null;
    if (!this.form.grupo) { this.subgrupos = []; this.referenciaPreview = ''; return; }

    const gcod = this.form.grupo.toString().padStart(2, '0');
    const g = this.grupos.find(x => (x.Codigo || '').toString().padStart(2, '0') === gcod);
    if (!g?.Idgrupo) { this.subgrupos = []; this.referenciaPreview = ''; return; }

    this.subgruposApi.list({ Idgrupo: g.Idgrupo, ordering: 'Descricao' }).subscribe({
      next: (res: any) => { this.subgrupos = Array.isArray(res) ? res : (res?.results ?? []); }
    });

    this.updateReferenciaPreview();
  }

  onGradeChange(): void {
    this.tamanhosDaGrade = [];
    this.combinacoes = [];
    if (!this.form.grade) return;
    this.tamanhosApi.list({ idgrade: this.form.grade!, ordering: 'Tamanho' }).subscribe({
      next: (res: any) => { this.tamanhosDaGrade = Array.isArray(res) ? res : (res?.results ?? []); }
    });
  }

  grupoLabel(g: GrupoModel): string {
    const cod = (g.Codigo || '').toString().padStart(2, '0');
    return `${cod} — ${g.Descricao}`;
  }

  private clearMessages(): void {
    this.errorMsg = '';
    this.successMsg = '';
    this.infoMsg = '';
    this.fieldErrors = [];
    this.batchMsg = '';
    this.batchErrors = [];
  }

  private updateReferenciaPreview(): void {
    this.referenciaPreview = '';
    if (!this.form.colecao || !this.form.estacao || !this.form.grupo) return;

    const cc = this.form.colecao.toString().padStart(2, '0');
    const ee = this.form.estacao.toString().padStart(2, '0');
    const gg = this.form.grupo.toString().padStart(2, '0');

    this.codigosApi.getRow(cc, ee).subscribe({
      next: (row: CodigoRow | null) => {
        const atual = Number(row?.valor_var ?? 0);
        const prox = (atual + 1).toString().padStart(3, '0');
        this.referenciaPreview = `${cc}-${ee}-${gg}${prox}`;
      }
    });
  }

  get coresSelecionadasArray(): number[] {
    return Array.from(this.coresSelecionadas.values());
  }
  set coresSelecionadasArray(arr: number[]) {
    this.coresSelecionadas = new Set<number>(Array.isArray(arr) ? arr : []);
  }

  get coresFiltradas(): CorModel[] {
    const q = (this.corFiltro || '').toLowerCase().trim();
    if (!q) return this.cores;
    return this.cores.filter(c =>
      (c.Descricao || '').toLowerCase().includes(q) ||
      (c.Codigo || '').toLowerCase().includes(q)
    );
  }
  selecionarTodasVisiveis(): void {
    for (const c of this.coresFiltradas) if (c.Idcor != null) this.coresSelecionadas.add(c.Idcor);
  }
  limparSelecaoCores(): void { this.coresSelecionadas.clear(); }
  toggleCor(id: number | null | undefined, checked: boolean): void {
    if (id == null) return;
    if (checked) this.coresSelecionadas.add(id); else this.coresSelecionadas.delete(id);
  }

  private ean13CheckDigit12(d12: string): string {
    const digits = d12.split('').map(d => parseInt(d, 10));
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      const pos = i + 1;
      sum += digits[i] * (pos % 2 === 0 ? 3 : 1);
    }
    const mod = sum % 10;
    const check = (10 - mod) % 10;
    return String(check);
  }
  private gerarEan13Local(seq: number): string {
    const prefixoPais = '789';
    const prefixoEmpresa = '1234';
    const produto = String(seq % 100000).padStart(5, '0');
    const base12 = `${prefixoPais}${prefixoEmpresa}${produto}`;
    const dv = this.ean13CheckDigit12(base12);
    return `${base12}${dv}`;
  }

  async gerarSkus(): Promise<void> {
    this.errorMsg = ''; this.successMsg = ''; this.infoMsg = '';
    this.combinacoes = [];

    if (!this.form.grade) { this.errorMsg = 'Selecione a Grade.'; return; }
    if (this.coresSelecionadas.size === 0) { this.errorMsg = 'Selecione ao menos uma Cor.'; return; }
    if (this.form.tabela_preco == null || this.form.Preco == null) {
      this.errorMsg = 'Informe Tabela de Preço e o Preço de venda.'; return;
    }

    if (!this.tamanhosDaGrade.length) {
      const res = await firstValueFrom(this.tamanhosApi.list({ idgrade: this.form.grade!, ordering: 'Tamanho' }));
      this.tamanhosDaGrade = Array.isArray(res) ? res : (res?.results ?? []);
    }

    const coresMap = new Map<number, CorModel>();
    this.cores.forEach(c => { if (c.Idcor != null) coresMap.set(c.Idcor, c); });

    let seq = Date.now() % 100000;

    for (const corId of Array.from(this.coresSelecionadas.values())) {
      const cor = coresMap.get(corId);
      if (!cor) continue;

      for (const tam of this.tamanhosDaGrade) {
        let ean13 = '';
        try {
          const resp = await firstValueFrom(this.codigosApi.nextEan13());
          ean13 = resp?.ean13 || '';
        } catch { /* fallback */ }
        if (!ean13) ean13 = this.gerarEan13Local(++seq);

        this.combinacoes.push({ cor, tamanho: tam, ean13, preco: this.form.Preco });
      }
    }

    this.infoMsg = `Gerados ${this.combinacoes.length} SKUs para as cores e tamanhos selecionados.`;
  }

  salvarSkus(produtoSalvo?: any): void {
    this.batchMsg = '';
    this.batchErrors = [];

    const pid = produtoSalvo?.Idproduto ?? produtoSalvo?.id ?? this.productId ?? null;
    if (!pid) { this.errorMsg = 'Produto não identificado. Salve o produto antes de salvar os SKUs.'; return; }
    if (!this.form.tabela_preco) { this.errorMsg = 'Selecione a Tabela de Preço antes de salvar os SKUs.'; return; }
    if (this.form.Preco == null) { this.errorMsg = 'Informe um preço padrão para os SKUs.'; return; }
    if (!this.combinacoes.length) { this.errorMsg = 'Nenhuma combinação para salvar.'; return; }

    const itens = this.combinacoes.map(c => ({
      cor_id: c.cor.Idcor!,
      tamanho_id: c.tamanho.Idtamanho!,
      ean13: c.ean13,
      preco: c.preco ?? this.form.Preco!
    }));

    const payload = {
      product_id: Number(pid),
      tabela_preco_id: this.form.tabela_preco!,
      preco_padrao: this.form.Preco!,
      lojas: this.lojasMarcadas,
      itens
    };

    this.savingSkus = true;
    this.produtosApi.saveSkus(payload).subscribe({
      next: (res) => {
        this.savingSkus = false;
        const created = res?.created ?? 0;
        const updated = res?.updated ?? 0;
        const errList = Array.isArray(res?.errors) ? res.errors : [];
        this.batchMsg = `SKUs salvos: ${created} criado(s), ${updated} atualizado(s).`;
        if (errList.length) this.batchErrors = errList.map((e: any) => `Item #${e.index}: ${e.detail || 'erro na validação'}`);
        this.successMsg = 'SKUs salvos com sucesso.';
        this.awaitKeyAfterSave = true;
      },
      error: (err) => {
        this.savingSkus = false;
        this.errorMsg = 'Falha ao salvar os SKUs.';
        if (err?.error?.detail) this.batchErrors = [String(err.error.detail)];
      }
    });
  }

  @HostListener('document:keydown', ['$event'])
  onAnyKey(_ev: KeyboardEvent): void {
    if (!this.awaitKeyAfterSave) return;
    this.awaitKeyAfterSave = false;
    this.successMsg = '';
    this.batchMsg = '';
    this.setAction('consultar');
    this.buscarProdutos();
  }

  /* ============================== util ============================== */
  private sanitizeFotoName(nome: string): string {
    return (nome || '').trim().replace(/^.*[\\/]/, '');
  }
  onFotoInputChange(): void {
    const base = this.sanitizeFotoName(this.form.produto_foto || '');
    this.prepareFoto(base);
  }
  private resetFotoPreview(): void {
    this.fotoCandidates = [];
    this.fotoIdx = 0;
    this.fotoSrc = '';
    this.fotoHidden = false;
  }
  private prepareFoto(basename: string): void {
    this.resetFotoPreview();
    if (!basename) { this.fotoHidden = true; return; }

    const lower = basename.toLowerCase();
    const noSpaces = lower.replace(/\s+/g, '');
    const hasExt = /\.(jpe?g)$/i.test(lower);
    const bases = ['/assets/produtos/', '/assets/'];

    const set = new Set<string>();
    for (const b of bases) {
      set.add(b + basename);
      set.add(b + lower);
      set.add(b + noSpaces);

      if (!hasExt) {
        set.add(b + lower + '.jpg');
        set.add(b + lower + '.jpeg');
        set.add(b + noSpaces + '.jpg');
        set.add(b + noSpaces + '.jpeg');
      } else {
        if (lower.endsWith('.jpeg')) {
          set.add(b + lower.replace(/\.jpeg$/, '.jpg'));
          set.add(b + noSpaces.replace(/\.jpeg$/, '.jpg'));
        }
        if (lower.endsWith('.jpg')) {
          set.add(b + lower.replace(/\.jpg$/, '.jpeg'));
          set.add(b + noSpaces.replace(/\.jpg$/, '.jpeg'));
        }
      }
    }

    this.fotoCandidates = Array.from(set.values());
    if (this.fotoCandidates.length) this.fotoSrc = this.fotoCandidates[0];
    else this.fotoHidden = true;
  }
  onFotoError(): void {
    this.fotoIdx++;
    if (this.fotoIdx < this.fotoCandidates.length) this.fotoSrc = this.fotoCandidates[this.fotoIdx];
    else this.fotoHidden = true;
  }

  // === NOVO: util da foto no modal de Detalhe ===
  private resetDetailFoto(): void {
    this.detailFotoCandidates = [];
    this.detailFotoIdx = 0;
    this.detailFotoSrc = '';
    this.detailFotoHidden = false;
  }
  private prepareDetailFoto(nomeBruto: string): void {
    this.resetDetailFoto();

    const basename = this.sanitizeFotoName(nomeBruto || '');
    if (!basename) { this.detailFotoHidden = true; return; }

    const bases = ['/assets/produtos/', '/assets/'];
    const lower = basename.toLowerCase();
    const hasExt = /\.(jpe?g|png|webp)$/i.test(lower);
    const noSpaces = lower.replace(/\s+/g, '');

    const candidates = new Set<string>();
    for (const b of bases) {
      candidates.add(b + basename);
      candidates.add(b + lower);
      candidates.add(b + noSpaces);
      if (!hasExt) {
        for (const ext of ['.jpg', '.jpeg', '.png', '.webp']) {
          candidates.add(b + lower + ext);
          candidates.add(b + noSpaces + ext);
        }
      }
    }

    this.detailFotoCandidates = Array.from(candidates.values());
    if (this.detailFotoCandidates.length) this.detailFotoSrc = this.detailFotoCandidates[0];
    else this.detailFotoHidden = true;
  }
  onDetailFotoError(): void {
    this.detailFotoIdx++;
    if (this.detailFotoIdx < this.detailFotoCandidates.length) {
      this.detailFotoSrc = this.detailFotoCandidates[this.detailFotoIdx];
    } else {
      this.detailFotoHidden = true;
    }
  }

  // modais
  closeLojasDialog(): void { this.lojasDialogOpen = false; }
  confirmLojasDialog(): void { this.lojasDialogOpen = false; }
  clearLojasMarcadas(): void { this.lojasMarcadas = []; }
  openCoresDialog(): void { this.coresDialogOpen = true; }
  closeCoresDialog(): void { this.coresDialogOpen = false; }
  confirmCoresDialog(): void { this.coresDialogOpen = false; }
  clearCoresSelecionadas(): void { this.limparSelecaoCores(); }

  // ======== helpers de erro ========
  private handleFieldErrors(err: any, fallbackMsg: string): void {
    this.errorMsg = fallbackMsg;
    if (err?.error && typeof err.error === 'object') {
      const eobj = err.error;
      const fields: Array<{ field: string; messages: string[] }> = [];
      Object.keys(eobj).forEach(k => {
        const v = eobj[k];
        if (Array.isArray(v)) {
          fields.push({ field: k, messages: v.map(x => String(x)) });
        } else if (typeof v === 'string') {
          fields.push({ field: k, messages: [v] });
        }
      });
      this.fieldErrors = fields;
    }
  }

  // ======== público (usado no template!) ========
  normalizeTipo(p: any): '1' | '2' | '' {
    const t = p?.Tipoproduto ?? p?.tipo ?? p?.Tipo ?? p?.tipo_produto ?? '';
    const s = String(t || '').toUpperCase();
    if (s === '1' || s === 'REV' || s === 'REVENDA') return '1';
    if (s === '2' || s === 'USO' || s === 'USOCONSUMO' || s === 'USO_CONSUMO') return '2';
    return '';
  }

  /* ======================== resets de forms ========================= */
  private resetFormRevenda(): void {
    this.form = {
      colecao: null,
      estacao: null,
      grupo: null,
      subgrupo: null,
      unidade: null,
      classificacao_fiscal: '',
      tabela_preco: null,
      Preco: null,
      grade: null,
      Descricao: '',
      Desc_reduzida: '',
      produto_foto: ''
    };
    this.estacoesDaColecao = [];
    this.subgrupos = [];
    this.referenciaPreview = '';

    this.coresSelecionadas.clear();
    this.corFiltro = '';
    this.tamanhosDaGrade = [];
    this.combinacoes = [];

    this.resetFotoPreview();

    this.batchMsg = '';
    this.batchErrors = [];
    this.productId = null;
  }

  private resetFormUso(): void {
    this.formUso = {
      Descricao: '',
      descricao_longa: '',
      unidade: null,
      classificacao_fiscal: '',
      ativo: true
    };
  }

}
