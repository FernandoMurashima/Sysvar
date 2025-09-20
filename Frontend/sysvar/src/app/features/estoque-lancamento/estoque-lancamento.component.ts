import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, FormArray, FormGroup } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { EstoquesService } from '../../core/services/estoques.service';
import { ProdutosBuscaService } from '../../core/services/produtos-busca.service';
// assumindo que seu LojasService já existe e tem list()
import { LojasService } from '../../core/services/lojas.service';

@Component({
  selector: 'app-estoque-lancamento',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './estoque-lancamento.component.html',
  styleUrls: ['./estoque-lancamento.component.css']
})
export class EstoqueLancamentoComponent implements OnInit {
  private fb = inject(FormBuilder);
  private estSvc = inject(EstoquesService);
  private prodBusca = inject(ProdutosBuscaService);
  private lojasSvc = inject(LojasService);

  lojas: any[] = [];
  resultados: any[] = [];
  loading = signal(false);
  sucesso = signal<string | null>(null);
  erro = signal<string | null>(null);

  form = this.fb.group({
    loja: [null, Validators.required],
    busca: [''],
    itens: this.fb.array([]) // FormArray<FormGroup>
  });

  get itens(): FormArray<FormGroup> {
    return this.form.get('itens') as FormArray<FormGroup>;
  }
  getItemGroup(i: number): FormGroup {
    return this.itens.at(i) as FormGroup;
  }

  ngOnInit(): void {
    this.lojasSvc.list().subscribe({
      next: (data: any[]) => (this.lojas = data),
      error: () => this.erro.set('Falha ao carregar lojas')
    });
  }

  adicionarItem(rs: any): void {
    if (!rs) return;
    const ean = rs.CodigodeBarra || rs.codigodebarra || rs.ean;
    if (!ean) return;

    const exists = this.itens.controls.some(c => (c.value as any).ean === ean);
    if (exists) return;

    this.itens.push(
      this.fb.group({
        ean: [ean, Validators.required],
        codigoproduto: [rs.Codigoproduto || rs.codigoproduto || '00.00.00000', Validators.required],
        descricao: [rs.Descricao || rs.descricao || ''],
        qtd: [1, [Validators.required, Validators.min(1)]]
      })
    );
  }

  removerItem(idx: number): void {
    this.itens.removeAt(idx);
  }

  buscar(): void {
    const termo = (this.form.value.busca || '').toString().trim();
    if (!termo) {
      this.resultados = [];
      return;
    }

    this.loading.set(true);
    forkJoin([
      this.prodBusca.searchDetalhes({ CodigodeBarra: termo }),
      this.prodBusca.searchProdutos({ search: termo })
    ]).subscribe({
      next: ([detalhes, produtos]) => {
        const list: any[] = [];
        if (Array.isArray(detalhes)) list.push(...detalhes);
        if (Array.isArray(produtos)) list.push(...produtos);
        this.resultados = list.slice(0, 50);
      },
      error: () => this.erro.set('Falha na busca'),
      complete: () => this.loading.set(false)
    });
  }

  lancar(): void {
    this.sucesso.set(null);
    this.erro.set(null);

    const lojaId = Number(this.form.value.loja);
    if (!lojaId) {
      this.erro.set('Selecione uma loja.');
      return;
    }
    const itens = (this.form.value.itens as any[]) || [];
    if (!itens.length) {
      this.erro.set('Adicione ao menos um item.');
      return;
    }

    this.loading.set(true);
    this.estSvc
      .bulkUpsert(
        lojaId,
        itens.map(i => ({
          ean: String(i.ean),
          qtd: Number(i.qtd),
          codigoproduto: String(i.codigoproduto)
        }))
      )
      .subscribe({
        next: () => {
          this.sucesso.set('Lançamento concluído!');
          this.itens.clear();
        },
        error: (e) => this.erro.set(typeof e === 'string' ? e : 'Falha ao lançar estoque'),
        complete: () => this.loading.set(false)
      });
  }
}
