import { Component, OnInit, HostListener, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray, FormGroup, FormControl } from '@angular/forms';
import {
  PedidosCompraService,
  PedidoCompraFiltro,
  PedidoCompraRow,
  PedidoItemDTO,
  PedidoCompraCreateDTO,
  PedidoCompraDetail,
  PedidoItemDetail
} from '../../../core/services/pedidos-compra.service';
import {
  FormaPagamentosService,
  FormaPagamentoRow
} from '../../../core/services/forma-pagamentos.service';

@Component({
  standalone: true,
  selector: 'app-pedidos',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './pedidos.component.html',
  styleUrls: ['./pedidos.component.css']
})
export class PedidosComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(PedidosCompraService);
  private fpApi = inject(FormaPagamentosService);

  action: '' | 'novo' | 'consultar' | 'editar' = '';

  errorMsg = '';
  successMsg = '';
  infoMsg = '';
  fieldErrors: Array<{ field: string; messages: string[] }> = [];
  awaitKeyAfterSave = false;

  carregando = signal(false);
  ordering = signal<string>('-Datapedido,Idpedidocompra');
  rows = signal<PedidoCompraRow[]>([]);
  total = computed(() => this.rows().length);

  // === Consulta ===
  filtrosForm = this.fb.nonNullable.group({
    status: [''],
    q_fornecedor: [''],
    loja: [''],
    emissao_de: [''],
    emissao_ate: [''],
    entrega_de: [''],
    entrega_ate: [''],
  });

  // === Dados auxiliares ===
  lojas: Array<{ id: number; nome: string }> = [];
  formas: FormaPagamentoRow[] = [];
  fornecedorNome = '';
  lojaNome = '';
  salvando = false;

  // === NOVO ===
  novoForm = this.fb.nonNullable.group({
    Idfornecedor: this.fb.nonNullable.control<number | null>(null, { validators: [Validators.required] }),
    Idloja:       this.fb.nonNullable.control<number | null>(null, { validators: [Validators.required] }),
    Datapedido:   this.fb.nonNullable.control<string>(''),
    Dataentrega:  this.fb.nonNullable.control<string>(''),
    tipo_pedido:  this.fb.nonNullable.control<'revenda' | 'consumo'>('revenda'),
    // Forma de pagamento (um dos dois campos pode ser usado)
    forma_codigo: this.fb.nonNullable.control<string>(''),
    forma_id:     this.fb.nonNullable.control<number | null>(null),
    itens: this.fb.array([]) as FormArray,
  });
  get itensFA(): FormArray { return this.novoForm.controls.itens as FormArray; }

  // === EDIÇÃO ===
  editingId: number | null = null;
  editHeaderForm = this.fb.nonNullable.group({
    Dataentrega: this.fb.nonNullable.control<string>(''),
  });
  editItensFA = this.fb.array([]) as FormArray;
  editForm = this.fb.group({ itens: this.editItensFA });
  get editItensControls(): FormGroup[] { return (this.editItensFA.controls as FormGroup[]); }

  // ---- Forma de Pagamento (edição) ----
  fpCodigoCtrl = new FormControl<string>('', { nonNullable: true });
  fpSelectCtrl = new FormControl<number | null>(null); // substitui ngModel
  fpDetalhe = '';
  fpParcelas: Array<{
    parcela: number;
    prazo_dias: number | null;
    vencimento: string | null;
    valor: number | string;
  }> = [];

  ngOnInit(): void {
    // Lojas
    this.api.listLojas().subscribe({
      next: (res: any[]) => {
        this.lojas = (res || [])
          .map(x => ({ id: x?.Idloja ?? x?.id ?? x?.pk, nome: x?.nome_loja ?? x?.nome ?? '' }))
          .filter(x => x.id && x.nome);
      },
      error: (_err: any) => {}
    });

    // Formas de pagamento (para dropdown)
    this.fpApi.listar({ ordering: 'descricao' }).subscribe({
      next: (rows) => this.formas = rows || [],
      error: (_e) => { /* silencioso */ }
    });

    // Reagir ao fornecedor digitado
    this.novoForm.controls.Idfornecedor.valueChanges.subscribe(v => {
      this.fornecedorNome = '';
      if (v !== null && !Number.isNaN(v)) {
        this.api.getFornecedorById(Number(v)).subscribe({
          next: (f: any) => this.fornecedorNome = f?.Nome_fornecedor || f?.nome || '(sem nome)',
          error: (_err: any) => this.fornecedorNome = 'Fornecedor não encontrado',
        });
      }
    });

    // Nome da loja
    this.novoForm.controls.Idloja.valueChanges.subscribe(v => {
      const found = this.lojas.find(l => l.id === Number(v));
      this.lojaNome = found ? found.nome : '';
    });

    // Inicializa o formulário "Novo" LIMPO
    this.resetNovoForm();
  }

  // Rotina centralizada para limpar o formulário "Novo"
  private resetNovoForm(): void {
    this.novoForm.reset({
      Idfornecedor: null,
      Idloja: null,
      Datapedido: '',
      Dataentrega: '',
      tipo_pedido: 'revenda',
      forma_codigo: '',
      forma_id: null
    });
    this.fornecedorNome = '';
    this.lojaNome = '';

    // limpa itens e cria UMA linha em branco
    while (this.itensFA.length) this.itensFA.removeAt(0);
    this.addItem();

    // estado visual
    this.novoForm.markAsPristine();
    this.novoForm.markAsUntouched();
    this.fieldErrors = [];
    this.errorMsg = '';
    this.successMsg = '';
    this.infoMsg = '';
  }

  setAction(a: '' | 'novo' | 'consultar' | 'editar') {
    this.action = a;
    this.resetMessages();
    if (a === 'consultar') {
      this.buscar();
    }
    if (a === 'novo') {
      this.resetNovoForm();
    }
  }

  cancelarNovo() {
    this.resetNovoForm();
    this.setAction('');
  }

  resetMessages() {
    this.errorMsg = ''; this.successMsg = ''; this.infoMsg = '';
    this.fieldErrors = []; this.awaitKeyAfterSave = false;
  }

  // ===== Consulta =====
  private buildFiltro(): PedidoCompraFiltro {
    const raw = this.filtrosForm.getRawValue();
    const s = (v: string) => (v?.trim() ? v.trim() : undefined);
    const isNum = (txt?: string) => !!txt && /^[0-9]+$/.test(txt.trim());

    const fornecedorTxt = s(raw.q_fornecedor);
    const lojaTxt = s(raw.loja);

    const filtro: PedidoCompraFiltro = {
      ordering: this.ordering(),
      status: s(raw.status),

      fornecedor: isNum(fornecedorTxt) ? Number(fornecedorTxt) : undefined,
      q_fornecedor: !isNum(fornecedorTxt) ? fornecedorTxt : undefined,

      loja: isNum(lojaTxt) ? Number(lojaTxt) : undefined,

      emissao_de: s(raw.emissao_de),
      emissao_ate: s(raw.emissao_ate),
      entrega_de: s(raw.entrega_de),
      entrega_ate: s(raw.entrega_ate),
    };
    return filtro;
  }

  buscar(): void {
    this.carregando.set(true);
    const filtro = this.buildFiltro();
    this.api.listar(filtro).subscribe({
      next: (res) => {
        this.rows.set(this.sortClient(res, this.ordering()));
        this.carregando.set(false);
        if (!res.length) this.infoMsg = 'Nenhum pedido encontrado com os filtros informados.';
      },
      error: (_err: any) => {
        this.errorMsg = 'Falha ao carregar pedidos.';
        this.carregando.set(false);
      }
    });
  }

  limparFiltros(): void {
    this.filtrosForm.reset({
      status: '',
      q_fornecedor: '',
      loja: '',
      emissao_de: '', emissao_ate: '', entrega_de: '', entrega_ate: '',
    });
    this.ordering.set('-Datapedido,Idpedidocompra');
    this.buscar();
  }

  setOrdenacao(campo: string): void {
    const current = this.ordering();
    const first = (current || '').split(',').filter(Boolean)[0] || '';
    let novo = campo;
    if (first === campo) novo = `-${campo}`;
    else if (first === `-${campo}`) novo = campo;
    if (!novo.includes('Idpedidocompra')) novo = `${novo},Idpedidocompra`;
    this.ordering.set(novo);
    this.buscar();
  }

  private sortClient(data: PedidoCompraRow[], ordering: string): PedidoCompraRow[] {
    const keys = (ordering || '').split(',').filter(Boolean);
    if (!keys.length) return data.slice();
    const norm = (v: any) => (v === null || v === undefined) ? '' : v;
    return data.slice().sort((a, b) => {
      for (const kRaw of keys) {
        const desc = kRaw.startsWith('-');
        const k = desc ? kRaw.slice(1) : kRaw;
        let va: any = (a as any)[k], vb: any = (b as any)[k];
        if (k === 'Valorpedido') { va = Number(va); vb = Number(vb); }
        va = norm(va); vb = norm(vb);
        if (va < vb) return desc ? 1 : -1;
        if (va > vb) return desc ? -1 : 1;
      }
      return 0;
    });
  }

  // ===== NOVO =====
  private newItemGroup() {
    return this.fb.nonNullable.group({
      Idproduto: [null as number | null, [Validators.required]],
      produto_nome: [''],
      Qtp_pc: [null as number | null, [Validators.required, Validators.min(0.0001)]],
      valorunitario: [null as number | null, [Validators.required, Validators.min(0)]],
      Desconto: [0 as number | null],
      Idprodutodetalhe: [null as number | null],
      total_item: [0],
    });
  }
  addItem() { this.itensFA.push(this.newItemGroup()); }
  removeItem(ix: number) { this.itensFA.removeAt(ix); }

  onProdutoBlur(ix: number) {
    const g = this.itensFA.at(ix) as any;
    const id = Number(g.get('Idproduto')?.value);
    if (!id) { g.get('produto_nome')?.setValue(''); return; }
    this.api.getProdutoById(id).subscribe({
      next: (p: any) => g.get('produto_nome')?.setValue(p?.Descricao || p?.descricao || '(sem descrição)'),
      error: (_err: any) => g.get('produto_nome')?.setValue('Produto não encontrado'),
    });
  }

  recalcItem(ix: number) {
    const g = this.itensFA.at(ix) as any;
    const q = Number(g.get('Qtp_pc')?.value) || 0;
    const pu = Number(g.get('valorunitario')?.value) || 0;
    const d  = Number(g.get('Desconto')?.value) || 0;
    const t = Math.max(q * pu - d, 0);
    g.get('total_item')?.setValue(t, { emitEvent: false });
  }

  get totalPedido(): number {
    let s = 0;
    for (let i = 0; i < this.itensFA.length; i++) {
      const t = Number((this.itensFA.at(i) as any).get('total_item')?.value) || 0;
      s += t;
    }
    return s;
  }

  // ===== Validações rápidas =====
  get fornecedorValido(): boolean {
    return !!this.novoForm.value.Idfornecedor
      && !!this.fornecedorNome
      && this.fornecedorNome !== 'Fornecedor não encontrado';
  }
  get lojaValida(): boolean {
    const id = Number(this.novoForm.value.Idloja);
    return !!id && this.lojas.some(l => l.id === id);
  }
  private itemProdutoValido(ix: number): boolean {
    const g = this.itensFA.at(ix) as any;
    const nome = g.get('produto_nome')?.value as string | null | undefined;
    const id = g.get('Idproduto')?.value;
    return !!id && !!nome && nome !== 'Produto não encontrado';
  }
  private mapApiError(e: any) {
    const body = e?.error ?? e;
    if (body && typeof body === 'object') {
      this.fieldErrors = Object.entries(body).map(([field, msgs]: any) => ({
        field,
        messages: Array.isArray(msgs) ? msgs : [String(msgs)],
      }));
      this.errorMsg = 'Verifique os campos destacados.';
    } else {
      this.errorMsg = 'Falha ao salvar pedido.';
    }
  }

  async salvarNovo() {
    this.resetMessages();
    if (this.novoForm.invalid) { this.errorMsg = 'Preencha Fornecedor e Loja.'; this.novoForm.markAllAsTouched(); return; }
    if (!this.fornecedorValido) { this.errorMsg = 'Fornecedor inválido.'; return; }
    if (!this.lojaValida) { this.errorMsg = 'Loja inválida.'; return; }
    if (this.itensFA.length === 0) { this.errorMsg = 'Inclua ao menos 1 item.'; return; }
    for (let i = 0; i < this.itensFA.length; i++) {
      const g = this.itensFA.at(i);
      if (g.invalid) { this.errorMsg = `Item ${i + 1} possui campos obrigatórios pendentes.`; return; }
      if (!this.itemProdutoValido(i)) { this.errorMsg = `Item ${i + 1}: produto inválido.`; return; }
    }

    const r = this.novoForm.getRawValue() as any;
    const header: PedidoCompraCreateDTO & { tipo_pedido: 'revenda' | 'consumo' } = {
      Idfornecedor: Number(r.Idfornecedor),
      Idloja: Number(r.Idloja),
      Datapedido: r.Datapedido?.trim() ? r.Datapedido : null,
      Dataentrega: r.Dataentrega?.trim() ? r.Dataentrega : null,
      tipo_pedido: r.tipo_pedido || 'revenda',
    };
    const itens: PedidoItemDTO[] = [];
    for (let i = 0; i < this.itensFA.length; i++) {
      const g = this.itensFA.at(i) as any;
      itens.push({
        Idproduto: Number(g.get('Idproduto')?.value),
        Qtp_pc: Number(g.get('Qtp_pc')?.value),
        valorunitario: Number(g.get('valorunitario')?.value),
        Desconto: g.get('Desconto')?.value != null ? Number(g.get('Desconto')?.value) : 0,
        Idprodutodetalhe: g.get('Idprodutodetalhe')?.value != null ? Number(g.get('Idprodutodetalhe')?.value) : null,
      });
    }

    this.salvando = true;
    try {
      const created = await this.api.createWithItems(header, itens);

      // ——— APLICA FORMA DE PAGAMENTO (se informado no formulário)
      const codigo = (r.forma_codigo || '').trim();
      const formaId = r.forma_id != null ? Number(r.forma_id) : null;

      if (created?.Idpedidocompra && (codigo || formaId)) {
        const payload: any = {};
        if (codigo) payload.codigo = codigo;
        if (!codigo && formaId) payload.Idformapagamento = formaId;

        await this.api.setFormaPagamento(created.Idpedidocompra, payload).toPromise();
      }

      this.successMsg = 'Pedido criado com sucesso.';
      this.setAction('consultar');
      this.buscar();
    } catch (e: any) {
      console.error(e);
      this.mapApiError(e);
    } finally {
      this.salvando = false;
    }
  }

  // ===== Ações na lista =====
  aprovarLinha(row: PedidoCompraRow) {
    this.resetMessages();
    if (!row?.Idpedidocompra) return;
    this.api.aprovar(row.Idpedidocompra).subscribe({
      next: () => { this.successMsg = `Pedido #${row.Idpedidocompra} aprovado.`; this.buscar(); },
      error: (_err: any) => { this.errorMsg = 'Não foi possível aprovar este pedido.'; }
    });
  }

  cancelarLinha(row: PedidoCompraRow) {
    this.resetMessages();
    if (!row?.Idpedidocompra) return;
    this.api.cancelar(row.Idpedidocompra).subscribe({
      next: () => { this.successMsg = `Pedido #${row.Idpedidocompra} cancelado.`; this.buscar(); },
      error: (_err: any) => { this.errorMsg = 'Não foi possível cancelar este pedido.'; }
    });
  }

  reabrirLinha(row: PedidoCompraRow) {
    this.resetMessages();
    if (!row?.Idpedidocompra) return;
    this.api.reabrir(row.Idpedidocompra).subscribe({
      next: () => { this.successMsg = `Pedido #${row.Idpedidocompra} reaberto.`; this.buscar(); },
      error: (_err: any) => { this.errorMsg = 'Não foi possível reabrir este pedido.'; }
    });
  }

  editarLinha(row: PedidoCompraRow) {
    this.resetMessages();
    if (row.Status !== 'AB') { this.errorMsg = 'Somente pedidos AB podem ser editados.'; return; }
    this.editingId = row.Idpedidocompra;
    this.editHeaderForm.reset({ Dataentrega: row.Dataentrega || '' });

    this.api.getById(row.Idpedidocompra).subscribe({
      next: (det: PedidoCompraDetail) => {
        // Itens
        while (this.editItensFA.length) this.editItensFA.removeAt(0);
        (det.itens || []).forEach((it: PedidoItemDetail) => {
          this.editItensFA.push(
            this.fb.nonNullable.group({
              _id: [it.Idpedidocompraitem],
              Idproduto: [{ value: it.Idproduto, disabled: true }],
              produto_desc: [{ value: it.produto_desc ?? '', disabled: true }],
              Qtp_pc: [it.Qtp_pc, [Validators.required, Validators.min(0.0001)]],
              valorunitario: [it.valorunitario, [Validators.required, Validators.min(0)]],
              Desconto: [it.Desconto ?? 0],
              Total_item: [{ value: it.Total_item, disabled: true }],
            }) as any
          );
        });

        // Forma de pagamento (estado visual)
        this.fpCodigoCtrl.setValue(det.condicao_pagamento || '');
        this.fpDetalhe = det.condicao_pagamento_detalhe || '';
        this.fpParcelas = (det.parcelas || []).map(p => ({
          parcela: p.parcela,
          prazo_dias: p.prazo_dias,
          vencimento: p.vencimento,
          valor: p.valor
        }));

        this.action = 'editar';
      },
      error: (_err: any) => { this.errorMsg = 'Falha ao carregar itens para edição.'; }
    });
  }

  recalcEdit(ix: number) {
    const g = this.editItensFA.at(ix) as any;
    const q = Number(g.get('Qtp_pc')?.value) || 0;
    const pu = Number(g.get('valorunitario')?.value) || 0;
    const d  = Number(g.get('Desconto')?.value) || 0;
    const t = Math.max(q * pu - d, 0);
    g.get('Total_item')?.setValue(t);
  }

  // Aplica forma de pagamento durante a edição e atualiza parcelas na tela
  aplicarFormaPagamentoEditar() {
    if (!this.editingId) return;
    const codigo = (this.fpCodigoCtrl.value || '').trim();
    const selId = this.fpSelectCtrl.value != null ? Number(this.fpSelectCtrl.value) : null;

    const payload: any = {};
    if (codigo) payload.codigo = codigo;
    else if (selId) payload.Idformapagamento = selId;
    else { this.errorMsg = 'Informe o código ou selecione uma forma.'; return; }

    this.api.setFormaPagamento(this.editingId, payload).subscribe({
      next: (det: PedidoCompraDetail) => {
        this.successMsg = 'Forma de pagamento aplicada.';
        this.fpCodigoCtrl.setValue(det.condicao_pagamento || '');
        this.fpDetalhe = det.condicao_pagamento_detalhe || '';
        this.fpParcelas = (det.parcelas || []).map(p => ({
          parcela: p.parcela,
          prazo_dias: p.prazo_dias,
          vencimento: p.vencimento,
          valor: p.valor
        }));
      },
      error: (_e) => {
        this.errorMsg = 'Não foi possível aplicar a forma de pagamento.';
      }
    });
  }

  salvarEdicao() {
    this.resetMessages();
    if (!this.editingId) { this.errorMsg = 'Nenhum pedido selecionado.'; return; }

    for (let i = 0; i < this.editItensFA.length; i++) {
      const g = this.editItensFA.at(i) as FormGroup;
      if (g.invalid) { this.errorMsg = `Item ${i + 1} com dados inválidos.`; return; }
    }

    const headerDto: any = {};
    const dataEntrega = this.editHeaderForm.value.Dataentrega?.trim();
    headerDto.Dataentrega = dataEntrega ? dataEntrega : null;

    const calls: Promise<any>[] = [];
    calls.push(this.api.updateHeader(this.editingId, headerDto).toPromise());

    for (let i = 0; i < this.editItensFA.length; i++) {
      const g = this.editItensFA.at(i) as any;
      const itemId = Number(g.get('_id')?.value);
      const dto = {
        Qtp_pc: Number(g.get('Qtp_pc')?.value),
        valorunitario: Number(g.get('valorunitario')?.value),
        Desconto: g.get('Desconto')?.value != null ? Number(g.get('Desconto')?.value) : 0,
      };
      calls.push(this.api.updateItem(itemId, dto).toPromise());
    }

    Promise.all(calls).then(() => {
      this.successMsg = `Pedido #${this.editingId} atualizado.`;
      this.setAction('consultar');
      this.buscar();
    }).catch((_err: any) => {
      this.errorMsg = 'Falha ao salvar alterações.';
    });
  }

  cancelarEdicao() {
    this.editingId = null;
    this.setAction('consultar');
  }

  @HostListener('window:keydown', ['$event'])
  onAnyKey(_e: KeyboardEvent) {
    if (this.awaitKeyAfterSave) {
      this.awaitKeyAfterSave = false;
      this.setAction('consultar');
    }
  }
}
