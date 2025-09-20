import { Component, OnInit, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { PdvService } from '../../core/services/pdv.service';
import { LojasService } from '../../core/services/lojas.service';

type ProdutoBusca = {
  CodigodeBarra: string;
  Descricao: string;
  preco_atual?: number;
  Preco?: number;
  Codigoproduto?: number;
};

type ItemVenda = {
  ean: string;
  descricao: string;
  preco: number;
  quantidade: number;
  subtotal: number;
  codigoproduto?: number;
};

@Component({
  selector: 'app-pdv',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pdv.component.html',
  styleUrls: ['./pdv.component.css']
})
export class PdvComponent implements OnInit {
  // Loja selecionada
  lojas: Array<{ Idloja: number; nome_loja: string }> = [];
  lojaId: number | null = null;

  // Caixa / operador (se quiser integrar depois)
  operador: string = '';

  // Inputs
  eanInput = '';
  buscaInput = '';
  resultados: ProdutoBusca[] = [];

  // Carrinho
  itens: ItemVenda[] = [];

  // Pagamento simples
  formaPagamento: 'dinheiro' | 'cartao' | 'pix' = 'dinheiro';
  valorPago: number | null = null;
  troco: number = 0;

  // Mensagens
  errorMsg = '';
  successMsg = '';
  infoMsg = '';

  // Fluxo de “pressione qualquer tecla para continuar” após finalizar
  awaitKeyAfterFinish = false;

  @ViewChild('eanBox') eanBox!: ElementRef<HTMLInputElement>;

  constructor(
    private pdvApi: PdvService,
    private lojasApi: LojasService,
  ) {}

  ngOnInit(): void {
    this.lojasApi.list().subscribe({
      next: (data: any) => {
        this.lojas = Array.isArray(data) ? data : (data?.results ?? []);
        // se tiver só uma, seleciona
        if (this.lojas.length === 1) this.lojaId = this.lojas[0].Idloja;
      }
    });
  }

  ngAfterViewInit(): void {
    this.focusEan();
  }

  private focusEan(): void {
    setTimeout(() => this.eanBox?.nativeElement?.focus(), 0);
  }

  clearMsgs(): void {
    this.errorMsg = '';
    this.successMsg = '';
    this.infoMsg = '';
  }

  /* ===== Busca / Adição ===== */

  addByEan(): void {
    this.clearMsgs();
    const ean = (this.eanInput || '').trim();
    if (!ean) return;

    if (!this.lojaId) {
      this.errorMsg = 'Selecione a loja antes de ler EAN.';
      return;
    }

    this.pdvApi.buscarPorEan(ean, this.lojaId).subscribe({
      next: (p) => {
        const prod = this.adaptProduto(p);
        if (!prod) {
          this.errorMsg = 'Produto não encontrado para o EAN informado.';
          return;
        }
        this.addItem(prod);
        this.eanInput = '';
        this.focusEan();
      },
      error: () => {
        this.errorMsg = 'Falha ao buscar produto pelo EAN.';
      }
    });
  }

  buscarPorDescricao(): void {
    this.clearMsgs();
    const q = (this.buscaInput || '').trim();
    if (!q) return;

    this.pdvApi.buscar(q, this.lojaId ?? undefined).subscribe({
      next: (res: any) => {
        const arr = Array.isArray(res) ? res : (res?.results ?? []);
        this.resultados = arr.map((x: any) => this.adaptProduto(x)).filter(Boolean) as ProdutoBusca[];
        if (!this.resultados.length) this.infoMsg = 'Nenhum produto encontrado.';
      },
      error: () => this.errorMsg = 'Falha na busca.'
    });
  }

  private adaptProduto(x: any): ProdutoBusca | null {
    if (!x) return null;
    const preco = x?.preco_atual ?? x?.Preco ?? 0;
    return {
      CodigodeBarra: x.CodigodeBarra || x.ean13 || x.ean || '',
      Descricao: x.Descricao || x.descricao || '',
      preco_atual: preco,
      Preco: preco,
      Codigoproduto: x.Codigoproduto || x.codigoproduto || x.Idproduto || x.id
    };
  }

  addFromResultado(p: ProdutoBusca): void {
    this.addItem(p);
  }

  private addItem(p: ProdutoBusca): void {
    if (!p.CodigodeBarra) { this.errorMsg = 'Produto sem EAN válido.'; return; }
    const preco = Number(p.preco_atual ?? p.Preco ?? 0) || 0;
    // se já existe no carrinho, incrementa
    const idx = this.itens.findIndex(i => i.ean === p.CodigodeBarra);
    if (idx >= 0) {
      this.itens[idx].quantidade += 1;
      this.recalcularItem(idx);
      return;
    }
    this.itens.push({
      ean: p.CodigodeBarra,
      descricao: p.Descricao,
      preco,
      quantidade: 1,
      subtotal: preco * 1,
      codigoproduto: p.Codigoproduto
    });
  }

  /* ===== Edição dos itens ===== */

  setQty(i: number, q: number): void {
    if (q <= 0 || !isFinite(q)) q = 1;
    this.itens[i].quantidade = q;
    this.recalcularItem(i);
  }

  setPreco(i: number, v: number): void {
    if (v < 0 || !isFinite(v)) v = 0;
    this.itens[i].preco = v;
    this.recalcularItem(i);
  }

  remover(i: number): void {
    this.itens.splice(i, 1);
  }

  private recalcularItem(i: number): void {
    const it = this.itens[i];
    it.subtotal = Number((it.preco * it.quantidade).toFixed(2));
  }

  /* ===== Totais ===== */

  get total(): number {
    return Number(this.itens.reduce((acc, it) => acc + it.subtotal, 0).toFixed(2));
  }

  calcTroco(): void {
    const pago = Number(this.valorPago ?? 0);
    this.troco = pago > this.total ? Number((pago - this.total).toFixed(2)) : 0;
  }

  /* ===== Finalização ===== */

  finalizar(): void {
    this.clearMsgs();
    if (!this.lojaId) { this.errorMsg = 'Selecione a loja.'; return; }
    if (!this.itens.length) { this.errorMsg = 'Carrinho vazio.'; return; }
    if (this.valorPago == null || this.valorPago < this.total) {
      this.errorMsg = 'Valor pago insuficiente.';
      return;
    }

    const payload = {
      loja_id: this.lojaId,
      operador: this.operador || null,
      forma_pagamento: this.formaPagamento,
      valor_pago: this.valorPago,
      itens: this.itens.map(it => ({
        ean: it.ean,
        codigoproduto: it.codigoproduto ?? null,
        quantidade: it.quantidade,
        preco: it.preco,
        subtotal: it.subtotal
      })),
      total: this.total
    };

    this.pdvApi.finalizarVenda(payload).subscribe({
      next: (res) => {
        this.successMsg = `Venda concluída. Nº: ${res?.numero || res?.id || '—'}. Pressione qualquer tecla para iniciar nova venda.`;
        this.awaitKeyAfterFinish = true;
      },
      error: () => this.errorMsg = 'Falha ao finalizar a venda.'
    });
  }

  cancelarVenda(): void {
    this.itens = [];
    this.valorPago = null;
    this.troco = 0;
    this.clearMsgs();
    this.focusEan();
  }

  novaVenda(): void {
    this.awaitKeyAfterFinish = false;
    this.itens = [];
    this.valorPago = null;
    this.troco = 0;
    this.successMsg = '';
    this.infoMsg = '';
    this.errorMsg = '';
    // mantém a loja selecionada e o operador
    this.focusEan();
  }

  // atalhos
  @HostListener('document:keydown', ['$event'])
  onKey(ev: KeyboardEvent): void {
    if (this.awaitKeyAfterFinish) {
      this.novaVenda();
      return;
    }
    // F2 = finalizar
    if (ev.key === 'F2') {
      ev.preventDefault();
      this.finalizar();
      return;
    }
    // F4 = cancelar venda
    if (ev.key === 'F4') {
      ev.preventDefault();
      this.cancelarVenda();
      return;
    }
  }
}
