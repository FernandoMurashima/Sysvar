import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PedidosCompraService } from '../../../core/services/pedidos-compra.service';
import { PedidoCompraRow, PedidoCompraFiltro } from '../../../core/models/pedido-compra';

@Component({
  standalone: true,
  selector: 'app-pedidos-compra-list',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './pedidos-compra-list.component.html',
  styleUrls: ['./pedidos-compra-list.component.css']
})
export class PedidosCompraListComponent implements OnInit {
  private service = inject(PedidosCompraService);
  private fb = inject(FormBuilder);

  carregando = signal(false);
  erro = signal<string | null>(null);

  ordering = signal<string>('-Datapedido,Idpedidocompra');

  rows = signal<PedidoCompraRow[]>([]);
  total = computed(() => this.rows().length);

  // Controles não-nulos (evita string|null)
  form = this.fb.nonNullable.group({
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

  ngOnInit(): void {
    this.buscar();
  }

  private buildFiltro(): PedidoCompraFiltro {
    const raw = this.form.getRawValue();

    // helper: string "" -> undefined; caso contrário mantém string
    const s = (v: string) => (v?.trim() ? v.trim() : undefined);
    // helper: string num -> number; vazio -> undefined
    const n = (v: string) => (v?.trim() ? Number(v) : undefined);

    const filtro: PedidoCompraFiltro = {
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

    return filtro;
  }

  buscar(): void {
    this.carregando.set(true);
    this.erro.set(null);
    const filtro = this.buildFiltro();

    this.service.listar(filtro).subscribe({
      next: (res) => {
        // Ordena client-side só para refletir (server já ordena)
        this.rows.set(this.sortClient(res, this.ordering()));
        this.carregando.set(false);
      },
      error: (err) => {
        console.error(err);
        this.erro.set('Falha ao carregar pedidos.');
        this.carregando.set(false);
      }
    });
  }

  limpar(): void {
    this.form.reset({
      status: '',
      fornecedor: '',
      q_fornecedor: '',
      loja: '',
      doc: '',
      emissao_de: '',
      emissao_ate: '',
      entrega_de: '',
      entrega_ate: '',
      total_min: '',
      total_max: '',
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

  // Ordenação client-side simples (apoio visual)
  private sortClient(data: PedidoCompraRow[], ordering: string): PedidoCompraRow[] {
    const keys = (ordering || '').split(',').filter(Boolean);
    if (!keys.length) return data.slice();

    const val = (obj: any, k: string) => obj?.[k];
    const normalize = (v: any) => (v === null || v === undefined) ? '' : v;

    return data.slice().sort((a, b) => {
      for (const kRaw of keys) {
        const desc = kRaw.startsWith('-');
        const k = desc ? kRaw.slice(1) : kRaw;
        let va: any = val(a, k);
        let vb: any = val(b, k);
        if (k === 'Valorpedido') { va = Number(va); vb = Number(vb); }
        va = normalize(va); vb = normalize(vb);
        if (va < vb) return desc ? 1 : -1;
        if (va > vb) return desc ? -1 : 1;
      }
      return 0;
    });
  }
}
