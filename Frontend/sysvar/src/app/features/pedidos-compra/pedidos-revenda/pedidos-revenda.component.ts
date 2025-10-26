import { Component, OnInit, inject } from '@angular/core';
import {
  UntypedFormArray,
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule,
  FormControl,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom, debounceTime } from 'rxjs';
import { Router } from '@angular/router';

import {
  PedidosCompraService,
  PedidoCompraRow,
  PedidoCompraDetail,
  PedidoItemDetail,
  PedidoParcela,
} from '../../../core/services/pedidos-compra.service';
import { CoresService } from '../../../core/services/cores.service';
import { PackService } from '../../../core/services/pack.service';

type Option = { id: number; nome: string };

@Component({
  selector: 'app-pedidos-revenda',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './pedidos-revenda.component.html',
  styleUrls: ['./pedidos-revenda.component.css'],
})
export class PedidosRevendaComponent implements OnInit {
  private fb = inject(UntypedFormBuilder);
  private http = inject(HttpClient);
  private pedidosSvc = inject(PedidosCompraService);
  private coresSvc = inject(CoresService);
  private packSvc = inject(PackService);
  private router = inject(Router);

  // ======== View state ========
  action: '' | 'novo' | 'consultar' | 'editar' = 'consultar';
  setAction(a: 'novo' | 'consultar' | 'editar') { this.action = a; }

  pedidoId: number | null = null;

  lojasOptions: Option[] = [];
  coresOptions: Option[] = [];
  private corNomeCache = new Map<number, string>();

  // --------- Cabeçalho (NOVO) ----------
  headerFG: UntypedFormGroup = this.fb.group({
    Idfornecedor: [null, Validators.required],
    fornecedor_nome: [''],
    Idloja: [null, Validators.required],
    loja_nome: [''],
    Datapedido: [null],
    Dataentrega: [null],
    tipo_pedido: ['revenda'],
    condicao_pagamento: [null],
    condicao_pagamento_detalhe: [''],
  });

  // --------- Itens (NOVO) ----------
  itensFA: UntypedFormArray = this.fb.array([]);
  get itemGroups(): UntypedFormGroup[] { return this.itensFA.controls as UntypedFormGroup[]; }

  // --------- Filtros (CONSULTA) ----------
  filtrosFG: UntypedFormGroup = this.fb.group({
    status: [''],
    // tipo_pedido é fixo (revenda) na busca
    q_fornecedor: [''],
    fornecedor_nome: [''],
    loja: [''],
    loja_nome: [''],
    emissao_de: [''],
    emissao_ate: [''],
    entrega_de: [''],
    entrega_ate: [''],
    ordering: ['-Datapedido,Idpedidocompra'],
  });

  // --------- Tabela (CONSULTA) ----------
  loading = false;
  rows: PedidoCompraRow[] = [];
  ordering = '-Datapedido,Idpedidocompra';

  // Paginação client-side
  page = 1;
  pageSize = 10;
  pageSizeOptions = [10, 25, 50, 100];

  get totalRows(): number { return this.rows.length; }
  get totalPages(): number {
    const n = Math.ceil((this.totalRows || 0) / (this.pageSize || 1));
    return Math.max(1, n || 1);
  }
  get pageStart(): number { return this.totalRows === 0 ? 0 : (this.page - 1) * this.pageSize + 1; }
  get pageEnd(): number { return Math.min(this.page * this.pageSize, this.totalRows); }
  get rowsPaged(): PedidoCompraRow[] {
    const ini = (this.page - 1) * this.pageSize;
    return this.rows.slice(ini, ini + this.pageSize);
  }
  goFirst() { this.page = 1; }
  goPrev()  { if (this.page > 1) this.page--; }
  goNext()  { if (this.page < this.totalPages) this.page++; }
  goLast()  { this.page = this.totalPages; }

  // ============================ EDIÇÃO ============================
  editingId: number | null = null;
  editHeaderForm = this.fb.group({ Dataentrega: [''] });

  // dados do cabeçalho (read-only)
  editFornecedorNome: string | null = null;
  editLojaNome: string | null = null;
  editStatus: string | null = null;
  editDocumento: string | null = null;
  editDatapedido: string | null = null;

  // forma de pagamento
  fpCodigoAtual: string | null = null;
  fpDetalhe: string | null = null;
  fpCodigoCtrl = new FormControl<string>('');
  fpSelectCtrl = new FormControl<number | null>(null);

