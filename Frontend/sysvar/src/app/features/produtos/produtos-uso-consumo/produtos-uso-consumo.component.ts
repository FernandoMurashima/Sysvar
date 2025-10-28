import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Location, CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { ProdutosUsoConsumoService, ProdutoUsoConsumo } from '../../../core/services/produtos-uso-consumo.service';

@Component({
  selector: 'app-produtos-uso-consumo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './produtos-uso-consumo.component.html',
  styleUrls: ['./produtos-uso-consumo.component.css']
})
export class ProdutosUsoConsumoComponent implements OnInit {

  modo: 'listar' | 'editar' | 'novo' = 'listar';
  carregando = false;
  itens: ProdutoUsoConsumo[] = [];
  selecionado: ProdutoUsoConsumo | null = null;

  form = this.fb.group({
    id: [null as number | null],
    tipo: ['2', [Validators.required]], // fixo
    nome: ['', [Validators.required, Validators.maxLength(120)]],
    descricao: [''],
    unidade: ['UN', [Validators.required, Validators.maxLength(6)]],
    ativo: [true]
  });

  constructor(
    private fb: FormBuilder,
    private svc: ProdutosUsoConsumoService,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.carregarLista();
  }

  carregarLista(): void {
    this.carregando = true;
    this.svc.listar().subscribe({
      next: res => {
        const lista = res ?? [];
        this.itens = lista.filter(i => (i.tipo ?? 'USO_CONSUMO') === 'USO_CONSUMO');
      },
      error: () => {},
      complete: () => { this.carregando = false; }
    });
  }

  novo(): void {
    this.modo = 'novo';
    this.selecionado = null;
    this.form.reset({
      id: null,
      tipo: 'USO_CONSUMO',
      nome: '',
      descricao: '',
      unidade: 'UN',
      ativo: true
    });
  }

  editar(item: ProdutoUsoConsumo): void {
    this.modo = 'editar';
    this.selecionado = item;
    this.form.patchValue({
      id: item.id ?? null,
      tipo: item.tipo ?? 'USO_CONSUMO',
      nome: item.nome ?? '',
      descricao: item.descricao ?? '',
      unidade: item.unidade ?? 'UN',
      ativo: (item.ativo ?? true)
    });
  }

  cancelar(): void {
    this.modo = 'listar';
    this.selecionado = null;
    this.form.reset();
    this.carregarLista();
  }

  salvar(): void {
    if (this.form.invalid) return;

    // força o tipo no payload
    const payload: ProdutoUsoConsumo = {
      ...(this.form.value as ProdutoUsoConsumo),
      tipo: 'USO_CONSUMO'
    };

    if (this.modo === 'novo') {
      this.svc.criar(payload).subscribe({
        next: () => this.cancelar(),
        error: () => {}
      });
    } else if (this.modo === 'editar' && payload.id) {
      this.svc.atualizar(payload.id, payload).subscribe({
        next: () => this.cancelar(),
        error: () => {}
      });
    }
  }

  excluir(item: ProdutoUsoConsumo): void {
    if (!item.id) return;
    if (!confirm(`Excluir produto de uso/consumo "${item.nome}"?`)) return;
    this.svc.excluir(item.id).subscribe({
      next: () => this.carregarLista(),
      error: () => {}
    });
  }

  voltar(): void {
    this.location.back();
  }
}
