import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { FamiliasService } from '../../core/services/familias.service';
import { Familia } from '../../core/models/familia';

@Component({
  selector: 'app-familias',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './familias.component.html',
  styleUrls: ['./familias.component.css']
})
export class FamiliasComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(FamiliasService);

  loading = false;
  saving = false;
  errorMsg = '';
  successMsg = '';
  submitted = false;

  familias: Familia[] = [];
  search = '';
  editingId: number | null = null;

  /** novo: controla abertura/fechamento do formulário */
  formMode: 'new' | 'edit' | null = null;

  form = this.fb.group({
    Descricao: ['', [Validators.required, Validators.maxLength(100)]],
    Codigo: ['', [Validators.maxLength(10)]],
    Margem: [0, [Validators.min(0)]],
  });

  ngOnInit(): void { this.load(); }

  // ====== Listagem ======
  load() {
    this.loading = true;
    this.errorMsg = '';
    this.api.list({ search: this.search, ordering: '-data_cadastro' }).subscribe({
      next: (data) => {
        this.familias = Array.isArray(data) ? data : (data as any).results ?? [];
      },
      error: (err) => {
        console.error(err);
        this.errorMsg = 'Falha ao carregar famílias.';
      },
      complete: () => (this.loading = false),
    });
  }

  onSearchKeyup(ev: KeyboardEvent) { if (ev.key === 'Enter') this.load(); }
  doSearch() { this.load(); }
  clearSearch() { this.search = ''; this.load(); }

  // ====== CRUD ======
  novo() {
    this.editingId = null;
    this.formMode = 'new';     // <- abre o form
    this.submitted = false;
    this.form.reset({
      Descricao: '',
      Codigo: '',
      Margem: 0,
    });
    this.successMsg = '';
    this.errorMsg = '';
  }

  editar(item: Familia) {
    this.editingId = item.Idfamilia ?? null;
    this.formMode = 'edit';    // <- abre o form
    this.submitted = false;
    this.form.reset({
      Descricao: item.Descricao ?? '',
      Codigo: item.Codigo ?? '',
      Margem: item.Margem ?? 0,
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
    const payload: Familia = {
      Descricao: String(raw.Descricao ?? '').trim(),
      Codigo: (raw.Codigo ?? '').toString().trim() || undefined,
      Margem: raw.Margem !== null && raw.Margem !== undefined ? Number(raw.Margem) : 0,
    };

    const req$ = this.editingId
      ? this.api.update(this.editingId, payload)
      : this.api.create(payload);

    req$.subscribe({
      next: () => {
        this.successMsg = this.editingId ? 'Família atualizada com sucesso.' : 'Família criada com sucesso.';
        this.load();
        this.cancelarEdicao(); // fecha o form
      },
      error: (err: HttpErrorResponse) => {
        console.error(err);
        const detail = (err?.error?.detail || err?.error?.error || err?.error) ?? '';
        this.errorMsg = (typeof detail === 'string' && detail) ? detail : 'Falha ao salvar a família.';
      },
      complete: () => (this.saving = false),
    });
  }

  excluir(item: Familia) {
    if (!item.Idfamilia) return;
    const ok = confirm(`Excluir a família "${item.Descricao}"?`);
    if (!ok) return;

    this.api.remove(item.Idfamilia).subscribe({
      next: () => {
        this.successMsg = 'Família excluída.';
        this.load();
        if (this.editingId === item.Idfamilia) this.novo();
      },
      error: (err) => {
        console.error(err);
        this.errorMsg = 'Falha ao excluir.';
      },
    });
  }

  cancelarEdicao() {
    this.editingId = null;
    this.formMode = null;      // <- esconde o form
    this.submitted = false;
    this.form.reset({
      Descricao: '',
      Codigo: '',
      Margem: 0,
    });
  }

  // ====== Ajuda de mensagens de erro por campo ======
  fieldInvalid(name: string) {
    const c = this.form.get(name);
    return (c?.touched || this.submitted) && c?.invalid;
  }

  getFormErrors(): string[] {
    const msgs: string[] = [];
    const f = this.form;
    if (this.fieldInvalid('Descricao')) msgs.push('Informe a Descrição (máx. 100).');
    if (f.get('Codigo')?.errors?.['maxlength']) msgs.push('Código deve ter no máximo 10 caracteres.');
    if (f.get('Margem')?.errors?.['min']) msgs.push('Margem não pode ser negativa.');
    return msgs;
  }
}
