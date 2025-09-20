// src/app/features/colecoes/colecoes.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ColecoesService } from '../../core/services/colecoes.service';
import { Colecao } from '../../core/models/colecoes';

@Component({
  selector: 'app-colecoes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './colecoes.component.html',
  styleUrls: ['./colecoes.component.css']
})
export class ColecoesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ColecoesService);

  loading = false;
  saving = false;
  errorMsg = '';
  successMsg = '';
  submitted = false;

  colecoes: Colecao[] = [];
  search = '';
  editingId: number | null = null;

  /** novo: estado explícito do formulário */
  formMode: 'new' | 'edit' | null = null;

  estacoes = [
    { value: '01', label: 'Verão (01)' },
    { value: '02', label: 'Outono (02)' },
    { value: '03', label: 'Inverno (03)' },
    { value: '04', label: 'Primavera (04)' },
  ];

  form = this.fb.group({
    Descricao: ['', [Validators.required, Validators.maxLength(100)]],
    Codigo: ['', [Validators.required, Validators.pattern(/^\d{2}$/)]],  // 2 dígitos
    Estacao: ['', [Validators.required]],
    Status: [''],
    // Control usado no template, somente leitura (vem do backend)
    Contador: [{ value: 0, disabled: true }],
  });

  ngOnInit(): void { this.load(); }

  // ===== LISTAGEM =====
  load() {
    this.loading = true;
    this.errorMsg = '';
    this.api.list({ search: this.search, ordering: '-data_cadastro' }).subscribe({
      next: (data) => { this.colecoes = Array.isArray(data) ? data : (data?.results ?? []); },
      error: (err) => { console.error(err); this.errorMsg = 'Falha ao carregar coleções.'; },
      complete: () => this.loading = false
    });
  }

  onSearchKeyup(ev: KeyboardEvent) { if (ev.key === 'Enter') this.load(); }
  doSearch() { this.load(); }
  clearSearch() { this.search = ''; this.load(); }

  // ===== FORM =====
  novo() {
    this.editingId = null;
    this.formMode = 'new';     // <- abre o form
    this.submitted = false;
    this.form.reset({
      Descricao: '',
      Codigo: '',
      Estacao: '',
      Status: '',
    });
    // garantir valor do control desabilitado
    this.form.get('Contador')?.setValue(0);
    this.successMsg = '';
    this.errorMsg = '';
  }

  editar(item: Colecao) {
    this.editingId = item.Idcolecao ?? null;
    this.formMode = 'edit';    // <- abre o form
    this.submitted = false;

    this.form.patchValue({
      Descricao: item.Descricao ?? '',
      Codigo: item.Codigo ?? '',
      Estacao: item.Estacao ?? '',
      Status: item.Status ?? '',
    });
    this.form.get('Contador')?.setValue(item.Contador ?? 0);

    this.successMsg = '';
    this.errorMsg = '';
  }

  cancelarEdicao() {
    this.editingId = null;
    this.formMode = null;      // <- esconde o form
    this.submitted = false;
    this.form.reset();
    this.form.get('Contador')?.setValue(0);
  }

  salvar() {
    this.submitted = true;
    this.successMsg = '';
    this.errorMsg = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.openErrorOverlay();
      return;
    }

    // Contador é desabilitado e não entra no .value (ok)
    const payload: Colecao = { ...(this.form.value as any) };

    this.saving = true;
    const req$ = this.editingId
      ? this.api.update(this.editingId, payload)
      : this.api.create(payload);

    req$.subscribe({
      next: () => {
        this.successMsg = this.editingId ? 'Coleção atualizada com sucesso.' : 'Coleção criada com sucesso.';
        this.load();
        this.cancelarEdicao(); // volta ao estado inicial
      },
      error: (err) => {
        console.error(err);
        const detail = err?.error?.detail || err?.error?.error || '';
        this.errorMsg = detail ? String(detail) : 'Falha ao salvar coleção.';

        const errors = err?.error;
        if (errors && typeof errors === 'object') {
          for (const k of Object.keys(errors)) {
            const ctrl = this.form.get(k);
            if (ctrl) ctrl.setErrors({ server: Array.isArray(errors[k]) ? errors[k].join(' ') : String(errors[k]) });
          }
        }
        this.openErrorOverlay();
      },
      complete: () => this.saving = false
    });
  }

  excluir(item: Colecao) {
    if (!item.Idcolecao) return;
    const ok = confirm(`Excluir a coleção "${item.Descricao}"?`);
    if (!ok) return;

    this.api.remove(item.Idcolecao).subscribe({
      next: () => {
        this.successMsg = 'Coleção excluída.';
        this.load();
        if (this.editingId === item.Idcolecao) this.cancelarEdicao();
      },
      error: (err) => {
        console.error(err);
        this.errorMsg = 'Falha ao excluir.';
      }
    });
  }

  // ===== OVERLAY DE ERROS =====
  errorOverlayOpen = false;
  getFormErrors(): string[] {
    const msgs: string[] = [];
    const f = this.form;

    if (f.get('Descricao')?.errors) {
      if (f.get('Descricao')?.errors?.['required']) msgs.push('Descrição é obrigatória.');
      if (f.get('Descricao')?.errors?.['maxlength']) msgs.push('Descrição: máximo 100 caracteres.');
    }
    if (f.get('Codigo')?.errors) {
      if (f.get('Codigo')?.errors?.['required']) msgs.push('Código é obrigatório.');
      if (f.get('Codigo')?.errors?.['pattern']) msgs.push('Código deve ter exatamente 2 dígitos (ex.: 25).');
    }
    if (f.get('Estacao')?.errors) {
      if (f.get('Estacao')?.errors?.['required']) msgs.push('Estação é obrigatória (01..04).');
    }

    // erros do servidor
    for (const key of Object.keys(f.controls)) {
      const serr = f.get(key)?.errors?.['server'];
      if (serr) msgs.push(String(serr));
    }
    return msgs;
  }
  openErrorOverlay() { this.errorOverlayOpen = true; }
  closeErrorOverlay() { this.errorOverlayOpen = false; }
}
