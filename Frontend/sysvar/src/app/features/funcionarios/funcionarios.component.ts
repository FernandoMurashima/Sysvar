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

// use os caminhos do seu projeto (ajuste se for "app/core/..."):
import { FuncionariosService } from '../../core/services/funcionarios.service';
import { Funcionario } from '../../core/models/funcionario';

@Component({
  selector: 'app-funcionarios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './funcionarios.component.html',
  styleUrls: ['./funcionarios.component.css']
})
export class FuncionariosComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(FuncionariosService);

  // ===== UI =====
  loading = false;
  saving = false;
  submitted = false;
  showForm = false;
  editingId: number | null = null;

  search = '';
  successMsg = '';
  errorMsg = '';
  errorOverlayOpen = false;

  // ===== Form =====
  form: FormGroup = this.fb.group({
    nomefuncionario: ['', [Validators.required, Validators.maxLength(50)]],
    apelido: ['', [Validators.required, Validators.maxLength(20)]],
    cpf: ['', [this.cpfValidator]],

    categoria: ['', [Validators.required]],
    meta: [null, [Validators.min(0)]],

    // sem dependência de lojas; apenas o id numérico
    idloja: [null, [Validators.required]],

    inicio: [''],
    fim: [''],
  });

  categoriaOptions: string[] = ['Vendas', 'Caixa', 'Gerência', 'Financeiro', 'Estoque'];

  // ===== Lista + ListView (client-side) =====
  funcionariosAll: Funcionario[] = [];
  funcionarios: Funcionario[] = [];

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
  cpfValidator(ctrl: AbstractControl): ValidationErrors | null {
    const raw = (ctrl.value || '').toString();
    const cpf = raw.replace(/\D/g, '');
    if (!cpf) return null;              // opcional
    if (cpf.length !== 11) return { cpf: true };
    if (/^(\d)\1{10}$/.test(cpf)) return { cpf: true };

    const calc = (slice: number) => {
      let sum = 0;
      for (let i = 0; i < slice; i++) sum += parseInt(cpf.charAt(i), 10) * (slice + 1 - i);
      const mod = sum % 11;
      return (mod < 2) ? 0 : 11 - mod;
    };
    const d1 = calc(9);
    const d2 = calc(10);
    const ok = cpf === cpf.substring(0, 9) + d1 + d2;
    return ok ? null : { cpf: true };
  }

  // ===== Fluxo =====
  load(): void {
    this.loading = true;
    this.api.list({ search: this.search, page_size: 2000 }).subscribe({
      next: (res: any) => {
        const arr: Funcionario[] = Array.isArray(res) ? res : (res?.results ?? []);
        this.funcionariosAll = arr;
        this.total = (res && typeof res === 'object' && typeof res.count === 'number') ? res.count : arr.length;
        this.page = 1;
        this.applyPage();
        this.loading = false;
        this.errorMsg = '';
      },
      error: (err) => {
        console.error('Falha ao carregar funcionários', err);
        this.funcionariosAll = [];
        this.funcionarios = [];
        this.total = 0;
        this.loading = false;
        this.errorMsg = 'Falha ao carregar funcionários.';
      }
    });
  }

  applyPage(): void {
    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.funcionarios = this.funcionariosAll.slice(start, end);
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

  onSearchKeyup(ev: KeyboardEvent): void { if (ev.key === 'Enter') this.doSearch(); }
  doSearch(): void { this.page = 1; this.load(); }
  clearSearch(): void { this.search = ''; this.page = 1; this.load(); }

  novo(): void {
    this.showForm = true;
    this.editingId = null;
    this.submitted = false;
    this.successMsg = '';
    this.errorMsg = '';

    this.form.reset({
      nomefuncionario: '',
      apelido: '',
      cpf: '',
      categoria: '',
      meta: null,
      idloja: null,
      inicio: '',
      fim: ''
    });
  }

  editar(row: Funcionario): void {
    this.showForm = true;
    this.editingId = (row as any).Idfuncionario ?? null;
    this.submitted = false;
    this.successMsg = '';
    this.errorMsg = '';

    this.form.reset({
      nomefuncionario: (row as any).nomefuncionario ?? '',
      apelido:         (row as any).apelido ?? '',
      cpf:             (row as any).cpf ?? '',
      categoria:       (row as any).categoria ?? '',
      meta:            (row as any).meta ?? null,
      idloja:          (row as any).idloja ?? null,
      inicio:          (row as any).inicio ?? '',
      fim:             (row as any).fim ?? ''
    });
  }

  cancelarEdicao(): void {
    this.showForm = false;
    this.editingId = null;
    this.submitted = false;
    this.errorOverlayOpen = false;
  }

  salvar(): void {
    this.submitted = true;
    if (this.form.invalid) {
      this.openErrorOverlayIfNeeded();
      return;
    }

    const raw = this.form.value as any;
    // datas opcionais: '' → null
    const payload: any = {
      ...raw,
      inicio: raw.inicio ? raw.inicio : null,
      fim:    raw.fim    ? raw.fim    : null,
    };

    this.saving = true;
    const req$ = this.editingId
      ? this.api.update(this.editingId, payload)
      : this.api.create(payload);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.successMsg = this.editingId ? 'Alterações salvas com sucesso.' : 'Funcionário criado com sucesso.';
        this.cancelarEdicao();
        this.page = 1;
        this.load();
      },
      error: (err) => {
        this.saving = false;
        this.successMsg = '';
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

  excluir(item: Funcionario): void {
    const id = (item as any).Idfuncionario;
    if (!id) return;
    if (!confirm(`Excluir o funcionário "${(item as any).nomefuncionario}"?`)) return;

    this.api.remove(id).subscribe({
      next: () => {
        this.successMsg = 'Funcionário excluído.';
        const eraUltimo = this.funcionarios.length === 1 && this.page > 1;
        if (eraUltimo) this.page--;
        this.load();
        if (this.editingId === id) this.cancelarEdicao();
      },
      error: (err) => console.error('Falha ao excluir funcionário', err)
    });
  }

  // ===== Overlay de erros =====
  getFormErrors(): string[] {
    const f = this.form;
    const msgs: string[] = [];
    const P = (c: boolean, m: string) => { if (c) msgs.push(m); };

    P(f.get('nomefuncionario')?.hasError('required') || false, 'Nome é obrigatório.');
    P(f.get('nomefuncionario')?.hasError('maxlength') || false, 'Nome: máx. 50 caracteres.');
    P(f.get('apelido')?.hasError('required') || false, 'Apelido é obrigatório.');
    P(f.get('apelido')?.hasError('maxlength') || false, 'Apelido: máx. 20 caracteres.');
    P(f.get('cpf')?.hasError('cpf') || false, 'CPF inválido.');

    P(f.get('categoria')?.hasError('required') || false, 'Categoria é obrigatória.');
    P(f.get('meta')?.hasError('min') || false, 'Meta não pode ser negativa.');
    P(f.get('idloja')?.hasError('required') || false, 'Informe o ID da loja.');

    ['nomefuncionario','apelido','cpf','categoria','meta','idloja','inicio','fim']
      .forEach(field => {
        const err = f.get(field)?.errors?.['server'];
        if (err) msgs.push(`${field}: ${err}`);
      });

    return msgs;
  }

  openErrorOverlayIfNeeded(): void {
    this.errorOverlayOpen = this.getFormErrors().length > 0;
  }
  closeErrorOverlay(): void {
    this.errorOverlayOpen = false;
  }
}