  parcelas: PedidoParcela[] = [];

  editForm = this.fb.group({
    itens: this.fb.array([]),
  });
  get editItensFA(): UntypedFormArray { return this.editForm.get('itens') as UntypedFormArray; }
  get editItensControls(): UntypedFormGroup[] { return this.editItensFA.controls as UntypedFormGroup[]; }

  ngOnInit(): void {
    this.headerFG.get('tipo_pedido')?.disable({ emitEvent: false });
    this.loadLojas();

    this.itensFA.valueChanges.pipe(debounceTime(50)).subscribe(() => { /* noop */ });

    this.filtrosFG.get('q_fornecedor')?.valueChanges.pipe(debounceTime(250)).subscribe(() => this.onFiltroFornecedorBlur());
    this.filtrosFG.get('loja')?.valueChanges.pipe(debounceTime(250)).subscribe(() => this.onFiltroLojaBlur());

    this.buscar();
  }

  // ======== Navegação ========
  goHome(): void { this.router.navigateByUrl('/home'); }

  // ======== Carregamentos ========
  private async loadLojas(): Promise<void> {
    try {
      const arr: any = await firstValueFrom(this.pedidosSvc.listLojas());
      this.lojasOptions = (Array.isArray(arr) ? arr : [])
        .map((x: any) => ({ id: Number(x.id ?? x.Idloja ?? x.pk ?? 0), nome: String(x.nome ?? x.nome_loja ?? x.descricao ?? '') }))
        .filter((o: Option) => o.id && o.nome);
    } catch { this.lojasOptions = []; }
  }

  // ======== Cabeçalho: lookups (NOVO) ========
  async onFornecedorBlur(): Promise<void> {
    const id = Number(this.headerFG.get('Idfornecedor')?.value ?? 0);
    if (!id) { this.headerFG.patchValue({ fornecedor_nome: '' }, { emitEvent: false }); return; }
    try {
      const r: any = await firstValueFrom(this.pedidosSvc.getFornecedorById(id));
      const nome = String(r?.Nome_fornecedor ?? r?.nome ?? r?.descricao ?? '');
      this.headerFG.patchValue({ fornecedor_nome: nome }, { emitEvent: false });
    } catch { this.headerFG.patchValue({ fornecedor_nome: '' }, { emitEvent: false }); }
  }

  onLojaChange(): void {
    const id = Number(this.headerFG.get('Idloja')?.value ?? 0);
    const found = this.lojasOptions.find((o: Option) => o.id === id);
    this.headerFG.patchValue({ loja_nome: found?.nome ?? '' }, { emitEvent: false });
  }

  async onFormaBlur(): Promise<void> {
    const cod = (this.headerFG.get('condicao_pagamento')?.value ?? '').toString().trim();
    if (!cod) { this.headerFG.patchValue({ condicao_pagamento_detalhe: '' }, { emitEvent: false }); return; }
    try {
      const p1 = new HttpParams().set('codigo', cod);
      const d1: any = await firstValueFrom(this.http.get('/api/forma-pagamentos/', { params: p1 }));
      let item = (d1?.results ?? d1)?.[0] ?? null;
      if (!item) {
        const p2 = new HttpParams().set('search', cod).set('page_size', 1);
        const d2: any = await firstValueFrom(this.http.get('/api/forma-pagamentos/', { params: p2 }));
        item = (d2?.results ?? d2)?.[0] ?? null;
      }
      const desc = String(item?.descricao ?? item?.nome ?? '');
      this.headerFG.patchValue({ condicao_pagamento_detalhe: desc }, { emitEvent: false });
    } catch { this.headerFG.patchValue({ condicao_pagamento_detalhe: '' }, { emitEvent: false }); }
  }

  // ======== Itens (NOVO) ========
  addItem(): void {
    const g = this.fb.group({
      Idproduto: [null, Validators.required],
      produto_nome: [''],
      Idcor: [null],
      cor_nome: [''],
      pack_id: [null, Validators.required],
      pack_nome: [''],
      pack_qtd_total: [0],
      n_packs: [0, Validators.min(0)],
      preco: [0, Validators.min(0)],
      desconto: [0],
      Qtp_pc: [0],
      total_item: [0],
    });

    g.get('n_packs')?.valueChanges.pipe(debounceTime(50)).subscribe(() => this.recalcLine(g));
    g.get('preco')?.valueChanges.pipe(debounceTime(50)).subscribe(() => this.recalcLine(g));
    g.get('desconto')?.valueChanges.pipe(debounceTime(50)).subscribe(() => this.recalcLine(g));

    this.itensFA.push(g);
  }
  removeItem(idx: number): void { if (idx >= 0 && idx < this.itensFA.length) this.itensFA.removeAt(idx); }

