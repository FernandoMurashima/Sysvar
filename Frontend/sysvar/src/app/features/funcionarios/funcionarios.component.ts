import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FuncionariosService } from '../../core/services/funcionarios.service';
import { Funcionario } from '../../core/models/funcionario';

import { LojasService } from '../../core/services/lojas.service';
import { Loja } from '../../core/models/loja';

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
  private lojasApi = inject(LojasService);

  loading = false;
  saving = false;
  submitted = false;

  successMsg = '';
  errorMsg = '';

  showForm = false;
  errorOverlayOpen = false;

  funcionarios: Funcionario[] = [];
  lojas: Loja[] = [];
  lojasMap: Record<number, string> = {};

  search = '';
  editingId: number | null = null;

  categoriaOptions: Funcionario['categoria'][] = [
    'Tecnico','Caixa','Gerente','Vendedor','Assistente','Auxiliar','Diretoria'
  ];

  form = this.fb.group({
    nomefuncionario: ['', [Validators.required, Validators.maxLength(50)]],
    apelido: ['', [Validators.required, Validators.maxLength(20)]],
    cpf: ['', [this.cpfValidator]],

    inicio: [''],
    fim: [''],

    categoria: ['Vendedor', [Validators.required]],
    meta: [0, [Validators.min(0)]],

    // vínculo obrigatório com a loja
    idloja: [null as unknown as number, [Validators.required]],
  });

  ngOnInit(): void {
    this.load();
    this.loadLojas();
  }

  /** CPF opcional; aceita “000.000.000-00” como especial */
  cpfValidator(control: AbstractControl): ValidationErrors | null {
    const raw = (control.value || '').toString().trim();
    if (!raw) return null;
    const only = raw.replace(/[^\d]/g, '');
    if (only.length !== 11) return { cpf: true };
    if (only === '00000000000') return null;
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

  // ======= Loads =======
  load() {
    this.loading = true;
    this.errorMsg = '';
    this.api.list({ search: this.search, ordering: '-data_cadastro' }).subscribe({
      next: (data) => { this.funcionarios = Array.isArray(data) ? data : (data as any).results ?? []; },
      error: (err) => { this.errorMsg = 'Falha ao carregar funcionários.'; console.error(err); },
      complete: () => this.loading = false
    });
  }

  loadLojas() {
    this.lojasApi.list({ ordering: 'nome_loja' }).subscribe({
      next: (data) => {
        this.lojas = Array.isArray(data) ? data : (data as any).results ?? [];
        this.lojasMap = {};
        for (const l of this.lojas as any[]) {
          const id = this.getLojaId(l);
          if (id != null) this.lojasMap[id] = l.nome_loja ?? 'Loja';
        }
      },
      error: (err) => { console.error('Falha ao carregar lojas', err); }
    });
  }

  // ======= Helpers para o template (evitam ?? e Number() no HTML) =======
  getLojaId(l: any): number | null {
    if (!l) return null;
    if (l.Idloja !== undefined && l.Idloja !== null) return Number(l.Idloja);
    if (l.Idloja !== undefined && l.Idloja !== null) return Number(l.Idloja);
    if (l.id !== undefined && l.id !== null) return Number(l.id);
    if (l['Idloja'] !== undefined && l['Idloja'] !== null) return Number(l['Idloja']);
    return null;
  }

  lojaNameById(id: any): string {
    const num = id === null || id === undefined || id === '' ? NaN : Number(id);
    if (!isNaN(num) && this.lojasMap[num]) return this.lojasMap[num];
    return id != null ? String(id) : '';
  }

  onSearchKeyup(ev: KeyboardEvent) { if (ev.key === 'Enter') this.load(); }
  doSearch() { this.load(); }
  clearSearch() { this.search = ''; this.load(); }

  // ======= Form =======
  novo() {
    this.editingId = null;
    this.submitted = false;
    this.showForm = true;
    this.errorOverlayOpen = false;

    this.form.reset({
      nomefuncionario: '',
      apelido: '',
      cpf: '',
      inicio: '',
      fim: '',
      categoria: 'Vendedor',
      meta: 0,
      idloja: null as unknown as number,
    });
    this.successMsg = '';
    this.errorMsg = '';
  }

  editar(item: Funcionario) {
    this.editingId = item.Idfuncionario ?? null;
    this.submitted = false;
    this.showForm = true;
    this.errorOverlayOpen = false;

    const lojaId =
      (item as any).idloja && typeof (item as any).idloja === 'object'
        ? this.getLojaId((item as any).idloja)
        : (item as any).idloja ?? null;

    this.form.patchValue({
      nomefuncionario: item.nomefuncionario ?? '',
      apelido: item.apelido ?? '',
      cpf: item.cpf ?? '',
      inicio: item.inicio ?? '',
      fim: item.fim ?? '',
      categoria: item.categoria ?? 'Vendedor',
      meta: item.meta ?? 0,
      idloja: lojaId,
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

  private normalizePayload(raw: any): Funcionario {
    const toNull = (v: any) => (v === '' || v === null || v === undefined ? null : v);
    const numeric = (v: any) => {
      if (v === '' || v === null || v === undefined) return 0;
      const n = Number(v);
      return isNaN(n) ? 0 : n;
    };

    return {
      nomefuncionario: (raw.nomefuncionario ?? '').trim(),
      apelido: (raw.apelido ?? '').trim(),
      cpf: (raw.cpf ?? '').trim() || undefined,

      inicio: toNull(raw.inicio) as any,
      fim: toNull(raw.fim) as any,

      categoria: raw.categoria,
      meta: numeric(raw.meta),

      idloja: Number(raw.idloja),
    } as Funcionario;
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
      nomefuncionario: 'Nome',
      apelido: 'Apelido',
      cpf: 'CPF',
      inicio: 'Início',
      fim: 'Fim',
      categoria: 'Categoria',
      meta: 'Meta',
      idloja: 'Loja',
    };

    const msgs: string[] = [];
    for (const key of Object.keys(this.form.controls)) {
      const c = this.form.get(key);
      if (!c || !c.errors) continue;
      const label = labels[key] ?? key;

      if (c.errors['required']) msgs.push(`${label}: faltando informação.`);
      if (c.errors['maxlength']) msgs.push(`${label}: fora do padrão (tamanho acima do permitido).`);
      if (c.errors['min']) msgs.push(`${label}: fora do padrão (não pode ser negativo).`);
      if (c.errors['cpf']) msgs.push(`CPF: fora do padrão (dígitos inválidos).`);
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

    const payload: Funcionario = this.normalizePayload(this.form.value as any);

    const req$ = this.editingId
      ? this.api.update(this.editingId, payload)
      : this.api.create(payload);

    req$.subscribe({
      next: () => {
        this.successMsg = this.editingId ? 'Funcionário atualizado com sucesso.' : 'Funcionário criado com sucesso.';
        this.load();
        this.cancelarEdicao(); // fecha o form e volta ao estado inicial
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

  excluir(item: Funcionario) {
    if (!item.Idfuncionario) return;
    const ok = confirm(`Excluir o funcionário "${item.nomefuncionario}"?`);
    if (!ok) return;

    this.api.remove(item.Idfuncionario).subscribe({
      next: () => {
        this.successMsg = 'Funcionário excluído.';
        this.load();
        if (this.editingId === item.Idfuncionario) this.cancelarEdicao();
      },
      error: (err) => {
        console.error(err);
        this.errorMsg = 'Falha ao excluir.';
      }
    });
  }
}
