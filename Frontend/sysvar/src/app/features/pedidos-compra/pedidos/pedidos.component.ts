import { Component, OnInit, HostListener, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray, AbstractControl } from '@angular/forms';
import { PedidosCompraService, PedidoCompraFiltro, PedidoCompraRow, PedidoItemDTO, PedidoCompraCreateDTO } from '../../../core/services/pedidos-compra.service';

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

  action: '' | 'novo' | 'consultar' = '';

  errorMsg = '';
  successMsg = '';
  infoMsg = '';
  fieldErrors: Array<{ field: string; messages: string[] }> = [];
  awaitKeyAfterSave = false;

  // ===== CONSULTAR =====
  carregando = signal(false);
  ordering = signal<string>('-Datapedido,Idpedidocompra');
  rows = signal<PedidoCompraRow[]>([]);
  total = computed(() => this.rows().length);

  filtrosForm = this.fb.nonNullable.group({
    status: [''],
    fornecedor: [''],
    q_fornecedor: [''],
    loja: [''],
    doc: [''],
    emissao_de: [''],
    emissao_ate: [''],
    entrega_de: [''],
    entrega_ate: [''],
    total_min: [''],
    total_max: [''],
  });

  // ===== NOVO =====
  lojas: Array<{ id: number; nome: string }> = [];
  fornecedorNome = '';
  lojaNome = '';
  salvando = false;

  novoForm = this.fb.nonNullable.group({
    Idfornecedor: this.fb.nonNullable.control<number | null>(null, { validators: [Validators.required] }),
    Idloja:       this.fb.nonNullable.control<number | null>(null, { validators: [Validators.required] }),
    Datapedido:   this.fb.nonNullable.control<string>(''),
    Dataentrega:  this.fb.nonNullable.control<string>(''),
    itens: this.fb.array([]) as FormArray, // FormArray de FormGroup(item)
  });

  get itensFA(): FormArray {
    return this.novoForm.controls.itens as FormArray;
  }

  ngOnInit(): void {
    // Carregar lojas para o combo
    this.api.listLojas().subscribe({
      next: (res: any[]) => {
        this.lojas = (res || [])
          .map(x => ({ id: x?.Idloja ?? x?.id ?? x?.pk, nome: x?.nome_loja ?? x?.nome ?? '' }))
          .filter(x => x.id && x.nome);
      }
    });

    // Fornecedor: ao digitar ID, mostra nome
    this.novoForm.controls.Idfornecedor.valueChanges.subscribe(v => {
      this.fornecedorNome = '';
      if (v !== null && !Number.isNaN(v)) {
        this.api.getFornecedorById(Number(v)).subscribe({
          next: (f: any) => this.fornecedorNome = f?.Nome_fornecedor || f?.nome || '(sem nome)',
          error: () => this.fornecedorNome = 'Fornecedor não encontrado',
        });
      }
    });

    // Loja: setar nome ao escolher no combo (opcional)
    this.novoForm.controls.Idloja.valueChanges.subscribe(v => {
      const found = this.lojas.find(l => l.id === Number(v));
      this.lojaNome = found ? found.nome : '';
    });

    // Inicia com uma linha de item
    this.addItem();
  }

  // ===== UI =====
  setAction(a: '' | 'novo' | 'consultar') {
    this.action = a;
    this.resetMessages();
    if (a === 'consultar') this.buscar();
  }

  resetMessages() {
    this.errorMsg = '';
    this.successMsg = '';
    this.infoMsg = '';
    this.fieldErrors = [];
    this.awaitKeyAfterSave = false;
  }

  // ===== CONSULTAR =====
  private buildFiltro(): PedidoCompraFiltro {
    const raw = this.filtrosForm.getRawValue();
    const s = (v: string) => (v?.trim() ? v.trim() : undefined);
    const n = (v: string) => (v?.trim() ? Number(v) : undefined);
    return {
      ordering: this.ordering(),
      status: s(raw.status),
      fornecedor: n(raw.fornecedor),
      q_fornecedor: s(raw.q_fornecedor),
      loja: n(raw.loja),
      doc: s(raw.doc),
      emissao_de: s(raw.emissao_de),
      emissao_ate: s(raw.emissao_ate),
      entrega_de: s(raw.entrega_de),
      entrega_ate: s(raw.entrega_ate),
      total_min: n(raw.total_min),
      total_max: n(raw.total_max),
    };
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
      error: () => {
        this.errorMsg = 'Falha ao carregar pedidos.';
        this.carregando.set(false);
      }
    });
  }

  limparFiltros(): void {
    this.filtrosForm.reset({
      status: '', fornecedor: '', q_fornecedor: '', loja: '', doc: '',
      emissao_de: '', emissao_ate: '', entrega_de: '', entrega_ate: '',
      total_min: '', total_max: '',
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

  // ===== ITENS (FormArray) =====
  private newItemGroup() {
    return this.fb.nonNullable.group({
      Idproduto: [null as number | null, [Validators.required]],
      produto_nome: [''],
      Qtp_pc: [null as number | null, [Validators.required, Validators.min(0.0001)]],
      valorunitario: [null as number | null, [Validators.required, Validators.min(0)]],
      Desconto: [0 as number | null],
      Idprodutodetalhe: [null as number | null],
      total_item: [0], // calculado client-side
    });
  }

  addItem() {
    this.itensFA.push(this.newItemGroup());
  }

  removeItem(ix: number) {
    this.itensFA.removeAt(ix);
  }

  onProdutoBlur(ix: number) {
    const g = this.itensFA.at(ix) as any;
    const id = Number(g.get('Idproduto')?.value);
    if (!id) { g.get('produto_nome')?.setValue(''); return; }
    this.api.getProdutoById(id).subscribe({
      next: (p: any) => g.get('produto_nome')?.setValue(p?.Descricao || p?.descricao || '(sem descrição)'),
      error: () => g.get('produto_nome')?.setValue('Produto não encontrado'),
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

  // ===== SALVAR =====
  async salvarNovo() {
    this.resetMessages();

    if (this.novoForm.invalid) {
      this.errorMsg = 'Preencha Fornecedor e Loja.';
      this.novoForm.markAllAsTouched();
      return;
    }
    if (this.itensFA.length === 0) {
      this.errorMsg = 'Inclua ao menos 1 item.';
      return;
    }
    for (let i = 0; i < this.itensFA.length; i++) {
      const g = this.itensFA.at(i);
      if (g.invalid) {
        this.errorMsg = `Item ${i + 1} possui campos obrigatórios pendentes.`;
        return;
      }
    }

    const r = this.novoForm.getRawValue();
    const header: PedidoCompraCreateDTO = {
      Idfornecedor: Number(r.Idfornecedor),
      Idloja: Number(r.Idloja),
      Datapedido: r.Datapedido?.trim() ? r.Datapedido : null,
      Dataentrega: r.Dataentrega?.trim() ? r.Dataentrega : null,
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
      await this.api.createWithItems(header, itens);
      this.successMsg = 'Pedido criado com sucesso.';
      this.awaitKeyAfterSave = true;
    } catch (e) {
      console.error(e);
      this.errorMsg = 'Falha ao salvar pedido.';
    } finally {
      this.salvando = false;
    }
  }

  @HostListener('window:keydown', ['$event'])
  onAnyKey(_e: KeyboardEvent) {
    if (this.awaitKeyAfterSave) {
      this.awaitKeyAfterSave = false;
      this.setAction('consultar');
    }
  }
}