  async onProdutoBlur(g: UntypedFormGroup): Promise<void> {
    const id = Number(g.get('Idproduto')?.value ?? 0);
    if (!id) {
      g.patchValue({ produto_nome: '', Idcor: null, cor_nome: '' }, { emitEvent: false });
      this.coresOptions = [];
      return;
    }
    try {
      const r: any = await firstValueFrom(this.pedidosSvc.getProdutoById(id));
      const nome = String(r?.Descricao ?? r?.descricao ?? r?.nome ?? r?.Nome_produto ?? '');
      g.patchValue({ produto_nome: nome }, { emitEvent: false });
    } catch { g.patchValue({ produto_nome: '' }, { emitEvent: false }); }

    await this.loadCoresForProduto(id);
    g.patchValue({ Idcor: null, cor_nome: '' }, { emitEvent: false });
  }

  private norm(s: string): string {
    return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  }

  private async loadCoresForProduto(idproduto: number): Promise<void> {
    try {
      const det: any = await firstValueFrom(this.pedidosSvc.listProdutoDetalhes(idproduto));
      const detalhes = (det?.results ?? det) ?? [];

      type Grupo = { skuId: number; corId?: number; corNome?: string };
      const grupos = new Map<string, Grupo>();

      for (const row of detalhes) {
        const skuId = Number(row?.Idprodutodetalhe ?? row?.id ?? 0);
        if (!skuId) continue;

        const corIdRaw: any = row?.Idcor ?? row?.cor_id ?? null;
        const corId = Number(corIdRaw);
        let corNome: string =
          (typeof row?.cor === 'string' && row.cor) ||
          (typeof row?.Cor === 'string' && row.Cor) ||
          String(row?.cor_nome ?? row?.nome_cor ?? '');

        const chave = (Number.isFinite(corId) && corId > 0) ? `id:${corId}` : `nm:${this.norm(corNome)}`;

        if (!grupos.has(chave)) {
          grupos.set(chave, { skuId, corId: Number.isFinite(corId) && corId > 0 ? corId : undefined, corNome: corNome || undefined });
        }
      }

      for (const [ch, g] of Array.from(grupos.entries())) {
        if (!g.corNome && g.corId) {
          if (this.corNomeCache.has(g.corId)) {
            g.corNome = this.corNomeCache.get(g.corId)!;
          } else {
            try {
              const c: any = await firstValueFrom(this.coresSvc.get(g.corId));
              const nome = String(c?.Cor ?? c?.Descricao ?? c?.descricao ?? c?.nome ?? '');
              g.corNome = nome;
              this.corNomeCache.set(g.corId, nome);
            } catch { /* noop */ }
          }
          grupos.set(ch, g);
        }
      }

      this.coresOptions = Array.from(grupos.values())
        .map(g => ({ id: g.skuId, nome: g.corNome || `SKU ${g.skuId}` }))
        .filter(o => o.id && o.nome);

    } catch {
      this.coresOptions = [];
    }
  }

  onCorChange(g: UntypedFormGroup): void {
    const skuId = Number(g.get('Idcor')?.value ?? 0);
    const found = this.coresOptions.find((o: Option) => o.id === skuId);
    g.patchValue({ cor_nome: found?.nome ?? '' }, { emitEvent: false });
  }

  async onPackBlur(g: UntypedFormGroup): Promise<void> {
    const id = Number(g.get('pack_id')?.value ?? 0);
    if (!id) { g.patchValue({ pack_nome: '', pack_qtd_total: 0 }, { emitEvent: false }); this.recalcLine(g); return; }
    try {
      const p: any = await firstValueFrom(this.packSvc.retrieve(id));
      const nome = String(p?.descricao ?? p?.nome ?? '');
      const qtdTotal: number = Array.isArray(p?.itens)
        ? p.itens.reduce((acc: number, it: any) => acc + Number(it?.qtd ?? it?.quantidade ?? 0), 0)
        : Number(p?.qtd_total ?? 0);

      g.patchValue({ pack_nome: nome, pack_qtd_total: Number.isFinite(qtdTotal) ? qtdTotal : 0 }, { emitEvent: false });
      this.recalcLine(g);
    } catch {
      g.patchValue({ pack_nome: '', pack_qtd_total: 0 }, { emitEvent: false });
      this.recalcLine(g);
    }
  }

