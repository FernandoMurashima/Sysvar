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

// Ajuste os paths conforme seu projeto
import { ClientesService } from '../../core/services/clientes.service';
import { Cliente } from '../../core/models/clientes';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './clientes.component.html',
  styleUrls: ['./clientes.component.css']
})
export class ClientesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ClientesService);

  // ======== Estado geral UI ========
  loading = false;
  saving = false;
  submitted = false;
  showForm = false;
  editingId: number | null = null;

  search = '';
  successMsg = '';
  errorOverlayOpen = false;

  // ======== Form ========
  form: FormGroup = this.fb.group({
    Nome_cliente: ['', [Validators.required, Validators.maxLength(50)]],
    Apelido: ['', [Validators.required, Validators.maxLength(18)]],
    cpf: ['', [Validators.required, this.cpfValidator]],
    email: ['', [Validators.email]],

    Logradouro: ['Rua'],
    Endereco: [''],
    numero: ['', [Validators.maxLength(7)]],
    Complemento: [''],

    Cep: [''],
    Bairro: [''],
    Cidade: [''],

    Telefone1: ['', [this.phoneValidator]],
    Telefone2: ['', [this.phoneValidator]],

    Categoria: ['', [Validators.required]],
    ContaContabil: [''],
    Aniversario: [''],

    Bloqueio: [false],
    MalaDireta: [false],
  });

  // Opções (usadas no template)
  logradouroOptions: string[] = ['Rua', 'Avenida', 'Travessa', 'Alameda', 'Praça', 'Rodovia', 'Estrada', 'Largo', 'Viela'];
  categoriaOptions: string[] = ['Padrão', 'VIP', 'Atacado', 'Varejo']; // ajuste se tiver fonte no backend

  // ======== Lista + ListView (client-side) ========
  clientesAll: Cliente[] = [];
  clientes: Cliente[] = [];

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

  /** CPF com/sem máscara (11 dígitos e DV) */
  cpfValidator(ctrl: AbstractControl): ValidationErrors | null {
    const raw = (ctrl.value || '').toString();
    const cpf = raw.replace(/\D/g, '');
    if (!cpf) return null; // required cuida do vazio
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

  /** Telefone: (99)-99999-9999 */
  phoneValidator(ctrl: AbstractControl): ValidationErrors | null {
    const v: string = (ctrl.value || '').toString().trim();
    if (!v) return null;
    return /^\(\d{2}\)-\d{5}-\d{4}$/.test(v) ? null : { phone: true };
  }

  onPhoneInput(field: 'Telefone1' | 'Telefone2'): void {
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
    out += rest.length <= 5 ? rest : `${rest.slice(0, 5)}-${rest.slice(5, 9)}`;
    ctrl.setValue(out, { emitEvent: false });
  }

  // ========= Fluxo ========

  load(): void {
    this.loading = true;
    this.api.list({ search: this.search, page_size: 2000 }).subscribe({
      next: (res: any) => {
        // normaliza resposta: [] ou {results:[]}
        const arr: Cliente[] = Array.isArray(res) ? res : (res?.results ?? []);
        this.clientesAll = arr;
        this.total = (res && typeof res === 'object' && typeof res.count === 'number') ? res.count : arr.length;
        this.page = 1;
        this.applyPage();
        this.loading = false;
      },
      error: (err) => {
        console.error('Falha ao carregar clientes', err);
        this.clientesAll = [];
        this.clientes = [];
        this.total = 0;
        this.loading = false;
      }
    });
  }

  applyPage(): void {
    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.clientes = this.clientesAll.slice(start, end);
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

  novo(): void {
    this.showForm = true;
    this.editingId = null;
    this.submitted = false;
    this.successMsg = '';

    this.form.reset({
      Nome_cliente: '',
      Apelido: '',
      cpf: '',
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

      Categoria: '',
      ContaContabil: '',
      Aniversario: '',

      Bloqueio: false,
      MalaDireta: false,
    });
  }

  editar(row: Cliente): void {
    this.showForm = true;
    this.editingId = (row as any).Idcliente ?? null;
    this.submitted = false;
    this.successMsg = '';

    this.form.reset({
      Nome_cliente:  (row as any).Nome_cliente ?? '',
      Apelido:       (row as any).Apelido ?? '',
      cpf:           (row as any).cpf ?? '',
      email:         (row as any).email ?? '',

      Logradouro:    (row as any).Logradouro ?? 'Rua',
      Endereco:      (row as any).Endereco ?? '',
      numero:        (row as any).numero ?? '',
      Complemento:   (row as any).Complemento ?? '',

      Cep:           (row as any).Cep ?? '',
      Bairro:        (row as any).Bairro ?? '',
      Cidade:        (row as any).Cidade ?? '',

      Telefone1:     (row as any).Telefone1 ?? '',
      Telefone2:     (row as any).Telefone2 ?? '',

      Categoria:     (row as any).Categoria ?? '',
      ContaContabil: (row as any).ContaContabil ?? '',
      Aniversario:   (row as any).Aniversario ?? '',

      Bloqueio:      !!(row as any).Bloqueio,
      MalaDireta:    !!(row as any).MalaDireta,
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
        this.successMsg = this.editingId ? 'Alterações salvas com sucesso.' : 'Cliente criado com sucesso.';
        this.cancelarEdicao();
        this.page = 1;
        this.load();
      },
      error: (err) => {
        this.saving = false;
        // Mapeia mensagens de validação do backend para os campos
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

  excluir(item: Cliente): void {
    const id = (item as any).Idcliente;
    if (!id) return;
    if (!confirm(`Excluir o cliente "${(item as any).Nome_cliente}"?`)) return;

    this.api.remove(id).subscribe({
      next: () => {
        this.successMsg = 'Cliente excluído.';
        const eraUltimo = this.clientes.length === 1 && this.page > 1;
        if (eraUltimo) this.page--;
        this.load();
        if (this.editingId === id) this.cancelarEdicao();
      },
      error: (err) => console.error('Falha ao excluir cliente', err)
    });
  }

  // ========= Overlay de erros =========
  getFormErrors(): string[] {
    const f = this.form;
    const msgs: string[] = [];
    const P = (c: boolean, m: string) => { if (c) msgs.push(m); };

    P(f.get('Nome_cliente')?.hasError('required') || false, 'Nome é obrigatório.');
    P(f.get('Nome_cliente')?.hasError('maxlength') || false, 'Nome: máx. 50 caracteres.');

    P(f.get('Apelido')?.hasError('required') || false, 'Apelido é obrigatório.');
    P(f.get('Apelido')?.hasError('maxlength') || false, 'Apelido: máx. 18 caracteres.');

    P(f.get('cpf')?.hasError('required') || false, 'CPF é obrigatório.');
    P(f.get('cpf')?.hasError('cpf') || false, 'CPF inválido.');

    P(f.get('email')?.hasError('email') || false, 'Email inválido.');
    P(f.get('numero')?.hasError('maxlength') || false, 'Número: máx. 7 caracteres.');

    P(f.get('Telefone1')?.hasError('phone') || false, 'Telefone 1: formato (99)-99999-9999.');
    P(f.get('Telefone2')?.hasError('phone') || false, 'Telefone 2: formato (99)-99999-9999.');

    P(f.get('Categoria')?.hasError('required') || false, 'Categoria é obrigatória.');

    // Mensagens do backend por campo
    ['Nome_cliente','Apelido','cpf','email','Logradouro','Endereco','numero','Complemento',
     'Cep','Bairro','Cidade','Telefone1','Telefone2','Categoria','ContaContabil','Aniversario',
     'Bloqueio','MalaDireta'].forEach(field => {
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
