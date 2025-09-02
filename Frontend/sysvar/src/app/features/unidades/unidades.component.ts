import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { UnidadesService } from '../../core/services/unidades.service';
import { Unidade } from '../../core/models/unidade';

@Component({
  selector: 'app-unidades',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './unidades.component.html',
  styleUrls: ['./unidades.component.css']
})
export class UnidadesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(UnidadesService);

  loading = false;
  saving = false;
  errorMsg = '';
  successMsg = '';
  submitted = false;

  unidades: Unidade[] = [];
  search = '';
  editingId: number | null = null;

  /** novo: controla abertura/fechamento do formulário */
  formMode: 'new' | 'edit' | null = null;

  form = this.fb.group({
    Descricao: ['', [Validators.required, Validators.maxLength(100)]],
    Codigo: ['', [Validators.maxLength(10)]],
  });

  ngOnInit(): void { this.load(); }

  // ===== Listagem =====
  load() {
    this.loading = true;
    this.errorMsg = '';
    this.api.list({ search: this.search, ordering: '-data_cadastro' }).subscribe({
      next: (data) => {
        this.unidades = Array.isArray(data) ? data : (data as any).results ?? [];
      },
      error: (err) => {
        console.error(err);
        this.errorMsg = 'Falha ao carregar unidades.';
      },
      complete: () => (this.loading = false),
    });
  }

  onSearchKeyup(ev: KeyboardEvent) { if (ev.key === 'Enter') this.load(); }
  doSearch() { this.load(); }
  clearSearch() { this.search = ''; this.load(); }

  // ===== CRUD =====
  novo() {
    this.editingId = null;
    this.formMode = 'new';        // <- abre o form
    this.submitted = false;
    this.form.reset({
      Descricao: '',
      Codigo: '',
    });
    this.successMsg = '';
    this.errorMsg = '';
  }

  editar(item: Unidade) {
    this.editingId = item.Idunidade ?? null;
    this.formMode = 'edit';       // <- abre o form
    this.submitted = false;
    this.form.reset({
      Descricao: item.Descricao ?? '',
      Codigo: item.Codigo ?? '',
    });
    this.successMsg = '';
    this.errorMsg = '';
  }

  salvar() {
    this.submitted = true;
    if (this.form.invalid) {
      this.errorMsg = 'Revise os campos destacados e tente novamente.';
      return;
    }

    this.saving = true;
    this.errorMsg = '';
    this.successMsg = '';

    const raw = this.form.getRawValue();
    const payload: Unidade = {
      Descricao: String(raw.Descricao ?? '').trim(),
      Codigo: (raw.Codigo ?? '').toString().trim() || undefined,
    };

    const req$ = this.editingId
      ? this.api.update(this.editingId, payload)
      : this.api.create(payload);

    req$.subscribe({
      next: () => {
        this.successMsg = this.editingId ? 'Unidade atualizada com sucesso.' : 'Unidade criada com sucesso.';
        this.load();
        this.cancelarEdicao();   // <- fecha o form
      },
      error: (err: HttpErrorResponse) => {
        console.error(err);
        const detail = (err?.error?.detail || err?.error?.error || err?.error) ?? '';
        this.errorMsg = (typeof detail === 'string' && detail) ? detail : 'Falha ao salvar a unidade.';
      },
      complete: () => (this.saving = false),
    });
  }

  excluir(item: Unidade) {
    if (!item.Idunidade) return;
    const ok = confirm(`Excluir a unidade "${item.Descricao}"?`);
    if (!ok) return;

    this.api.remove(item.Idunidade).subscribe({
      next: () => {
        this.successMsg = 'Unidade excluída.';
        this.load();
        if (this.editingId === item.Idunidade) this.novo();
      },
      error: (err) => {
        console.error(err);
        this.errorMsg = 'Falha ao excluir.';
      },
    });
  }

  cancelarEdicao() {
    this.editingId = null;
    this.formMode = null;         // <- esconde o form
    this.submitted = false;
    this.form.reset({
      Descricao: '',
      Codigo: '',
    });
  }

  // ===== Helpers de validação =====
  fieldInvalid(name: string) {
    const c = this.form.get(name);
    return (c?.touched || this.submitted) && c?.invalid;
  }

  getFormErrors(): string[] {
    const msgs: string[] = [];
    if (this.fieldInvalid('Descricao')) msgs.push('Informe a Descrição (máx. 100).');
    if (this.form.get('Codigo')?.errors?.['maxlength']) msgs.push('Código deve ter no máximo 10 caracteres.');
    return msgs;
  }
}
