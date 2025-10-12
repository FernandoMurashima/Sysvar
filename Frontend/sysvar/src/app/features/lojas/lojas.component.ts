import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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

  loading = false;
  saving = false;
  submitted = false;

  successMsg = '';
  errorMsg = '';

  showForm = false;
  errorOverlayOpen = false;

  lojas: Loja[] = [];
  search = '';
  editingId: number | null = null;

  logradouroOptions = ['Rua','Avenida','Praça','Travessa','Beco','Alameda'];

  form = this.fb.group({
    nome_loja: ['', [Validators.required, Validators.maxLength(50)]],
    Apelido_loja: ['', [Validators.required, Validators.maxLength(20)]],
    // ← valida CNPJ e aceita "00.000.000/0000-00" (ou 14 zeros sem máscara)
    cnpj: ['', [Validators.required, this.cnpjValidator]],

    Logradouro: [this.logradouroOptions[0]],
    Endereco: [''],
    numero: ['', [Validators.maxLength(10)]],
    Complemento: [''],

    Cep: [''],
    Bairro: [''],
    Cidade: [''],

    Telefone1: ['', [this.phoneValidator]],
    Telefone2: ['', [this.phoneValidator]],
    email: ['', [Validators.email]],

    EstoqueNegativo: ['NAO'],
    Rede: ['NAO'],
    DataAbertura: [''],
    ContaContabil: [''],
    DataEnceramento: [''],
    Matriz: ['NAO'],
  });

  ngOnInit(): void { this.load(); }

  // ========= Validadores =========

  /** Valida CNPJ com/sem máscara. Aceita 14 dígitos válidos.
   *  Exceção: aceita explicitamente "00.000.000/0000-00" (14 zeros).
   */
  cnpjValidator(control: AbstractControl): ValidationErrors | null {
    const raw = (control.value || '').toString().trim();
    if (!raw) return null; // vazio permitido (obrigatoriedade é do required)

    // somente dígitos
    const only = raw.replace(/[^\d]/g, '');
    if (only.length !== 14) return { cnpj: true };

    // exceção: 14 zeros são aceitos
    if (only === '00000000000000') return null;

    // reprova sequências repetidas
    if (/^(\d)\1{13}$/.test(only)) return { cnpj: true };

    // cálculo dos DVs
    const calc = (base: string, pesos: number[]) => {
      let soma = 0;
      for (let i = 0; i < pesos.length; i++) soma += parseInt(base[i], 10) * pesos[i];
      const resto = soma % 11;
      return (resto < 2) ? 0 : 11 - resto;
    };
    const d1 = calc(only.slice(0, 12), [5,4,3,2,9,8,7,6,5,4,3,2]);
    const d2 = calc(only.slice(0, 12) + d1, [6,5,4,3,2,9,8,7,6,5,4,3,2]);

    return (d1 === parseInt(only[12], 10) && d2 === parseInt(only[13], 10)) ? null : { cnpj: true };
  }

  /** Telefone (99)-99999-9999 */
  phoneValidator(control: AbstractControl): ValidationErrors | null {
    const v = (control.value || '').toString().trim();
    if (!v) return null;
    const ok = /^\(\d{2}\)-\d{5}-\d{4}$/.test(v);
    return ok ? null : { phone: true };
  }

  // máscara para telefone
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

  // ========= Lista =========
  load() {
    this.loading = true;
    this.errorMsg = '';
    this.api.list({ search: this.search, ordering: '-data_cadastro' }).subscribe({
      next: (data) => { this.lojas = Array.isArray(data) ? data : (data as any).results ?? []; },
      error: (err) => { this.errorMsg = 'Falha ao carregar lojas.'; console.error(err); },
      complete: () => this.loading = false
    });
  }
  onSearchKeyup(ev: KeyboardEvent) { if (ev.key === 'Enter') this.load(); }
  doSearch() { this.load(); }
  clearSearch() { this.search = ''; this.load(); }

  // ========= Form CRUD =========
  novo() {
    this.editingId = null;
    this.submitted = false;
    this.showForm = true;
    this.errorOverlayOpen = false;

    this.form.reset({
      nome_loja: '',
      Apelido_loja: '',
      cnpj: '',
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
      EstoqueNegativo: 'NAO',
      Rede: 'NAO',
      DataAbertura: '',
      ContaContabil: '',
      DataEnceramento: '',
      Matriz: 'NAO',
    });
    this.successMsg = '';
    this.errorMsg = '';
  }

  editar(item: Loja) {
    this.editingId = item.Idloja ?? null;
    this.submitted = false;
    this.showForm = true;
    this.errorOverlayOpen = false;

    this.form.patchValue({
      nome_loja: item.nome_loja ?? '',
      Apelido_loja: item.Apelido_loja ?? '',
      cnpj: item.cnpj ?? '',
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
      EstoqueNegativo: (item.EstoqueNegativo ?? 'NAO') || 'NAO',
      Rede: (item.Rede ?? 'NAO') || 'NAO',
      DataAbertura: item.DataAbertura ?? '',
      ContaContabil: item.ContaContabil ?? '',
      DataEnceramento: item.DataEnceramento ?? '',
      Matriz: (item.Matriz ?? 'NAO') || 'NAO',
    });
    this.successMsg = '';
    this.errorMsg = '';
  }

  cancelarEdicao() {
    this.showForm = false;
    this.editingId = null;
    this.submitted = false;
    this.errorOverlayOpen = false;
    this.form.reset();
  }

  private normalizePayload(raw: any): Loja {
    const toNull = (v: any) => (v === '' ? null : v);
    const yn = (v: any) => (String(v || 'NAO').toUpperCase() === 'SIM' ? 'SIM' : 'NAO');

    return {
      nome_loja: (raw.nome_loja ?? '').trim(),
      Apelido_loja: (raw.Apelido_loja ?? '').trim(),
      cnpj: (raw.cnpj ?? '').trim(),

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

      EstoqueNegativo: yn(raw.EstoqueNegativo),
      Rede: yn(raw.Rede),
      DataAbertura: toNull(raw.DataAbertura),
      ContaContabil: toNull(raw.ContaContabil),
      DataEnceramento: toNull(raw.DataEnceramento),
      Matriz: yn(raw.Matriz),
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

  getFormErrors(): string[] {
    const labels: Record<string, string> = {
      nome_loja: 'Nome da Loja',
      Apelido_loja: 'Apelido',
      cnpj: 'CNPJ',
      email: 'Email',
      Telefone1: 'Telefone 1',
      Telefone2: 'Telefone 2',
      numero: 'Número',
      Endereco: 'Endereço',
      Cidade: 'Cidade',
      Bairro: 'Bairro',
      Cep: 'CEP',
      ContaContabil: 'Conta Contábil',
      DataAbertura: 'Data de Abertura',
      DataEnceramento: 'Data de Encerramento',
      Logradouro: 'Logradouro',
      Complemento: 'Complemento',
      EstoqueNegativo: 'Estoque Negativo',
      Rede: 'Rede',
      Matriz: 'Matriz',
    };

    const msgs: string[] = [];
    for (const key of Object.keys(this.form.controls)) {
      const c = this.form.get(key);
      if (!c || !c.errors) continue;
      const label = labels[key] ?? key;

      if (c.errors['required']) msgs.push(`${label}: faltando informação.`);
      if (c.errors['maxlength']) msgs.push(`${label}: fora do padrão (tamanho acima do permitido).`);
      if (c.errors['email']) msgs.push(`Email: fora do padrão (formato inválido).`);
      if (c.errors['cnpj']) msgs.push(`CNPJ: fora do padrão (dígitos inválidos).`);
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
      this.errorOverlayOpen = true;
      return;
    }

    this.saving = true;
    this.errorMsg = '';
    this.successMsg = '';
    this.errorOverlayOpen = false;

    const payload: Loja = this.normalizePayload(this.form.value as any);

    const req$ = this.editingId
      ? this.api.update(this.editingId, payload)
      : this.api.create(payload);

    req$.subscribe({
      next: () => {
        this.successMsg = this.editingId ? 'Loja atualizada com sucesso.' : 'Loja criada com sucesso.';
        this.load();
        this.cancelarEdicao();    // volta ao estado inicial (sem form aberto)
        this.saving = false;
        this.submitted = false;
      },
      error: (err) => {
        console.error(err);
        this.applyBackendErrors(err);
        this.saving = false;
        this.scrollToFirstInvalid();
        this.errorOverlayOpen = this.getFormErrors().length > 0;
        if (!this.errorOverlayOpen) this.errorMsg = 'Não foi possível salvar. Tente novamente.';
      }
    });
  }

  excluir(item: Loja) {
    if (!item.Idloja) return;
    const ok = confirm(`Excluir a loja "${item.nome_loja}"?`);
    if (!ok) return;

    this.api.remove(item.Idloja).subscribe({
      next: () => {
        this.successMsg = 'Loja excluída.';
        this.load();
        if (this.editingId === item.Idloja) this.cancelarEdicao();
      },
      error: (err) => {
        console.error(err);
        this.errorMsg = 'Falha ao excluir.';
      }
    });
  }
}