  /** Qtp_pc = n_packs × soma_itens_pack; total = preco × Qtp_pc × (1 - desconto%). */
  private recalcLine(g: UntypedFormGroup): void {
    const nPacks  = Number(g.get('n_packs')?.value ?? 0);
    const preco   = Number(g.get('preco')?.value ?? 0);
    const descPct = Number(g.get('desconto')?.value ?? 0);
    const packQtd = Number(g.get('pack_qtd_total')?.value ?? 0);

    const qtp       = Math.max(0, nPacks * (packQtd || 0));
    const fatorDesc = Math.max(0, Math.min(1, 1 - (isFinite(descPct) ? descPct : 0) / 100));
    const totalCalc = this.round2((preco || 0) * qtp * fatorDesc);

    g.patchValue({ Qtp_pc: qtp, total_item: totalCalc }, { emitEvent: false });
  }
  private round2(n: number): number { return Math.round((n + Number.EPSILON) * 100) / 100; }

  // ======== Persistência (NOVO) ========
  async criarCabecalho(): Promise<void> {
    if (this.headerFG.invalid) return;
    const head = {
      Idfornecedor: Number(this.headerFG.get('Idfornecedor')?.value),
      Idloja: Number(this.headerFG.get('Idloja')?.value),
      Datapedido: this.headerFG.get('Datapedido')?.value ?? null,
      Dataentrega: this.headerFG.get('Dataentrega')?.value ?? null,
      tipo_pedido: 'revenda' as const,
    };
    const created: any = await firstValueFrom(this.pedidosSvc.createHeader(head));
    this.pedidoId = created?.Idpedidocompra ?? null;
  }

  async salvarPedidoCompleto(): Promise<void> {
    if (this.headerFG.invalid) return;

    if (!this.pedidoId) {
      await this.criarCabecalho();
      if (!this.pedidoId) return;
    }

    for (const g of this.itemGroups) {
      const pid   = Number(g.get('Idproduto')?.value ?? 0);
      const pack  = Number(g.get('pack_id')?.value ?? 0);
      const np    = Number(g.get('n_packs')?.value ?? 0);
      const preco = Number(g.get('preco')?.value ?? 0);
      if (!pid || !pack || np <= 0 || preco < 0) return;
    }

    for (const g of this.itemGroups) {
      const dto: any = {
        Idpedidocompra: this.pedidoId!,
        Idproduto: Number(g.get('Idproduto')?.value ?? 0),
        Qtp_pc: Number(g.get('Qtp_pc')?.value ?? 0),
        valorunitario: Number(g.get('preco')?.value ?? 0),
        Desconto: Number(g.get('desconto')?.value ?? 0) || 0,
        Idprodutodetalhe: Number(g.get('Idcor')?.value ?? 0) || null,
        pack: Number(g.get('pack_id')?.value ?? 0) || null,
        n_packs: Number(g.get('n_packs')?.value ?? 0),
      };
      await firstValueFrom(this.pedidosSvc.createItem(dto));
    }

    const cod = (this.headerFG.get('condicao_pagamento')?.value ?? '').toString().trim();
    if (cod) await firstValueFrom(this.pedidosSvc.setFormaPagamento(this.pedidoId, { codigo: cod }));

    alert('Pedido salvo com sucesso!');
    this.resetarTela();
  }

  private resetarTela(): void {
    this.pedidoId = null;
    this.headerFG.reset({
      Idfornecedor: null,
      fornecedor_nome: '',
      Idloja: null,
      loja_nome: '',
      Datapedido: null,
      Dataentrega: null,
      tipo_pedido: 'revenda',
      condicao_pagamento: null,
      condicao_pagamento_detalhe: '',
    }, { emitEvent: false });
    this.headerFG.get('tipo_pedido')?.disable({ emitEvent: false });

    while (this.itensFA.length) this.itensFA.removeAt(0);
    this.coresOptions = [];
  }

