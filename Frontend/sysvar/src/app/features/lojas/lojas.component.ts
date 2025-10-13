import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
  FormGroup
} from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LojasService } from '../../core/services/lojas.service';
import { Loja } from '../../core/models/loja';

@Component({
  selector: 'app-lojas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './lojas.component.html',
  styleUrls: ['./lojas.component.css']
})
export class LojasComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(LojasService);

  // ======== Estado geral UI ========
  loading = false;
  saving = false;
  submitted = false;
  showForm = false;
  editingId: number | null = null;

  search = '';
  successMsg = '';
  errorMsg = '';
  errorOverlayOpen = false;

  // ======== Formulário ========
  form: FormGroup = this.fb.group({
    nome_loja: ['', [Validators.required, Validators.maxLength(50)]],
    Apelido_loja: ['', [Validators.required, Validators.maxLength(20)]],
    cnpj: ['', [Validators.required, this.cnpjValidator]],
    email: ['', [Validators.email]],

    Logradouro: ['Rua'],            // opções no HTML
    Endereco: [''],
    numero: ['', [Validators.maxLength(10)]],
    Complemento: [''],

    Cep: [''],
    Bairro: [''],
    Cidade: [''],

    Telefone1: ['', [this.phoneValidator]],
    Telefone2: ['', [this.phoneValidator]],

    ContaContabil: [''],
    DataAbertura: [''],
    DataEnceramento: [''],

    EstoqueNegativo: ['NAO'],
    Rede: ['NAO'],
    Matriz: ['NAO'],
   
  });

    logradouroOptions: string[] = [
    'Rua',
    'Avenida',
    'Travessa',
    'Alameda',
    'Praça',
    'Rodovia',
    'Estrada',
    'Largo',
    'Viela'
  ];

  // ======== Lista + ListView (client-side) ========
  lojasAll: Loja[] = [];
  lojas: Loja[] = [];

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

  // ========= Validadores =========

  /** Valida CNPJ com/sem máscara (14 dígitos válidos) */
  cnpjValidator(ctrl: AbstractControl): ValidationErrors | null {
    const raw: string = (ctrl.value || '').toString();
    const digits = raw.replace(/\D/g, '');
    if (!digits) return null; // deixa required cuidar de vazio
    if (digits.length !== 14) return { cnpj: true };

    // rejeita sequências repetidas
    if (/^(\d)\1{13}$/.test(digits)) return { cnpj: true };

    const calc = (base: string, factors: number[]) => {
      const sum = base.split('')
        .map((n, i) => parseInt(n, 10) * factors[i])
        .reduce((a, b) => a + b, 0);
      const mod = sum % 11;
      return (mod < 2) ? 0 : 11 - mod;
    };

    const base12 = digits.slice(0, 12);
    const d1 = calc(base12, [5,4,3,2,9,8,7,6,5,4,3,2]);
    const base13 = base12 + d1;
    const d2 = calc(base13, [6,5,4,3,2,9,8,7,6,5,4,3,2]);

    const ok = digits === (base12 + String(d1) + String(d2));
    return ok ? null : { cnpj: true };
  }

  /** Formato de telefone simples: só valida pattern (99)-99999-9999 */
  phoneValidator(ctrl: AbstractControl): ValidationErrors | null {
    const v: string = (ctrl.value || '').toString().trim();
    if (!v) return null;
    const ok = /^\(\d{2}\)-\d{5}-\d{4}$/.test(v);
    return ok ? null : { phone: true };
  }

  onPhoneInput(field: 'Telefone1'|'Telefone2'): void {
    const ctrl = this.form.get(field);
    if (!ctrl) return;
    const digits = (ctrl.value || '').toString().replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) {
      ctrl.setValue(digits);
      return;
    }
    const ddd = digits.slice(0, 2);
    const rest = digits.slice(2);
    let out = `(${ddd})-`;
    if (rest.length <= 5) {
      out += rest;
    } else {
      out += rest.slice(0, 5) + '-' + rest.slice(5, 9);
    }
    ctrl.setValue(out, { emitEvent: false });
  }

  // ========= Ações / Fluxo =========

  load(): void {
    this.loading = true;
    this.api.list({ search: this.search, page_size: 2000 }).subscribe({
      next: (res: any) => {
        // tolera array simples ou DRF paginado
        const arr: Loja[] = Array.isArray(res) ? res : (res?.results ?? []);
        this.lojasAll = arr;
        this.total = (res && typeof res === 'object' && typeof res.count === 'number')
          ? res.count
          : arr.length;
        this.page = 1;
        this.applyPage();
        this.loading = false;
        this.errorMsg = '';
      },
      error: (err) => {
        console.error(err);
        this.lojasAll = [];
        this.lojas = [];
        this.total = 0;
        this.loading = false;
        this.errorMsg = 'Falha ao carregar lojas.';
      }
    });
  }

  applyPage(): void {
    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.lojas = this.lojasAll.slice(start, end);
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

  // Buscar / limpar
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

  // Novo / Editar
  novo(): void {
    this.showForm = true;
    this.editingId = null;
    this.submitted = false;
    this.successMsg = '';
    this.errorMsg = '';

    this.form.reset({
      nome_loja: '',
      Apelido_loja: '',
      cnpj: '',
      email: '',

      Logradouro: 'Rua',
      Endereco: '',
      numero: '',
      Complemento: '',

      Cep: '',
      Bairro: '',
      Cidade: '',

      Telefone1: '',
      Telefone2: '',

      ContaContabil: '',
      DataAbertura: '',
      DataEnceramento: '',

      EstoqueNegativo: 'NAO',
      Rede: 'NAO',
      Matriz: 'NAO',
    });
  }

  editar(row: Loja): void {
    this.showForm = true;
    this.editingId = (row as any).Idloja ?? null;
    this.submitted = false;
    this.successMsg = '';
    this.errorMsg = '';

    this.form.reset({
      nome_loja:       (row as any).nome_loja ?? '',
      Apelido_loja:    (row as any).Apelido_loja ?? '',
      cnpj:            (row as any).cnpj ?? '',
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

      ContaContabil:   (row as any).ContaContabil ?? '',
      DataAbertura:    (row as any).DataAbertura ?? '',
      DataEnceramento: (row as any).DataEnceramento ?? '',

      EstoqueNegativo: (row as any).EstoqueNegativo ?? 'NAO',
      Rede:            (row as any).Rede ?? 'NAO',
      Matriz:          (row as any).Matriz ?? 'NAO',
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

  const raw = this.form.value;

  // Converte string vazia ('') em null para campos de data opcionais
  const payload = {
    ...raw,
    DataEnceramento: raw.DataEnceramento ? raw.DataEnceramento : null,
    // Se DataAbertura também for opcional, descomente a linha abaixo:
    // DataAbertura: raw.DataAbertura ? raw.DataAbertura : null,
  };

  this.saving = true;
  const req$ = this.editingId
    ? this.api.update(this.editingId, payload)
    : this.api.create(payload);

  req$.subscribe({
    next: () => {
      this.saving = false;
      this.successMsg = this.editingId
        ? 'Alterações salvas com sucesso.'
        : 'Loja criada com sucesso.';
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


  excluir(item: Loja): void {
    const id = (item as any).Idloja;
    if (!id) return;
    if (!confirm(`Excluir a loja "${(item as any).nome_loja}"?`)) return;

    this.api.remove(id).subscribe({
      next: () => {
        this.successMsg = 'Loja excluída.';
        // Se a página ficar vazia, volta uma
        const eraUltimo = this.lojas.length === 1 && this.page > 1;
        if (eraUltimo) this.page--;
        this.load();
        if (this.editingId === id) this.cancelarEdicao();
      },
      error: (err) => {
        console.error(err);
        this.errorMsg = 'Falha ao excluir.';
      }
    });
  }

  // ========= Overlay de erros =========

  getFormErrors(): string[] {
    const f = this.form;
    const msgs: string[] = [];
    const P = (c: boolean, m: string) => { if (c) msgs.push(m); };

    P(f.get('nome_loja')?.hasError('required') || false, 'Nome da loja é obrigatório.');
    P(f.get('nome_loja')?.hasError('maxlength') || false, 'Nome da loja: máx. 50 caracteres.');

    P(f.get('Apelido_loja')?.hasError('required') || false, 'Apelido é obrigatório.');
    P(f.get('Apelido_loja')?.hasError('maxlength') || false, 'Apelido: máx. 20 caracteres.');

    P(f.get('cnpj')?.hasError('required') || false, 'CNPJ é obrigatório.');
    P(f.get('cnpj')?.hasError('cnpj') || false, 'CNPJ inválido.');

    P(f.get('email')?.hasError('email') || false, 'Email inválido.');

    P(f.get('numero')?.hasError('maxlength') || false, 'Número: máx. 10 caracteres.');

    P(f.get('Telefone1')?.hasError('phone') || false, 'Telefone 1: formato (99)-99999-9999.');
    P(f.get('Telefone2')?.hasError('phone') || false, 'Telefone 2: formato (99)-99999-9999.');

    // erros vindos do backend
    [
      'nome_loja','Apelido_loja','cnpj','email',
      'Logradouro','Endereco','numero','Complemento',
      'Cep','Bairro','Cidade',
      'Telefone1','Telefone2',
      'ContaContabil','DataAbertura','DataEnceramento',
      'EstoqueNegativo','Rede','Matriz'
    ].forEach(field => {
      const err = f.get(field)?.errors?.['server'];
      if (err) msgs.push(`${field}: ${err}`);
    });

    return msgs;
  }

  openErrorOverlayIfNeeded(): void {
    const has = this.getFormErrors().length > 0;
    this.errorOverlayOpen = has;
  }
  closeErrorOverlay(): void {
    this.errorOverlayOpen = false;
  }
}
