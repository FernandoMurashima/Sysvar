import { Component, EventEmitter, Input, Output, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProdutoLookupService } from '../../../core/services/produto-lookup.service';
import { ProdutoBasic } from '../../../core/models/produto-basic.model';

@Component({
  selector: 'app-produto-lookup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './produto-lookup.component.html',
  styleUrls: ['./produto-lookup.component.css']
})
export class ProdutoLookupComponent implements OnInit {
  /** Se false, o campo interno some e o pai chama buscarComReferencia(...) */
  @Input() usarCampoInterno = true;
  @Input() referenciaInicial?: string;

  @Output() selecionado = new EventEmitter<ProdutoBasic>();
  @Output() verVariacoes = new EventEmitter<ProdutoBasic>();

  procura = '';
  carregando = signal(false);
  erroMsg = signal<string | null>(null);
  resultado = signal<ProdutoBasic | null>(null);
  buscou = signal(false);

  temResultado = computed(() => !!this.resultado());

  constructor(private lookup: ProdutoLookupService) {}

  ngOnInit(): void {
    if (this.referenciaInicial) {
      this.procura = this.referenciaInicial;
      this.buscar();
    }
  }

  /** Modo 2: pai chama diretamente */
  public buscarComReferencia(ref: string) {
    this.procura = (ref || '').trim();
    this.buscar();
  }

  onKeyEnter() {
    this.buscar();
  }

  buscar() {
    this.buscou.set(true);
    this.erroMsg.set(null);
    this.resultado.set(null);

    const ref = (this.procura || '').trim();
    if (!ref) {
      this.erroMsg.set('Informe a referência.');
      return;
    }

    this.carregando.set(true);
    this.lookup.getByReferencia(ref).subscribe({
      next: (prod) => {
        this.resultado.set(prod);
        this.carregando.set(false);
        if (prod) this.selecionado.emit(prod);
      },
      error: (err) => {
        this.carregando.set(false);
        this.erroMsg.set(this.normalizaErro(err));
      }
    });
  }

  abrirVariacoes() {
    const prod = this.resultado();
    if (prod) this.verVariacoes.emit(prod);
  }

  private normalizaErro(err: any): string {
    // Evita exibir HTML de 404 do Django no template
    if (typeof err?.error === 'string' && err.error.startsWith('<!DOCTYPE')) {
      return 'Recurso não encontrado (404).';
    }
    if (err?.status === 404) return 'Produto não encontrado (404).';
    if (err?.error?.detail) return String(err.error.detail);
    if (typeof err?.error === 'string') return err.error.slice(0, 500);
    if (err?.message) return err.message;
    return 'Falha na busca. Verifique a referência e tente novamente.';
  }
}
