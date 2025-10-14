import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormGroup,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ColecoesService } from '../../core/services/colecoes.service';

// ✅ Reuso dos tipos e listas centralizados no model
import {
  Colecao,
  CodigoEstacao,
  ESTACOES,
  StatusColecao,
  STATUS_COLECAO
} from '../../core/models/colecoes';

type FormMode = 'new' | 'edit' | null;

@Component({
  selector: 'app-colecoes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './colecoes.component.html',
  styleUrls: ['./colecoes.component.css']
})
export class ColecoesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ColecoesService);

  // UI
  loading = false;
  saving = false;
  submitted = false;
  formMode: FormMode = null;
  editingId: number | null = null;

  search = '';
  successMsg = '';
  errorMsg = '';

  // Listas de Select (provenientes do model)
  estacoes = ESTACOES;
  statusOptions = STATUS_COLECAO;

  // Form
  form: FormGroup = this.fb.group({
    Descricao: ['', [Validators.required, Validators.maxLength(100)]],
    Codigo: ['', [Validators.required, this.codigoDoisDigitos]],
    Estacao: ['', [Validators.required, Validators.pattern(/^(01|02|03|04)$/)]],
    Status: ['CR', [Validators.pattern(/^(CR|PD|AT|EN|AR)$/)]], // default CR (Criação)
    Contador: [{ value: null, disabled: true }]
  });

  // Lista + ListView
  colecoesAll: Colecao[] = [];
  colecoes: Colecao[] = [];

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

  // ===== Validadores =====
  codigoDoisDigitos(ctrl: AbstractControl): ValidationErrors | null {
    const v = (ctrl.value || '').toString().trim();
    if (!v) return { required: true };
    return /^\d{2}$/.test(v) ? null : { codigoInvalido: true };
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

    P(f.get('Codigo')?.hasError('required') || false, 'Código é obrigatório.');
    P(f.get('Codigo')?.hasError('codigoInvalido') || false, 'Código deve conter exatamente 2 dígitos numéricos.');

    P(f.get('Estacao')?.hasError('required') || false, 'Estação é obrigatória.');
    P(f.get('Estacao')?.hasError('pattern') || false, 'Estação inválida.');

    P(f.get('Status')?.hasError('pattern') || false, 'Status inválido.');

    ['Descricao','Codigo','Estacao','Status'].forEach(field => {
      const err = f.get(field)?.errors?.['server'];
      if (err) out.push(`${field}: ${err}`);
    });

    return out;
  }

  // Mapas para exibir labels na lista
  getEstacaoLabel(code: CodigoEstacao | string | null | undefined): string {
    const found = this.estacoes.find(e => e.value === code);
    return found ? found.label : String(code ?? '');
  }
  getStatusLabel(code: StatusColecao | string | null | undefined): string {
    const found = this.statusOptions.find(s => s.value === code);
    return found ? found.label : String(code ?? '');
  }

  // ===== Fluxo =====
  load(): void {
    this.loading = true;
    this.api.list({ search: this.search, page_size: 2000 }).subscribe({
      next: (res: any) => {
        const arr: Colecao[] = Array.isArray(res) ? res : (res?.results ?? []);
        this.colecoesAll = arr;
        this.total = (res && typeof res === 'object' && typeof res.count === 'number') ? res.count : arr.length;
        this.page = 1;
        this.applyPage();
        this.loading = false;
        this.errorMsg = '';
      },
      error: (err) => {
        console.error('Falha ao carregar coleções', err);
        this.colecoesAll = [];
        this.colecoes = [];
        this.total = 0;
        this.loading = false;
        this.errorMsg = 'Falha ao carregar coleções.';
      }
    });
  }

  applyPage(): void {
    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.colecoes = this.colecoesAll.slice(start, end);
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
      Codigo: '',
      Estacao: '',
      Status: 'CR',   // default para nova coleção = Criação
      Contador: null
    });
  }

  editar(row: Colecao): void {
    this.formMode = 'edit';
    this.editingId = (row as any).Idcolecao ?? null;
    this.submitted = false;
    this.successMsg = '';

    this.form.reset({
      Descricao: (row as any).Descricao ?? '',
      Codigo:    (row as any).Codigo ?? '',
      Estacao:   (row as any).Estacao ?? '',
      Status:    (row as any).Status ?? 'CR',
      Contador:  (row as any).Contador ?? null
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

    const payload = {
      ...this.form.getRawValue()
    } as Colecao;

    this.saving = true;
    const req$ = this.editingId
      ? this.api.update(this.editingId, payload)
      : this.api.create(payload);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.successMsg = this.editingId ? 'Alterações salvas com sucesso.' : 'Coleção criada com sucesso.';
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

  excluir(item: Colecao): void {
    const id = (item as any).Idcolecao;
    if (!id) return;
    if (!confirm(`Excluir a coleção "${(item as any).Descricao}"?`)) return;

    this.api.remove(id).subscribe({
      next: () => {
        this.successMsg = 'Coleção excluída.';
        const eraUltimo = this.colecoes.length === 1 && this.page > 1;
        if (eraUltimo) this.page--;
        this.load();
        if (this.editingId === id) this.cancelarEdicao();
      },
      error: (err) => console.error('Falha ao excluir coleção', err)
    });
  }
}
