import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

// Ajuste o caminho conforme seu projeto
import { UnidadesService } from '../../core/services/unidades.service';

export interface Unidade {
  Idunidade?: number;      // ajuste se a PK tiver outro nome
  Descricao: string;
  Codigo?: string | null;
}

type FormMode = 'new' | 'edit' | null;

@Component({
  selector: 'app-unidades',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './unidades.component.html',
  styleUrls: ['./unidades.component.css']
})
export class UnidadesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(UnidadesService);

  // UI
  loading = false;
  saving = false;
  submitted = false;
  formMode: FormMode = null;
  editingId: number | null = null;

  search = '';
  successMsg = '';
  errorMsg = '';

  // Form
  form: FormGroup = this.fb.group({
    Descricao: ['', [Validators.required, Validators.maxLength(100)]],
    Codigo: ['', [Validators.maxLength(10)]],
  });

  // Lista + ListView
  unidadesAll: Unidade[] = [];
  unidades: Unidade[] = [];

  page = 1;
  pageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];
  total = 0;

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }
  get pageStart(): number {
    if (this.total === 0) return 0;
    return (this.page - 1) * this.pageSize + 1;
  }
  get pageEnd(): number {
    return Math.min(this.page * this.pageSize, this.total);
  }

  ngOnInit(): void {
    this.load();
  }

  // ===== Helpers de template =====
  fieldInvalid(field: string): 'true' | null {
    const c = this.form.get(field);
    return c && c.invalid && (c.touched || this.submitted) ? 'true' : null;
  }

  getFormErrors(): string[] {
    const f = this.form;
    const out: string[] = [];
    const P = (cond: boolean, msg: string) => { if (cond) out.push(msg); };

    P(f.get('Descricao')?.hasError('required') || false, 'Descrição é obrigatória.');
    P(f.get('Descricao')?.hasError('maxlength') || false, 'Descrição: máx. 100 caracteres.');
    P(f.get('Codigo')?.hasError('maxlength')   || false, 'Código: máx. 10 caracteres.');

    ['Descricao','Codigo'].forEach(field => {
      const err = f.get(field)?.errors?.['server'];
      if (err) out.push(`${field}: ${err}`);
    });

    return out;
  }

  // ===== Fluxo =====
  load(): void {
    this.loading = true;
    this.api.list({ search: this.search, page_size: 2000 }).subscribe({
      next: (res: any) => {
        const arr: Unidade[] = Array.isArray(res) ? res : (res?.results ?? []);
        this.unidadesAll = arr;
        this.total = (res && typeof res === 'object' && typeof res.count === 'number') ? res.count : arr.length;
        this.page = 1;
        this.applyPage();
        this.loading = false;
        this.errorMsg = '';
      },
      error: (err) => {
        console.error('Falha ao carregar unidades', err);
        this.unidadesAll = [];
        this.unidades = [];
        this.total = 0;
        this.loading = false;
        this.errorMsg = 'Falha ao carregar unidades.';
      }
    });
  }

  applyPage(): void {
    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.unidades = this.unidadesAll.slice(start, end);
  }

  onPageSizeChange(sizeStr: string): void {
    const size = Number(sizeStr) || 10;
    this.pageSize = size;
    this.page = 1;
    this.applyPage();
  }
  firstPage(): void { if (this.page !== 1) { this.page = 1; this.applyPage(); } }
  prevPage(): void  { if (this.page > 1) { this.page--; this.applyPage(); } }
  nextPage(): void  { if (this.page < this.totalPages) { this.page++; this.applyPage(); } }
  lastPage(): void  { if (this.page !== this.totalPages) { this.page = this.totalPages; this.applyPage(); } }

  onSearchKeyup(ev: KeyboardEvent): void {
    if (ev.key === 'Enter') this.doSearch();
  }
  doSearch(): void { this.page = 1; this.load(); }
  clearSearch(): void { this.search = ''; this.page = 1; this.load(); }

  // ===== CRUD =====
  novo(): void {
    this.formMode = 'new';
    this.editingId = null;
    this.submitted = false;
    this.successMsg = '';

    this.form.reset({
      Descricao: '',
      Codigo: ''
    });
  }

  editar(row: Unidade): void {
    this.formMode = 'edit';
    this.editingId = (row as any).Idunidade ?? null;
    this.submitted = false;
    this.successMsg = '';

    this.form.reset({
      Descricao: (row as any).Descricao ?? '',
      Codigo:    (row as any).Codigo ?? ''
    });
  }

  cancelarEdicao(): void {
    this.formMode = null;
    this.editingId = null;
    this.submitted = false;
  }

  salvar(): void {
    this.submitted = true;
    if (this.form.invalid) return;

    const payload = this.form.value as any;

    this.saving = true;
    const req$ = this.editingId
      ? this.api.update(this.editingId, payload)
      : this.api.create(payload);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.successMsg = this.editingId ? 'Alterações salvas com sucesso.' : 'Unidade criada com sucesso.';
        this.cancelarEdicao();
        this.page = 1;
        this.load();
      },
      error: (err) => {
        this.saving = false;
        if (err?.error && typeof err.error === 'object') {
          Object.keys(err.error).forEach(field => {
            const ctrl = this.form.get(field);
            if (ctrl) {
              ctrl.setErrors({
                ...(ctrl.errors || {}),
                server: Array.isArray(err.error[field]) ? err.error[field].join(' ') : String(err.error[field])
              });
            }
          });
        }
      }
    });
  }

  excluir(item: Unidade): void {
    const id = (item as any).Idunidade;
    if (!id) return;
    if (!confirm(`Excluir a unidade "${(item as any).Descricao}"?`)) return;

    this.api.remove(id).subscribe({
      next: () => {
        this.successMsg = 'Unidade excluída.';
        const eraUltimo = this.unidades.length === 1 && this.page > 1;
        if (eraUltimo) this.page--;
        this.load();
        if (this.editingId === id) this.cancelarEdicao();
      },
      error: (err) => console.error('Falha ao excluir unidade', err)
    });
  }
}
