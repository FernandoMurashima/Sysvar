import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormGroup
} from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

// Ajuste os paths conforme a sua estrutura
import { CoresService } from '../../core/services/cores.service';

export interface CorItem {
  Idcor?: number;          // ajuste se seu PK tiver outro nome
  Descricao: string;
  Codigo?: string | null;
  Cor: string;
  Status?: string | null;
}

type FormMode = 'new' | 'edit' | null;

@Component({
  selector: 'app-cores',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './cores.component.html',
  styleUrls: ['./cores.component.css']
})
export class CoresComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(CoresService);

  // ===== UI =====
  loading = false;
  saving = false;
  submitted = false;
  formMode: FormMode = null;   // usado no seu HTML
  editingId: number | null = null;

  search = '';
  successMsg = '';
  errorMsg = '';

  // ===== Form =====
  form: FormGroup = this.fb.group({
    Descricao: ['', [Validators.required, Validators.maxLength(100)]],
    Codigo: ['', [Validators.maxLength(12)]],
    Cor: ['', [Validators.required, Validators.maxLength(30)]],
    Status: ['']
  });

  statusOptions: string[] = ['', 'Ativa', 'Inativa'];

  // ===== Lista + ListView =====
  coresAll: CorItem[] = [];
  cores: CorItem[] = [];

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

  // ===== Helpers de validação usados no template =====
  fieldInvalid(field: string): 'true' | null {
    const ctrl = this.form.get(field);
    if (!ctrl) return null;
    return (ctrl.invalid && (ctrl.touched || this.submitted)) ? 'true' : null;
  }

  getFormErrors(): string[] {
    const f = this.form;
    const msgs: string[] = [];

    const req = (name: string, msg: string) => {
      if (f.get(name)?.hasError('required') && (f.get(name)?.touched || this.submitted)) msgs.push(msg);
    };
    const max = (name: string, len: number, label: string) => {
      if (f.get(name)?.hasError('maxlength') && (f.get(name)?.touched || this.submitted)) msgs.push(`${label}: máx. ${len} caracteres.`);
    };
    const server = (name: string, label?: string) => {
      const err = f.get(name)?.errors?.['server'];
      if (err) msgs.push(`${label ?? name}: ${err}`);
    };

    req('Descricao', 'Descrição é obrigatória.');
    max('Descricao', 100, 'Descrição');
    max('Codigo', 12, 'Código');
    req('Cor', 'Cor é obrigatória.');
    max('Cor', 30, 'Cor');

    // mensagens de servidor (se o backend retornar por campo)
    ['Descricao','Codigo','Cor','Status'].forEach(field => server(field));

    return msgs;
  }

  // ===== Fluxo =====
  load(): void {
    this.loading = true;
    this.api.list({ search: this.search, page_size: 2000 }).subscribe({
      next: (res: any) => {
        const arr: CorItem[] = Array.isArray(res) ? res : (res?.results ?? []);
        this.coresAll = arr;
        this.total = (res && typeof res === 'object' && typeof res.count === 'number') ? res.count : arr.length;
        this.applyPage();
        this.loading = false;
        this.errorMsg = '';
      },
      error: (err) => {
        console.error('Falha ao carregar cores', err);
        this.coresAll = [];
        this.cores = [];
        this.total = 0;
        this.loading = false;
        this.errorMsg = 'Falha ao carregar cores.';
      }
    });
  }

  applyPage(): void {
    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.cores = this.coresAll.slice(start, end);
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
  doSearch(): void {
    this.page = 1;
    this.load();
  }
  clearSearch(): void {
    this.search = '';
    this.page = 1;
    this.load();
  }

  // ===== CRUD =====
  novo(): void {
    this.formMode = 'new';
    this.editingId = null;
    this.submitted = false;
    this.successMsg = '';

    this.form.reset({
      Descricao: '',
      Codigo: '',
      Cor: '',
      Status: ''
    });
  }

  editar(row: CorItem): void {
    this.formMode = 'edit';
    this.editingId = (row as any).Idcor ?? null;
    this.submitted = false;
    this.successMsg = '';

    this.form.reset({
      Descricao: (row as any).Descricao ?? '',
      Codigo:    (row as any).Codigo ?? '',
      Cor:       (row as any).Cor ?? '',
      Status:    (row as any).Status ?? ''
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
        this.successMsg = this.editingId ? 'Alterações salvas com sucesso.' : 'Cor criada com sucesso.';
        this.cancelarEdicao();
        this.page = 1;
        this.load();
      },
      error: (err) => {
        this.saving = false;
        // Mapear mensagens do backend para campos
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

  excluir(item: CorItem): void {
    const id = (item as any).Idcor;
    if (!id) return;
    if (!confirm(`Excluir a cor "${(item as any).Descricao}"?`)) return;

    this.api.remove(id).subscribe({
      next: () => {
        this.successMsg = 'Cor excluída.';
        const eraUltimo = this.cores.length === 1 && this.page > 1;
        if (eraUltimo) this.page--;
        this.load();
        if (this.editingId === id) this.cancelarEdicao();
      },
      error: (err) => console.error('Falha ao excluir cor', err)
    });
  }
}
