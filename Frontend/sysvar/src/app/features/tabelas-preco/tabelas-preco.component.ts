import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { TabelaprecoService } from '../../core/services/tabelapreco.service';
import { TabelaPreco } from '../../core/models/tabelapreco';

@Component({
  selector: 'app-tabelas-preco',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './tabelas-preco.component.html',
  styleUrls: ['./tabelas-preco.component.css']
})
export class TabelasPrecoComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(TabelaprecoService);

  // estado
  loading = false;
  saving = false;
  errorMsg = '';
  successMsg = '';
  submitted = false;

  // visibilidade do form
  showForm = false;

  // dados
  tabelas: TabelaPreco[] = [];
  search = '';
  editingId: number | null = null;

  form = this.fb.group({
    NomeTabela: ['', [Validators.required, Validators.maxLength(100)]],
    DataInicio: ['', [Validators.required]],
    Promocao: ['NAO', [Validators.required]],   // SIM | NAO
    DataFim: ['', [Validators.required]],
  });

  ngOnInit(): void { this.load(); }

  load() {
    this.loading = true;
    this.errorMsg = '';
    this.api.list({ search: this.search, ordering: '-data_cadastro' }).subscribe({
      next: (data) => {
        this.tabelas = Array.isArray(data) ? data : (data?.results ?? []);
      },
      error: (err) => {
        console.error(err);
        this.errorMsg = 'Falha ao carregar as tabelas de preço.';
      },
      complete: () => (this.loading = false),
    });
  }

  onSearchKeyup(ev: KeyboardEvent) { if (ev.key === 'Enter') this.load(); }
  doSearch() { this.load(); }
  clearSearch() { this.search = ''; this.load(); }

  nova() {
    this.editingId = null;
    this.submitted = false;
    this.form.reset({
      NomeTabela: '',
      DataInicio: '',
      Promocao: 'NAO',
      DataFim: '',
    });
    this.errorMsg = '';
    this.successMsg = '';
    this.showForm = true; // <<< abre o formulário
  }

  editar(item: TabelaPreco) {
    this.editingId = item.Idtabela ?? null;
    this.submitted = false;
    this.form.reset({
      NomeTabela: item.NomeTabela ?? '',
      DataInicio: item.DataInicio ?? '',
      Promocao: (item.Promocao ?? 'NAO').toUpperCase() === 'NÃO' ? 'NAO' : (item.Promocao ?? 'NAO'),
      DataFim: item.DataFim ?? '',
    });
    this.errorMsg = '';
    this.successMsg = '';
    this.showForm = true; // <<< abre o formulário
  }

  cancelarEdicao() {
    this.editingId = null;
    this.submitted = false;
    this.form.reset({
      NomeTabela: '',
      DataInicio: '',
      Promocao: 'NAO',
      DataFim: '',
    });
    this.showForm = false; // <<< fecha o formulário
  }

  fieldInvalid(name: string) {
    const c = this.form.get(name);
    return (c?.touched || this.submitted) && c?.invalid;
  }

  getFormErrors(): string[] {
    const msgs: string[] = [];
    if (this.fieldInvalid('NomeTabela')) msgs.push('Informe a Nome da Tabela (máx. 100).');
    if (this.fieldInvalid('DataInicio')) msgs.push('Informe a Data de Início.');
    if (this.fieldInvalid('DataFim')) msgs.push('Informe a Data de Fim.');
    if (this.fieldInvalid('Promocao')) msgs.push("Selecione se é promoção: 'SIM' ou 'NAO'.");
    const di = this.form.value.DataInicio;
    const df = this.form.value.DataFim;
    if (di && df && df < di) msgs.push('Data de Fim não pode ser anterior à Data de Início.');
    return msgs;
  }

  salvar() {
    this.submitted = true;
    if (this.form.invalid) {
      this.errorMsg = 'Revise os campos destacados e tente novamente.';
      return;
    }

    const di = this.form.value.DataInicio!;
    const df = this.form.value.DataFim!;
    if (di && df && df < di) {
      this.errorMsg = 'Data de Fim não pode ser anterior à Data de Início.';
      return;
    }

    this.saving = true;
    this.errorMsg = '';
    this.successMsg = '';

    const raw = this.form.getRawValue();
    const payload: TabelaPreco = {
      NomeTabela: String(raw.NomeTabela ?? '').trim(),
      DataInicio: String(raw.DataInicio ?? ''),
      Promocao: String(raw.Promocao ?? 'NAO').toUpperCase() === 'NÃO' ? 'NAO' : String(raw.Promocao ?? 'NAO'),
      DataFim: String(raw.DataFim ?? ''),
    };

    const req$ = this.editingId
      ? this.api.update(this.editingId, payload)
      : this.api.create(payload);

    req$.subscribe({
      next: () => {
        this.successMsg = this.editingId ? 'Tabela de preço atualizada.' : 'Tabela de preço criada.';
        this.load();
        this.cancelarEdicao(); // <<< fecha e limpa o formulário
      },
      error: (err: HttpErrorResponse) => {
        console.error(err);
        const detail = (err?.error?.detail || err?.error?.error || err?.error) ?? '';
        this.errorMsg = (typeof detail === 'string' && detail) ? detail : 'Falha ao salvar.';
      },
      complete: () => (this.saving = false),
    });
  }

  excluir(item: TabelaPreco) {
    if (!item.Idtabela) return;
    const ok = confirm(`Excluir a tabela "${item.NomeTabela}"?`);
    if (!ok) return;

    this.api.remove(item.Idtabela).subscribe({
      next: () => {
        this.successMsg = 'Tabela excluída.';
        this.load();
        if (this.editingId === item.Idtabela) this.cancelarEdicao();
      },
      error: (err) => {
        console.error(err);
        this.errorMsg = 'Falha ao excluir.';
      }
    });
  }
}
