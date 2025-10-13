// app/core/features/natureza-lancamento/natureza-lancamento.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { NaturezaLancamentoService } from '../../core/services/natureza-lancamento.service';
import { NaturezaLancamento, Page } from '../../core/models/natureza-lancamento';

import {Router} from '@angular/router';

@Component({
  selector: 'app-natureza-lancamento',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './natureza-lancamento.component.html',
  styleUrls: ['./natureza-lancamento.component.css']
})
export class NaturezaLancamentoComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(NaturezaLancamentoService);
  constructor(private router: Router) {}

  // Estado UI
  search = '';
  loading = false;
  saving = false;
  submitted = false;
  successMsg = '';
  errorOverlayOpen = false;

  showForm = false;
  editingId: number | null = null;

  // Lista (todos os itens carregados) + “página atual” para exibição
  natlancesAll: NaturezaLancamento[] = [];
  natlances: NaturezaLancamento[] = [];

  // Paginação (client-side)
  page = 1;
  pageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];
  total = 0;

  // Formulário
  form!: FormGroup;

  // Opções
  tipoOptions = [
    'Ativo', 'Passivo', 'Patrimônio Líquido', 'Receita', 'Despesa', 'Transferência', 'Investimento', 'Outro'
  ];
  statusOptions = ['Ativa', 'Inativa'];
  naturezaOptions = ['Analítica', 'Sintética'];

  ngOnInit(): void {
    this.buildForm();
    this.fetch();
  }

  buildForm(): void {
    this.form = this.fb.group({
      codigo: ['', [Validators.required, Validators.maxLength(10)]],
      categoria_principal: ['', [Validators.required, Validators.maxLength(50)]],
      subcategoria: ['', [Validators.required, Validators.maxLength(50)]],
      descricao: ['', [Validators.required, Validators.maxLength(255)]],
      tipo: ['', [Validators.required]],
      status: ['Ativa', [Validators.required]],
      tipo_natureza: ['Analítica', [Validators.required]],
    });
  }

  // ==== LISTAGEM / BUSCA ====
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

    goHome() {
    this.router.navigate(['/home']);
  }

  fetch(): void {
    this.loading = true;
    this.service.list({ search: this.search, page_size: 2000 }) // traz “bastante”; paginamos no front
      .subscribe({
        next: (res: Page<NaturezaLancamento>) => {
          this.natlancesAll = res.results ?? [];
          this.total = res.count ?? this.natlancesAll.length;
          this.loading = false;
          this.applyPage();
        },
        error: (err) => {
          this.loading = false;
          this.natlancesAll = [];
          this.natlances = [];
          this.total = 0;
          console.error('Falha ao carregar Naturezas de Lançamento:', err);
          this.successMsg = '';
        }
      });
  }

  // ==== PAGINAÇÃO (client-side) ====
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
    this.natlances = this.natlancesAll.slice(start, end);
  }

  onPageSizeChange(sizeStr: string): void {
    const size = Number(sizeStr) || 10;
    this.pageSize = size;
    this.page = 1;
    this.applyPage();
  }

  firstPage(): void {
    if (this.page !== 1) {
      this.page = 1;
      this.applyPage();
    }
  }
  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.applyPage();
    }
  }
  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.applyPage();
    }
  }
  lastPage(): void {
    if (this.page !== this.totalPages) {
      this.page = this.totalPages;
      this.applyPage();
    }
  }

  // ==== AÇÕES ====
  novo(): void {
    this.showForm = true;
    this.editingId = null;
    this.submitted = false;
    this.successMsg = '';
    this.form.reset({
      codigo: '',
      categoria_principal: '',
      subcategoria: '',
      descricao: '',
      tipo: '',
      status: 'Ativa',
      tipo_natureza: 'Analítica',
    });
  }

  editar(row: NaturezaLancamento): void {
    this.showForm = true;
    this.editingId = row.idnatureza ?? null;
    this.submitted = false;
    this.successMsg = '';
    this.form.reset({
      codigo: row.codigo,
      categoria_principal: row.categoria_principal,
      subcategoria: row.subcategoria,
      descricao: row.descricao,
      tipo: row.tipo,
      status: row.status,
      tipo_natureza: row.tipo_natureza,
    });
  }

  excluir(row: NaturezaLancamento): void {
    if (!row.idnatureza) return;
    if (!confirm(`Excluir natureza "${row.codigo} - ${row.descricao}"?`)) return;

    this.saving = true;
    this.service.delete(row.idnatureza).subscribe({
      next: () => {
        this.saving = false;
        this.successMsg = 'Registro excluído com sucesso.';
        // Recarrega e volta para a página 1 se a atual esvaziar
        const eraUltimoDaPagina = this.natlances.length === 1 && this.page > 1;
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

    const payload: NaturezaLancamento = this.form.value;
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
        this.page = 1;   // volta para o início após criar/alterar
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

  // ==== OVERLAY DE ERROS ====
  getFormErrors(): string[] {
    const msgs: string[] = [];
    const f = this.form;

    const pushIf = (cond: boolean, msg: string) => { if (cond) msgs.push(msg); };

    pushIf(f.get('codigo')?.hasError('required') || false, 'Código é obrigatório.');
    pushIf(f.get('codigo')?.hasError('maxlength') || false, 'Código: máx. 10 caracteres.');

    pushIf(f.get('categoria_principal')?.hasError('required') || false, 'Categoria Principal é obrigatória.');
    pushIf(f.get('categoria_principal')?.hasError('maxlength') || false, 'Categoria Principal: máx. 50 caracteres.');

    pushIf(f.get('subcategoria')?.hasError('required') || false, 'Subcategoria é obrigatória.');
    pushIf(f.get('subcategoria')?.hasError('maxlength') || false, 'Subcategoria: máx. 50 caracteres.');

    pushIf(f.get('descricao')?.hasError('required') || false, 'Descrição é obrigatória.');
    pushIf(f.get('descricao')?.hasError('maxlength') || false, 'Descrição: máx. 255 caracteres.');

    pushIf(f.get('tipo')?.hasError('required') || false, 'Tipo é obrigatório.');
    pushIf(f.get('status')?.hasError('required') || false, 'Status é obrigatório.');
    pushIf(f.get('tipo_natureza')?.hasError('required') || false, 'Natureza é obrigatória.');

    ['codigo','categoria_principal','subcategoria','descricao','tipo','status','tipo_natureza'].forEach(field => {
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