  // ============================ CONSULTA ============================

  private setOrdering(campo: string) {
    if (this.ordering.replace('-', '') === campo) {
      this.ordering = this.ordering.startsWith('-') ? campo : `-${campo}`;
    } else {
      this.ordering = campo;
    }
    this.filtrosFG.patchValue({ ordering: this.ordering }, { emitEvent: false });
  }

  setOrdenacao(campo: string) {
    this.setOrdering(campo);
    this.buscar();
  }

  async onFiltroFornecedorBlur() {
    const id = Number(this.filtrosFG.get('q_fornecedor')?.value || 0);
    if (!id) { this.filtrosFG.patchValue({ fornecedor_nome: '' }, { emitEvent: false }); return; }
    try {
      const r: any = await firstValueFrom(this.pedidosSvc.getFornecedorById(id));
      const nome = String(r?.Nome_fornecedor ?? r?.nome ?? r?.descricao ?? '');
      this.filtrosFG.patchValue({ fornecedor_nome: nome }, { emitEvent: false });
    } catch {
      this.filtrosFG.patchValue({ fornecedor_nome: '' }, { emitEvent: false });
    }
  }

  async onFiltroLojaBlur() {
    const id = Number(this.filtrosFG.get('loja')?.value || 0);
    if (!id) { this.filtrosFG.patchValue({ loja_nome: '' }, { emitEvent: false }); return; }
    try {
      const nome = await this.pedidosSvc.getLojaNomeById(id);
      this.filtrosFG.patchValue({ loja_nome: nome || '' }, { emitEvent: false });
    } catch {
      this.filtrosFG.patchValue({ loja_nome: '' }, { emitEvent: false });
    }
  }

  limparFiltros() {
    this.filtrosFG.reset({
      status: '',
      q_fornecedor: '',
      fornecedor_nome: '',
      loja: '',
      loja_nome: '',
      emissao_de: '',
      emissao_ate: '',
      entrega_de: '',
      entrega_ate: '',
      ordering: '-Datapedido,Idpedidocompra',
    }, { emitEvent: false });
    this.ordering = '-Datapedido,Idpedidocompra';
    this.page = 1;
    this.rows = [];
  }

  async buscar() {
    this.loading = true;
    this.page = 1;

    const v = this.filtrosFG.getRawValue();
    const filtro = {
      ordering: v.ordering || this.ordering,
      status: v.status || '',
      fornecedor: v.q_fornecedor ? Number(v.q_fornecedor) : undefined,
      q_fornecedor: v.q_fornecedor || undefined,
      loja: v.loja ? Number(v.loja) : undefined,
      emissao_de: v.emissao_de || undefined,
      emissao_ate: v.emissao_ate || undefined,
      entrega_de: v.entrega_de || undefined,
      entrega_ate: v.entrega_ate || undefined,
      tipo_pedido: 'revenda' as const, // filtro fixo
    };

    try {
      const data = await firstValueFrom(this.pedidosSvc.listar(filtro));
      this.rows = Array.isArray(data) ? data : [];
    } catch {
      this.rows = [];
    } finally {
      this.loading = false;
    }
  }

  // ======== Ações de linha ========
  async aprovarLinha(p: PedidoCompraRow) {
    try {
      await firstValueFrom(this.pedidosSvc.aprovar(p.Idpedidocompra));
      await this.buscar();
    } catch { /* noop */ }
  }
  async cancelarLinha(p: PedidoCompraRow) {
    try {
      await firstValueFrom(this.pedidosSvc.cancelar(p.Idpedidocompra));
      await this.buscar();
    } catch { /* noop */ }
  }
  async reabrirLinha(p: PedidoCompraRow) {
    try {
      await firstValueFrom(this.pedidosSvc.reabrir(p.Idpedidocompra));
      await this.buscar();
    } catch { /* noop */ }
  }
  async editarLinha(p: PedidoCompraRow) {
    // trava: só AB pode editar
    if (p.Status !== 'AB') {
      alert('Somente pedidos em status AB (Aberto) podem ser editados.');
      return;
    }
    await this.carregarPedidoParaEdicao(p.Idpedidocompra);
    this.setAction('editar');
  }

