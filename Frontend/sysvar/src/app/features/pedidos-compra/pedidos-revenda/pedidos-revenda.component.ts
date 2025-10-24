import { Component, OnInit, inject } from '@angular/core';
import {
  UntypedFormArray,
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom, debounceTime } from 'rxjs';
import { Router } from '@angular/router';

import { PedidosCompraService } from '../../../core/services/pedidos-compra.service';
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

  pedidoId: number | null = null;

  lojasOptions: Option[] = [];
  coresOptions: Option[] = [];
  private corNomeCache = new Map<number, string>();

  // --------- Cabeçalho ----------
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

  // --------- Itens ----------
  itensFA: UntypedFormArray = this.fb.array([]);
  get itemGroups(): UntypedFormGroup[] { return this.itensFA.controls as UntypedFormGroup[]; }

  ngOnInit(): void {
    this.headerFG.get('tipo_pedido')?.disable({ emitEvent: false });
    this.loadLojas();
    this.itensFA.valueChanges.pipe(debounceTime(50)).subscribe(() => {});
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

  // ======== Cabeçalho: lookups ========
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

  // ======== Itens ========
  addItem(): void {
    const g = this.fb.group({
      Idproduto: [null, Validators.required],
      produto_nome: [''],

      /** value = Id do SKU (ProdutoDetalhe) representativo da cor escolhida */
      Idcor: [null],
      cor_nome: [''],

      pack_id: [null, Validators.required],
      pack_nome: [''],
      pack_qtd_total: [0],

      n_packs: [0, Validators.min(0)],
      preco: [0, Validators.min(0)],
      desconto: [0], // %

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

        let chave: string;
        if (Number.isFinite(corId) && corId > 0) {
          chave = `id:${corId}`;
        } else {
          chave = `nm:${this.norm(corNome)}`;
        }

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
            } catch { /* keep */ }
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

  // ======== Persistência ========
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

    // ===== Reset e mensagem =====
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
    // mantém o "travado"
    this.headerFG.get('tipo_pedido')?.disable({ emitEvent: false });

    // limpa itens
    while (this.itensFA.length) this.itensFA.removeAt(0);
    this.coresOptions = [];
  }
}
