// app/core/features/modelo-documento/modelo-documento.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { ModeloDocumentoService } from '../../core/services/modelo-documento.service';
import { ModeloDocumento, Page } from '../../core/models/modelo-documento';

import {Router} from '@angular/router';

@Component({
  selector: 'app-modelo-documento',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './modelo-documento.component.html',
  styleUrls: ['./modelo-documento.component.css']
})
export class ModeloDocumentoComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(ModeloDocumentoService);
  constructor(private router: Router) {}

     goHome() {
    this.router.navigate(['/home']);
  }



  // Estado UI
  search = '';
  loading = false;
  saving = false;
  submitted = false;
  successMsg = '';
  errorOverlayOpen = false;

  showForm = false;
  editingId: number | null = null;

  // Lista completa + fatia paginada (client-side)
  modelosAll: ModeloDocumento[] = [];
  modelos: ModeloDocumento[] = [];

  // Paginação client-side (padrão do projeto)
  page = 1;
  pageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];
  total = 0;

  // Formulário
  form!: FormGroup;

  ngOnInit(): void {
    this.buildForm();
    this.fetch();
  }

  buildForm(): void {
    this.form = this.fb.group({
      codigo: ['', [Validators.required, Validators.maxLength(4)]],
      descricao: ['', [Validators.required, Validators.maxLength(120)]],
      data_inicial: ['', [Validators.required]],
      data_final: [''],  // opcional
      ativo: [true, []],
    });
  }

  // ======== LISTAGEM / BUSCA ========
  onSearchKeyup(ev: KeyboardEvent): void {
    if (ev.key === 'Enter') this.doSearch();
  }
  doSearch(): void {
    this.page = 1;
    this.fetch();
  }
  clearSearch(): void {
    this.search = '';
    this.page = 1;
    this.fetch();
  }

  fetch(): void {
    this.loading = true;
    this.service.list({ search: this.search, page_size: 2000, ordering: 'codigo' })
      .subscribe({
        next: (res: Page<ModeloDocumento>) => {
          this.modelosAll = res.results ?? [];
          this.total = res.count ?? this.modelosAll.length;
          this.loading = false;
          this.applyPage();
        },
        error: (err) => {
          this.loading = false;
          this.modelosAll = [];
          this.modelos = [];
          this.total = 0;
          console.error('Falha ao carregar Modelos de Documento:', err);
          this.successMsg = '';
        }
      });
  }

  // ======== PAGINAÇÃO (client-side) ========
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

  applyPage(): void {
    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.modelos = this.modelosAll.slice(start, end);
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

  // ======== AÇÕES ========
  novo(): void {
    this.showForm = true;
    this.editingId = null;
    this.submitted = false;
    this.successMsg = '';
    this.form.reset({
      codigo: '',
      descricao: '',
      data_inicial: '',
      data_final: '',
      ativo: true,
    });
  }

  editar(row: ModeloDocumento): void {
    this.showForm = true;
    this.editingId = row.Idmodelo ?? null;
    this.submitted = false;
    this.successMsg = '';
    this.form.reset({
      codigo: row.codigo,
      descricao: row.descricao,
      data_inicial: row.data_inicial,
      data_final: row.data_final ?? '',
      ativo: !!row.ativo,
    });
  }

  excluir(row: ModeloDocumento): void {
    if (!row.Idmodelo) return;
    if (!confirm(`Excluir modelo "${row.codigo} - ${row.descricao}"?`)) return;

    this.saving = true;
    this.service.delete(row.Idmodelo).subscribe({
      next: () => {
        this.saving = false;
        this.successMsg = 'Registro excluído com sucesso.';
        const eraUltimoDaPagina = this.modelos.length === 1 && this.page > 1;
        if (eraUltimoDaPagina) this.page--;
        this.fetch();
      },
      error: (err) => {
        this.saving = false;
        this.openErrorOverlayFromServer(err);
      }
    });
  }

  cancelarEdicao(): void {
    this.showForm = false;
    this.editingId = null;
    this.submitted = false;
    this.successMsg = '';
  }

  salvar(): void {
    this.submitted = true;
    if (this.form.invalid) {
      this.openErrorOverlayIfNeeded();
      return;
    }

    // Ajuste de data_final: enviar null se estiver vazio
    const raw = this.form.value;
    const payload: ModeloDocumento = {
      codigo: raw.codigo,
      descricao: raw.descricao,
      data_inicial: raw.data_inicial,
      data_final: raw.data_final ? raw.data_final : null,
      ativo: !!raw.ativo,
    };

    this.saving = true;

    const req$ = this.editingId
      ? this.service.update(this.editingId, payload)
      : this.service.create(payload);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.successMsg = this.editingId
          ? 'Alterações salvas com sucesso.'
          : 'Registro criado com sucesso.';
        this.cancelarEdicao();
        this.page = 1;
        this.fetch();
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
        this.openErrorOverlayIfNeeded();
      }
    });
  }

  // ======== OVERLAY DE ERROS ========
  getFormErrors(): string[] {
    const msgs: string[] = [];
    const f = this.form;
    const P = (c: boolean, m: string) => { if (c) msgs.push(m); };

    P(f.get('codigo')?.hasError('required') || false, 'Código é obrigatório.');
    P(f.get('codigo')?.hasError('maxlength') || false, 'Código: máx. 4 caracteres.');

    P(f.get('descricao')?.hasError('required') || false, 'Descrição é obrigatória.');
    P(f.get('descricao')?.hasError('maxlength') || false, 'Descrição: máx. 120 caracteres.');

    P(f.get('data_inicial')?.hasError('required') || false, 'Data inicial é obrigatória.');

    // Mensagens vindas do backend
    ['codigo','descricao','data_inicial','data_final','ativo'].forEach(field => {
      const err = f.get(field)?.errors?.['server'];
      if (err) msgs.push(`${field}: ${err}`);
    });

    return msgs;
  }

  openErrorOverlayIfNeeded(): void {
    const hasErrors = this.getFormErrors().length > 0;
    this.errorOverlayOpen = hasErrors;
  }

  openErrorOverlayFromServer(_err: any): void {
    this.openErrorOverlayIfNeeded();
  }

  closeErrorOverlay(): void {
    this.errorOverlayOpen = false;
  }
}