  // ============================ EDIÇÃO helpers ============================
  private makeEditItemGroup(it: PedidoItemDetail): UntypedFormGroup {
    return this.fb.group({
      Idpedidocompraitem: [it.Idpedidocompraitem],
      Idproduto: [it.Idproduto],
      produto_desc: [it.produto_desc || ''],
      Qtp_pc: [it.Qtp_pc],
      valorunitario: [it.valorunitario],
      Desconto: [it.Desconto],
      Total_item: [it.Total_item],
    });
  }

  private recalcEditGroup(g: UntypedFormGroup) {
    const q = Number(g.get('Qtp_pc')?.value || 0);
    const v = Number(g.get('valorunitario')?.value || 0);
    const d = Number(g.get('Desconto')?.value || 0);
    const fator = Math.max(0, Math.min(1, 1 - (isFinite(d) ? d : 0) / 100));
    const tot = this.round2(q * v * fator);
    g.patchValue({ Total_item: tot }, { emitEvent: false });
  }
  recalcEdit(i: number) {
    const g = this.editItensFA.at(i) as UntypedFormGroup;
    if (g) this.recalcEditGroup(g);
  }

  async carregarPedidoParaEdicao(id: number) {
    this.editItensFA.clear();
    this.parcelas = [];
    this.editingId = id;

    const det: PedidoCompraDetail = await firstValueFrom(this.pedidosSvc.getById(id));

    // travas
    if (det.Status !== 'AB') {
      alert('Somente pedidos AB (Aberto) podem ser editados.');
      this.editingId = null;
      this.setAction('consultar');
      return;
    }

    // cabeçalho exibido
    this.editFornecedorNome = det.fornecedor_nome || null;
    this.editLojaNome = det.loja_nome || null;
    this.editStatus = det.Status || null;
    this.editDocumento = det.Documento || null;
    this.editDatapedido = det.Datapedido || null;

    // form header edit
    this.editHeaderForm.patchValue({ Dataentrega: det.Dataentrega || '' }, { emitEvent: false });

    // forma atual
    this.fpCodigoAtual = det.condicao_pagamento || null;
    this.fpDetalhe = det.condicao_pagamento_detalhe || det.condicao_pagamento || null;
    this.fpCodigoCtrl.setValue('', { emitEvent: false });
    this.fpSelectCtrl.setValue(null, { emitEvent: false });

    // parcelas
    this.parcelas = Array.isArray(det.parcelas) ? det.parcelas : [];

    // itens
    (det.itens || []).forEach(it => this.editItensFA.push(this.makeEditItemGroup(it)));
  }

  async aplicarFormaPagamentoEditar() {
    if (!this.editingId) return;

    const codigo = (this.fpCodigoCtrl.value || '').toString().trim();
    const formaId = this.fpSelectCtrl.value;

    if (!codigo && !formaId) return;

    const payload: any = {};
    if (codigo) payload.codigo = codigo;
    if (formaId) payload.Idformapagamento = formaId;

    const det = await firstValueFrom(this.pedidosSvc.setFormaPagamento(this.editingId, payload));
    // atualiza visual
    this.fpCodigoAtual = det?.condicao_pagamento || this.fpCodigoAtual;
    this.fpDetalhe = det?.condicao_pagamento_detalhe || det?.condicao_pagamento || this.fpDetalhe;
    this.parcelas = Array.isArray(det?.parcelas) ? det.parcelas : this.parcelas;
  }

  async salvarEdicao() {
    if (!this.editingId) return;

    // Atualiza header (Dataentrega)
    const de = this.editHeaderForm.get('Dataentrega')?.value ?? null;
    await firstValueFrom(this.pedidosSvc.updateHeader(this.editingId, { Dataentrega: de }));

    // Atualiza itens
    for (const g of this.editItensControls) {
      const idItem = Number(g.get('Idpedidocompraitem')?.value);
      const patch = {
        Qtp_pc: Number(g.get('Qtp_pc')?.value || 0),
        valorunitario: Number(g.get('valorunitario')?.value || 0),
        Desconto: Number(g.get('Desconto')?.value || 0),
      };
      await firstValueFrom(this.pedidosSvc.updateItem(idItem, patch));
    }

    alert('Alterações salvas!');
    await this.buscar();
    this.cancelarEdicao();
  }

  cancelarEdicao() {
    this.editingId = null;
    this.editItensFA.clear();
    this.setAction('consultar');
  }
}
