import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { FormsModule } from '@angular/forms';

import { UsersService } from '../../core/services/users.service';
import { User } from '../../core/models/user';

// NOVO: trazer as lojas para um <select>
import { LojasService } from '../../core/services/lojas.service';

import {Router} from "@angular/router";

type Loja = {
  Idloja: number;
  nome_loja?: string;
  Apelido_loja?: string;
};

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule,],
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.css']
})
export class UsuariosComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(UsersService);
  private lojasApi = inject(LojasService); // NOVO
  constructor(private router: Router) {}

  goHome() {
    this.router.navigate(['/home']);
  }

  loading = false;
  saving = false;
  submitted = false;

  successMsg = '';
  errorMsg = '';

  showForm = false;
  errorOverlayOpen = false;

  usuarios: User[] = [];
  lojas: Loja[] = []; // NOVO
  search = '';
  editingId: number | null = null;

  typeOptions: User['type'][] = ['Regular','Caixa','Gerente','Admin','Auxiliar','Assistente'];

  form = this.fb.group({
    username: ['', [Validators.required, Validators.maxLength(150), this.usernameValidator]],
    first_name: [''],
    last_name: [''],
    email: ['', [Validators.email]],
    type: ['Regular', [Validators.required]],
    Idloja: [null],          // NOVO: loja do usuário (opcional; torne required se quiser)
    password: [''],          // obrigatória somente no create
    confirm_password: [''],  // só no front
  });

  ngOnInit(): void {
    this.load();
    this.loadLojas(); // NOVO
  }

  private loadLojas() {
    this.lojasApi.list({ ordering: 'nome_loja' }).subscribe({
      next: (res: any) => {
        this.lojas = Array.isArray(res) ? res : (res?.results ?? []);
      },
      error: (err) => {
        console.error(err);
        // mantém silencioso; o campo ficará vazio se falhar
      }
    });
  }

  usernameValidator(control: AbstractControl): ValidationErrors | null {
    const v = (control.value || '').toString().trim();
    if (!v) return null;
    const ok = /^[A-Za-z0-9_.-]+$/.test(v);
    return ok ? null : { username: true };
  }

  onSearchKeyup(ev: KeyboardEvent) { if (ev.key === 'Enter') this.load(); }
  doSearch() { this.load(); }
  clearSearch() { this.search = ''; this.load(); }

  load() {
    this.loading = true;
    this.errorMsg = '';
    this.api.list({ search: this.search, ordering: '-id' }).subscribe({
      next: (data) => { this.usuarios = Array.isArray(data) ? data : (data as any).results ?? []; },
      error: (err) => { this.errorMsg = 'Falha ao carregar usuários.'; console.error(err); },
      complete: () => this.loading = false
    });
  }

  novo() {
    this.editingId = null;
    this.submitted = false;
    this.showForm = true;
    this.errorOverlayOpen = false;

    this.form.reset({
      username: '',
      first_name: '',
      last_name: '',
      email: '',
      type: 'Regular',
      Idloja: null,       // limpa loja
      password: '',
      confirm_password: '',
    });
    this.successMsg = '';
    this.errorMsg = '';
  }

  editar(item: User) {
    this.editingId = item.id ?? null;
    this.submitted = false;
    this.showForm = true;
    this.errorOverlayOpen = false;

    this.form.patchValue({
      username: item.username ?? '',
      first_name: item.first_name ?? '',
      last_name: item.last_name ?? '',
      email: item.email ?? '',
      type: item.type ?? 'Regular',
      Idloja: (item as any).Idloja ?? null, // pré-carrega loja, se vier do backend
      password: '',
      confirm_password: '',
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

  private normalizePayload(raw: any): any {
    const payload: any = {
      username: (raw.username ?? '').trim(),
      first_name: (raw.first_name ?? '').trim() || undefined,
      last_name: (raw.last_name ?? '').trim() || undefined,
      email: (raw.email ?? '').trim() || undefined,
      type: raw.type as User['type'],
    };
    if (raw.Idloja != null && raw.Idloja !== '') payload.Idloja = Number(raw.Idloja); // envia só se setado
    const pwd = (raw.password ?? '').trim();
    if (pwd) payload.password = pwd;
    return payload;
  }

  private validatePasswordPair(): string | null {
    const pwd = (this.form.get('password')?.value || '').toString();
    const conf = (this.form.get('confirm_password')?.value || '').toString();
    if (pwd || conf) {
      if (pwd.length < 6) return 'Senha: mínimo 6 caracteres.';
      if (pwd !== conf) return 'Senha/Confirmação: não conferem.';
    } else if (!this.editingId) {
      return 'Senha: obrigatória no cadastro.';
    }
    return null;
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
      } else {
        this.errorMsg = val || this.errorMsg;
      }
    });
  }

  getFormErrors(): string[] {
    const labels: Record<string, string> = {
      username: 'Usuário',
      first_name: 'Nome',
      last_name: 'Sobrenome',
      email: 'Email',
      type: 'Tipo',
      Idloja: 'Loja',
      password: 'Senha',
    };
    const msgs: string[] = [];
    for (const key of Object.keys(this.form.controls)) {
      const c = this.form.get(key);
      if (!c || !c.errors) continue;
      const label = labels[key] ?? key;

      if (c.errors['required']) msgs.push(`${label}: faltando informação.`);
      if (c.errors['maxlength']) msgs.push(`${label}: fora do padrão (tamanho acima do permitido).`);
      if (c.errors['email']) msgs.push(`Email: formato inválido.`);
      if (c.errors['username']) msgs.push(`Usuário: use só letras, números, . _ - (sem espaços).`);
      if (c.errors['server']) msgs.push(`${label}: ${c.errors['server']}`);
    }
    const pwdPair = this.validatePasswordPair();
    if (pwdPair) msgs.push(pwdPair);
    return msgs;
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

  closeErrorOverlay() { this.errorOverlayOpen = false; }

  salvar() {
    this.submitted = true;

    const pwdPairMsg = this.validatePasswordPair();
    if (pwdPairMsg) {
      const current = this.form.get('password')?.errors || {};
      this.form.get('password')?.setErrors({ ...current, pair: true });
    }

    if (this.form.invalid || !!pwdPairMsg) {
      this.form.markAllAsTouched();
      this.scrollToFirstInvalid();
      this.errorOverlayOpen = true;
      return;
    }

    this.saving = true;
    this.errorMsg = '';
    this.successMsg = '';
    this.errorOverlayOpen = false;

    const payload = this.normalizePayload(this.form.value);

    const req$ = this.editingId
      ? this.api.update(this.editingId, payload)
      : this.api.create(payload as User);

    req$.subscribe({
      next: () => {
        this.successMsg = this.editingId ? 'Usuário atualizado com sucesso.' : 'Usuário criado com sucesso.';
        this.load();
        this.cancelarEdicao();
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

  excluir(item: User) {
    if (!item.id) return;
    const ok = confirm(`Excluir o usuário "${item.username}"?`);
    if (!ok) return;

    this.api.remove(item.id).subscribe({
      next: () => {
        this.successMsg = 'Usuário excluído.';
        this.load();
        if (this.editingId === item.id) this.cancelarEdicao();
      },
      error: (err) => {
        console.error(err);
        this.errorMsg = 'Falha ao excluir.';
      }
    });
  }
}
