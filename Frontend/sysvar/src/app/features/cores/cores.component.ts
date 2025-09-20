import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { CoresService } from '../../core/services/cores.service';
import { CorModel } from '../../core/models/cor';

@Component({
  selector: 'app-cores',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './cores.component.html',
  styleUrls: ['./cores.component.css']
})
export class CoresComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(CoresService);

  loading = false;
  saving = false;
  errorMsg = '';
  successMsg = '';
  submitted = false;

  cores: CorModel[] = [];
  search = '';
  editingId: number | null = null;

  /** novo: controla visibilidade/título do form */
  formMode: 'new' | 'edit' | null = null;

  statusOptions = ['', 'Ativo', 'Inativo'];

  form = this.fb.group({
    Descricao: ['', [Validators.required, Validators.maxLength(100)]],
    Codigo: ['', [Validators.maxLength(12)]],
    Cor: ['', [Validators.required, Validators.maxLength(30)]],
    Status: [''],
  });

  ngOnInit(): void { this.load(); }

  // ===== Listagem =====
  load() {
    this.loading = true;
    this.errorMsg = '';
    this.api.list({ search: this.search, ordering: '-data_cadastro' }).subscribe({
      next: (data) => {
        this.cores = Array.isArray(data) ? data : (data as any).results ?? [];
      },
      error: (err) => {
        console.error(err);
        this.errorMsg = 'Falha ao carregar cores.';
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
    this.formMode = 'new';
    this.submitted = false;
    this.form.reset({
      Descricao: '',
      Codigo: '',
      Cor: '',
      Status: '',
    });
    this.successMsg = '';
    this.errorMsg = '';
  }

  editar(item: CorModel) {
    this.editingId = item.Idcor ?? null;
    this.formMode = 'edit';
    this.submitted = false;
    this.form.reset({
      Descricao: item.Descricao ?? '',
      Codigo: item.Codigo ?? '',
      Cor: item.Cor ?? '',
      Status: item.Status ?? '',
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
    const payload: CorModel = {
      Descricao: String(raw.Descricao ?? '').trim(),
      Codigo: (raw.Codigo ?? '').toString().trim() || undefined,
      Cor: String(raw.Cor ?? '').trim(),
      Status: (raw.Status ?? '').toString().trim() || undefined,
    };

    const req$ = this.editingId
      ? this.api.update(this.editingId, payload)
      : this.api.create(payload);

    req$.subscribe({
      next: () => {
        this.successMsg = this.editingId ? 'Cor atualizada com sucesso.' : 'Cor criada com sucesso.';
        this.load();
        this.cancelarEdicao(); // fecha o form
      },
      error: (err: HttpErrorResponse) => {
        console.error(err);
        const detail = (err?.error?.detail || err?.error?.error || err?.error) ?? '';
        this.errorMsg = (typeof detail === 'string' && detail) ? detail : 'Falha ao salvar a cor.';
      },
      complete: () => (this.saving = false),
    });
  }

  excluir(item: CorModel) {
    if (!item.Idcor) return;
    const ok = confirm(`Excluir a cor "${item.Descricao}"?`);
    if (!ok) return;

    this.api.remove(item.Idcor).subscribe({
      next: () => {
        this.successMsg = 'Cor excluída.';
        this.load();
        if (this.editingId === item.Idcor) this.novo();
      },
      error: (err) => {
        console.error(err);
        this.errorMsg = 'Falha ao excluir.';
      },
    });
  }

  cancelarEdicao() {
    this.editingId = null;
    this.formMode = null; // <- esconde o form
    this.submitted = false;
    this.form.reset({
      Descricao: '',
      Codigo: '',
      Cor: '',
      Status: '',
    });
  }

  // ===== Validação/UX =====
  fieldInvalid(name: string) {
    const c = this.form.get(name);
    return (c?.touched || this.submitted) && c?.invalid;
  }

  getFormErrors(): string[] {
    const msgs: string[] = [];
    if (this.fieldInvalid('Descricao')) msgs.push('Informe a Descrição (máx. 100).');
    if (this.fieldInvalid('Cor')) msgs.push('Informe o nome da Cor (máx. 30).');
    if (this.form.get('Codigo')?.errors?.['maxlength']) msgs.push('Código deve ter no máximo 12 caracteres.');
    return msgs;
  }
}
