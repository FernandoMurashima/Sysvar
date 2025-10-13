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

import { Router } from '@angular/router';
// ajuste os paths conforme seu projeto
import { FornecedoresService } from '../../core/services/fornecedores.service';
import { Fornecedor } from '../../core/models/fornecedor';

@Component({
  selector: 'app-fornecedores',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule,],
  templateUrl: './fornecedores.component.html',
  styleUrls: ['./fornecedores.component.css']
})
export class FornecedoresComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(FornecedoresService);
    constructor(private router: Router) {}
  
    goHome() {
      this.router.navigate(['/home']);
    }
  

  // UI
  loading = false;
  saving = false;
  submitted = false;
  showForm = false;
  editingId: number | null = null;

  search = '';
  successMsg = '';
  errorOverlayOpen = false;

  // Form
  form: FormGroup = this.fb.group({
    Nome_fornecedor: ['', [Validators.required, Validators.maxLength(50)]],
    Apelido: ['', [Validators.required, Validators.maxLength(18)]],
    Cnpj: ['', [Validators.required, this.cnpjValidator]],
    email: ['', [Validators.email]],

    Logradouro: ['Rua'],
    Endereco: [''],
    numero: ['', [Validators.maxLength(10)]],
    Complemento: [''],

    Cep: [''],
    Bairro: [''],
    Cidade: [''],

    Telefone1: ['', [this.phoneValidator]],
    Telefone2: ['', [this.phoneValidator]],

    Categoria: [''],
    ContaContabil: ['', [Validators.maxLength(15)]],

    Bloqueio: [false],
    MalaDireta: [false],
  });

  // Opções usadas no template
  logradouroOptions: string[] = ['Rua','Avenida','Travessa','Alameda','Praça','Rodovia','Estrada','Largo','Viela'];
  categoriaOptions: string[] = ['A', 'B', 'C', 'D']; // ajuste se vier do back

  // ListView client-side
  fornecedoresAll: Fornecedor[] = [];
  fornecedores: Fornecedor[] = [];
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
  cnpjValidator(ctrl: AbstractControl): ValidationErrors | null {
    const raw: string = (ctrl.value || '').toString();
    const digits = raw.replace(/\D/g, '');
    if (!digits) return null;
    if (digits.length !== 14) return { cnpj: true };
    if (/^(\d)\1{13}$/.test(digits)) return { cnpj: true };

    const calc = (base: string, factors: number[]) => {
      const sum = base.split('').reduce((acc, ch, i) => acc + parseInt(ch, 10) * factors[i], 0);
      const mod = sum % 11;
      return mod < 2 ? 0 : 11 - mod;
    };
    const base12 = digits.slice(0, 12);
    const d1 = calc(base12, [5,4,3,2,9,8,7,6,5,4,3,2]);
    const d2 = calc(base12 + d1, [6,5,4,3,2,9,8,7,6,5,4,3,2]);
    return digits === base12 + String(d1) + String(d2) ? null : { cnpj: true };
  }

  phoneValidator(ctrl: AbstractControl): ValidationErrors | null {
    const v: string = (ctrl.value || '').toString().trim();
    if (!v) return null;
    return /^\(\d{2}\)-\d{5}-\d{4}$/.test(v) ? null : { phone: true };
  }

  onPhoneInput(field: 'Telefone1' | 'Telefone2'): void {
    const ctrl = this.form.get(field);
    if (!ctrl) return;
    const digits = (ctrl.value || '').toString().replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) { ctrl.setValue(digits); return; }
    const ddd = digits.slice(0, 2);
    const rest = digits.slice(2);
    const out = `(${ddd})-` + (rest.length <= 5 ? rest : `${rest.slice(0,5)}-${rest.slice(5,9)}`);
    ctrl.setValue(out, { emitEvent: false });
  }

  // ===== Fluxo =====
  load(): void {
    this.loading = true;
    this.api.list({ search: this.search, page_size: 2000 }).subscribe({
      next: (res: any) => {
        const arr: Fornecedor[] = Array.isArray(res) ? res : (res?.results ?? []);
        this.fornecedoresAll = arr;
        this.total = (res && typeof res === 'object' && typeof res.count === 'number') ? res.count : arr.length;
        this.page = 1;
        this.applyPage();
        this.loading = false;
      },
      error: (err) => {
        console.error('Falha ao carregar fornecedores', err);
        this.fornecedoresAll = [];
        this.fornecedores = [];
        this.total = 0;
        this.loading = false;
      }
    });
  }

  applyPage(): void {
    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.fornecedores = this.fornecedoresAll.slice(start, end);
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

  novo(): void {
    this.showForm = true;
    this.editingId = null;
    this.submitted = false;
    this.successMsg = '';

    this.form.reset({
      Nome_fornecedor: '', Apelido: '', Cnpj: '', email: '',
      Logradouro: 'Rua', Endereco: '', numero: '', Complemento: '',
      Cep: '', Bairro: '', Cidade: '',
      Telefone1: '', Telefone2: '',
      Categoria: '', ContaContabil: '',
      Bloqueio: false, MalaDireta: false,
    });
  }

  editar(row: Fornecedor): void {
    this.showForm = true;
    this.editingId = (row as any).Idfornecedor ?? null;
    this.submitted = false;
    this.successMsg = '';

    this.form.reset({
      Nome_fornecedor: (row as any).Nome_fornecedor ?? '',
      Apelido:         (row as any).Apelido ?? '',
      Cnpj:            (row as any).Cnpj ?? '',
      email:           (row as any).email ?? '',
      Logradouro:      (row as any).Logradouro ?? 'Rua',
      Endereco:        (row as any).Endereco ?? '',
      numero:          (row as any).numero ?? '',
      Complemento:     (row as any).Complemento ?? '',
      Cep:             (row as any).Cep ?? '',
      Bairro:          (row as any).Bairro ?? '',
      Cidade:          (row as any).Cidade ?? '',
      Telefone1:       (row as any).Telefone1 ?? '',
      Telefone2:       (row as any).Telefone2 ?? '',
      Categoria:       (row as any).Categoria ?? '',
      ContaContabil:   (row as any).ContaContabil ?? '',
      Bloqueio:        !!(row as any).Bloqueio,
      MalaDireta:      !!(row as any).MalaDireta,
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

    const payload = this.form.value as any;
    this.saving = true;

    const req$ = this.editingId
      ? this.api.update(this.editingId, payload)
      : this.api.create(payload);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.successMsg = this.editingId ? 'Alterações salvas com sucesso.' : 'Fornecedor criado com sucesso.';
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
        this.openErrorOverlayIfNeeded();
      }
    });
  }

  excluir(item: Fornecedor): void {
    const id = (item as any).Idfornecedor;
    if (!id) return;
    if (!confirm(`Excluir o fornecedor "${(item as any).Nome_fornecedor}"?`)) return;

    this.api.remove(id).subscribe({
      next: () => {
        this.successMsg = 'Fornecedor excluído.';
        const eraUltimo = this.fornecedores.length === 1 && this.page > 1;
        if (eraUltimo) this.page--;
        this.load();
        if (this.editingId === id) this.cancelarEdicao();
      },
      error: (err) => console.error('Falha ao excluir fornecedor', err)
    });
  }

  // Overlay de erros
  getFormErrors(): string[] {
    const f = this.form;
    const msgs: string[] = [];
    const P = (c: boolean, m: string) => { if (c) msgs.push(m); };

    P(f.get('Nome_fornecedor')?.hasError('required') || false, 'Nome é obrigatório.');
    P(f.get('Nome_fornecedor')?.hasError('maxlength') || false, 'Nome: máx. 50 caracteres.');
    P(f.get('Apelido')?.hasError('required') || false, 'Apelido é obrigatório.');
    P(f.get('Apelido')?.hasError('maxlength') || false, 'Apelido: máx. 18 caracteres.');

    P(f.get('Cnpj')?.hasError('required') || false, 'CNPJ é obrigatório.');
    P(f.get('Cnpj')?.hasError('cnpj') || false, 'CNPJ inválido.');

    P(f.get('email')?.hasError('email') || false, 'Email inválido.');
    P(f.get('numero')?.hasError('maxlength') || false, 'Número: máx. 10 caracteres.');

    P(f.get('Telefone1')?.hasError('phone') || false, 'Telefone 1: formato (99)-99999-9999.');
    P(f.get('Telefone2')?.hasError('phone') || false, 'Telefone 2: formato (99)-99999-9999.');
    P(f.get('ContaContabil')?.hasError('maxlength') || false, 'Conta Contábil: máx. 15 caracteres.');

    // erros de servidor por campo
    [
      'Nome_fornecedor','Apelido','Cnpj','email',
      'Logradouro','Endereco','numero','Complemento',
      'Cep','Bairro','Cidade',
      'Telefone1','Telefone2',
      'Categoria','ContaContabil',
      'Bloqueio','MalaDireta'
    ].forEach(field => {
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
