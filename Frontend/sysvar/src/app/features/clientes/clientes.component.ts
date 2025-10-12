import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ClientesService } from '../../core/services/clientes.service';
import { Cliente } from '../../core/models/clientes';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink] ,
  templateUrl: './clientes.component.html',
  styleUrls: ['./clientes.component.css']
})
export class ClientesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ClientesService);

  loading = false;
  saving = false;
  submitted = false;
  errorMsg = '';
  successMsg = '';

  showForm = false;          // controla exibição do formulário
  errorOverlayOpen = false;  // overlay central de erros

  clientes: Cliente[] = [];
  search = '';
  editingId: number | null = null;

  // opções
  logradouroOptions = ['Rua','Avenida','Praça','Travessa','Beco','Alameda'];
  categoriaOptions = ['A','B','C','D','E']; // opções do select Categoria

  form = this.fb.group({
    Nome_cliente: ['', [Validators.required, Validators.maxLength(50)]],
    Apelido: ['', [Validators.required, Validators.maxLength(18)]],
    cpf: ['', [Validators.required, this.cpfValidator]],
    Logradouro: [this.logradouroOptions[0]],
    Endereco: [''],
    numero: ['', [Validators.maxLength(7)]],
    Complemento: [''],
    Cep: [''],
    Bairro: [''],
    Cidade: [''],
    email: ['', [Validators.email]],
    Telefone1: ['', [this.phoneValidator]],
    Telefone2: ['', [this.phoneValidator]],
    Categoria: ['C', Validators.required], // obrigatório, padrão “C”
    Bloqueio: [false],
    Aniversario: [''],
    MalaDireta: [false],
    ContaContabil: [''],
  });

  ngOnInit(): void { this.load(); }

  // ========= VALIDADORES =========
  /** Valida CPF (com ou sem máscara). Aceita 000.000.000-00. */
  cpfValidator(control: AbstractControl): ValidationErrors | null {
    const raw = (control.value || '').toString().trim();
    if (!raw) return null; // vazio permitido (o required trata obrigatoriedade)
    const only = raw.replace(/[^\d]/g, '');
    if (only.length !== 11) return { cpf: true };
    if (only === '00000000000') return null; // exceção aceita
    if (/^(\d)\1{10}$/.test(only)) return { cpf: true };
    const calcDV = (base: string, factor: number) => {
      let sum = 0;
      for (let i = 0; i < base.length; i++) sum += parseInt(base[i], 10) * (factor - i);
      const mod = (sum * 10) % 11;
      return mod === 10 ? 0 : mod;
    };
    const dv1 = calcDV(only.substring(0, 9), 10);
    const dv2 = calcDV(only.substring(0, 10), 11);
    return (dv1 === parseInt(only[9], 10) && dv2 === parseInt(only[10], 10)) ? null : { cpf: true };
  }

  /** Valida telefone no formato (99)-99999-9999. */
  phoneValidator(control: AbstractControl): ValidationErrors | null {
    const v = (control.value || '').toString().trim();
    if (!v) return null;
    const ok = /^\(\d{2}\)-\d{5}-\d{4}$/.test(v);
    return ok ? null : { phone: true };
  }

  // máscara simples para telefone
  onPhoneInput(controlName: 'Telefone1' | 'Telefone2') {
    const ctrl = this.form.get(controlName);
    if (!ctrl) return;
    const digits = (ctrl.value || '').toString().replace(/\D/g, '').slice(0, 11);
    let out = digits;
    if (digits.length >= 1) {
      const d = digits.padEnd(11, '_').split('');
      out = `(${d[0]}${d[1]})-${d[2]}${d[3]}${d[4]}${d[5]}${d[6]}-${d[7]}${d[8]}${d[9]}${d[10]}`.replace(/_/g, '');
    }
    ctrl.setValue(out, { emitEvent: false });
  }

  // ========= LISTAGEM =========
  load() {
    this.loading = true;
    this.errorMsg = '';
    this.api.list({ search: this.search, ordering: '-data_cadastro' }).subscribe({
      next: (data) => { this.clientes = Array.isArray(data) ? data : (data as any).results ?? []; },
      error: (err) => { this.errorMsg = 'Falha ao carregar clientes.'; console.error(err); },
      complete: () => this.loading = false
    });
  }

  onSearchKeyup(ev: KeyboardEvent) { if (ev.key === 'Enter') this.load(); }
  doSearch() { this.load(); }
  clearSearch() { this.search = ''; this.load(); }

  // ========= FORM / CRUD =========
  novo() {
    this.editingId = null;
    this.submitted = false;
    this.showForm = true;           // abre o formulário
    this.errorOverlayOpen = false;

    this.form.reset({
      Nome_cliente: '',
      Apelido: '',
      cpf: '',
      Logradouro: this.logradouroOptions[0],
      Endereco: '',
      numero: '',
      Complemento: '',
      Cep: '',
      Bairro: '',
      Cidade: '',
      Telefone1: '',
      Telefone2: '',
      email: '',
      Categoria: 'C', // padrão “C”
      Bloqueio: false,
      Aniversario: '',
      MalaDireta: false,
      ContaContabil: '',
    });
    this.successMsg = '';
    this.errorMsg = '';
  }

  editar(item: Cliente) {
    this.editingId = item.Idcliente ?? null;
    this.submitted = false;
    this.showForm = true;          // abre o formulário para edição
    this.errorOverlayOpen = false;

    this.form.patchValue({
      Nome_cliente: item.Nome_cliente ?? '',
      Apelido: item.Apelido ?? '',
      cpf: item.cpf ?? '',
      Logradouro: item.Logradouro ?? this.logradouroOptions[0],
      Endereco: item.Endereco ?? '',
      numero: item.numero ?? '',
      Complemento: item.Complemento ?? '',
      Cep: item.Cep ?? '',
      Bairro: item.Bairro ?? '',
      Cidade: item.Cidade ?? '',
      Telefone1: item.Telefone1 ?? '',
      Telefone2: item.Telefone2 ?? '',
      email: item.email ?? '',
      Categoria: this.categoriaOptions.includes(item.Categoria ?? '') ? item.Categoria : 'C', // fallback “C”
      Bloqueio: !!item.Bloqueio,
      Aniversario: (item.Aniversario ?? ''),
      MalaDireta: !!item.MalaDireta,
      ContaContabil: item.ContaContabil ?? '',
    });
    this.successMsg = '';
    this.errorMsg = '';
  }

  cancelarEdicao() {
    this.showForm = false;         // ← esconde o formulário
    this.editingId = null;
    this.submitted = false;
    this.errorOverlayOpen = false;
    this.form.reset();
  }

  // normaliza payload para o backend
  private normalizePayload(raw: any): Cliente {
    const toNull = (v: any) => (v === '' ? null : v);
    // Categoria segura: só A–E; se vier algo diferente, usa “C”
    const cat = (raw.Categoria ?? 'C').toString().trim().toUpperCase();
    const categoriaSafe = this.categoriaOptions.includes(cat) ? cat : 'C';

    return {
      Nome_cliente: (raw.Nome_cliente ?? '').trim(),
      Apelido: (raw.Apelido ?? '').trim(),
      cpf: (raw.cpf ?? '').trim(),
      Logradouro: toNull(raw.Logradouro),
      Endereco: toNull(raw.Endereco),
      numero: toNull(raw.numero),
      Complemento: toNull(raw.Complemento),
      Cep: toNull(raw.Cep),
      Bairro: toNull(raw.Bairro),
      Cidade: toNull(raw.Cidade),
      Telefone1: toNull(raw.Telefone1),
      Telefone2: toNull(raw.Telefone2),
      email: toNull(raw.email),
      Categoria: categoriaSafe,
      Bloqueio: !!raw.Bloqueio,
      Aniversario: toNull(raw.Aniversario),
      MalaDireta: !!raw.MalaDireta,
      ContaContabil: toNull(raw.ContaContabil),
    };
  }

  private scrollToFirstInvalid(): void {
    for (const key of Object.keys(this.form.controls)) {
      const ctrl = this.form.get(key);
      if (ctrl && ctrl.invalid) {
        const el = document.querySelector(`[formControlName="${key}"]`) as HTMLElement | null;
        if (el?.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (el as HTMLInputElement | null)?.focus?.();
        break;
      }
    }
  }

  private applyBackendErrors(err: any) {
    const be = err?.error;
    if (!be || typeof be !== 'object') return;
    Object.keys(be).forEach((key) => {
      const ctrl = this.form.get(key);
      const val = Array.isArray(be[key]) ? be[key].join(' ') : String(be[key]);
      if (ctrl) {
        const current = ctrl.errors || {};
        ctrl.setErrors({ ...current, server: val || 'Valor inválido' });
      }
    });
  }

  // Mapeia erros atuais do formulário para mensagens didáticas no overlay
  getFormErrors(): string[] {
    const labels: Record<string, string> = {
      Nome_cliente: 'Nome',
      Apelido: 'Apelido',
      cpf: 'CPF',
      email: 'Email',
      Telefone1: 'Telefone 1',
      Telefone2: 'Telefone 2',
      numero: 'Número',
      Endereco: 'Endereço',
      Cidade: 'Cidade',
      Bairro: 'Bairro',
      Cep: 'CEP',
      ContaContabil: 'Conta Contábil',
      Categoria: 'Categoria',
      Aniversario: 'Aniversário',
      Logradouro: 'Logradouro',
      Complemento: 'Complemento',
    };

    const msgs: string[] = [];
    for (const key of Object.keys(this.form.controls)) {
      const c = this.form.get(key);
      if (!c || !c.errors) continue;
      const label = labels[key] ?? key;

      if (c.errors['required']) msgs.push(`${label}: faltando informação.`);
      if (c.errors['maxlength']) msgs.push(`${label}: fora do padrão (tamanho acima do permitido).`);
      if (c.errors['email']) msgs.push(`Email: fora do padrão (formato inválido).`);
      if (c.errors['cpf']) msgs.push(`CPF: fora do padrão (dígitos inválidos).`);
      if (c.errors['phone']) msgs.push(`${label}: fora do padrão (use (99)-99999-9999).`);
      if (c.errors['server']) msgs.push(`${label}: ${c.errors['server']}`);
    }
    return msgs;
  }

  closeErrorOverlay() { this.errorOverlayOpen = false; }

  salvar() {
    this.submitted = true;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.scrollToFirstInvalid();
      this.errorOverlayOpen = true; // abre overlay central de erros
      return;
    }

    this.saving = true;
    this.errorMsg = '';
    this.successMsg = '';
    this.errorOverlayOpen = false;

    const payload: Cliente = this.normalizePayload(this.form.value as any);

    const req$ = this.editingId
      ? this.api.update(this.editingId, payload)
      : this.api.create(payload);

    req$.subscribe({
      next: () => {
        this.successMsg = this.editingId ? 'Cliente atualizado com sucesso.' : 'Cliente criado com sucesso.';
        this.load();
        this.cancelarEdicao(); // ← volta ao estado inicial (SEM formulário)
        this.saving = false;
        this.submitted = false;
      },
      error: (err) => {
        console.error(err);
        this.applyBackendErrors(err);
        this.saving = false;
        this.scrollToFirstInvalid();
        this.errorOverlayOpen = this.getFormErrors().length > 0;
        if (!this.errorOverlayOpen) {
          this.errorMsg = 'Não foi possível salvar. Tente novamente.';
        }
      }
    });
  }

  excluir(item: Cliente) {
    if (!item.Idcliente) return;
    const ok = confirm(`Excluir o cliente "${item.Nome_cliente}"?`);
    if (!ok) return;

    this.api.remove(item.Idcliente).subscribe({
      next: () => {
        this.successMsg = 'Cliente excluído.';
        this.load();
        if (this.editingId === item.Idcliente) this.cancelarEdicao();
      },
      error: (err) => {
        console.error(err);
        this.errorMsg = 'Falha ao excluir.';
      }
    });
  }
}
