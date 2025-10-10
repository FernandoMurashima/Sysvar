
// src/app/features/forma-pagamentos/forma-pagamentos.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  FormaPagamentosService,
  FormaPagamentoRow,
  FormaPagamentoDetail,
  FormaPagamentoParcelaWrite,
  FormaPagamentoFiltro
} from '../../core/services/forma-pagamentos.service';

@Component({
  selector: 'app-forma-pagamentos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './forma-pagamentos.component.html',
  styleUrls: ['./forma-pagamentos.component.css']
})
export class FormaPagamentosComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(FormaPagamentosService);

  // estado
  loading = false;
  saving = false;
  errorMsg: string | null = null;
  successMsg: string | null = null;

  // lista
  rows: FormaPagamentoRow[] = [];
  total = 0;

  // busca/ordenação
  search = '';
  ordering: string = 'descricao';

  // edição
  formMode: 'create' | 'edit' | null = null;
  editId: number | null = null;
  submitted = false;

  // form reativo
  form: FormGroup = this.fb.group({
    codigo: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(10)] }),
    descricao: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(120)] }),
    ativo: new FormControl<boolean>(true, { nonNullable: true }),
    parcelas: this.fb.array<FormGroup>([])
  });

  get parcelasFA(): FormArray<FormGroup> { return this.form.get('parcelas') as FormArray<FormGroup>; }

  ngOnInit(): void {
    this.reload();
  }

  // ================= Listagem =================
  reload(): void {
    this.loading = true;
    this.errorMsg = null;
    const filtro: FormaPagamentoFiltro = {
      search: this.search?.trim() || undefined,
      ordering: this.ordering
    };
    this.api.listar(filtro).subscribe({
      next: (rows) => { this.rows = rows ?? []; this.total = this.rows.length; this.loading = false; },
      error: (err) => { this.loading = false; this.errorMsg = this.humanizeErr(err); }
    });
  }

  onSearch(value: string): void { this.search = value; this.reload(); }
  clearSearch(): void { this.search = ''; this.reload(); }
  changeOrdering(ord: string): void { this.ordering = ord; this.reload(); }

  // ================= CRUD =================
  startCreate(): void {
    this.formMode = 'create';
    this.editId = null;
    this.submitted = false;
    this.form.reset({ codigo: '', descricao: '', ativo: true });
    this.clearParcelas();
    this.addParcela();
  }

  startEdit(row: FormaPagamentoRow): void {
    const id = row.Idformapagamento ?? row.Idforma!;
    this.loading = true;
    this.errorMsg = null;
    this.api.getById(id).subscribe({
      next: (det: FormaPagamentoDetail) => {
        this.formMode = 'edit';
        this.editId = id;
        this.submitted = false;

        this.form.patchValue({
          codigo: det.codigo ?? '',
          descricao: det.descricao ?? '',
          ativo: !!det.ativo
        });

        this.clearParcelas();
        (det.parcelas ?? [])
          .slice()
          .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
          .forEach(p => this.parcelasFA.push(this.makeParcelaGroup({
            ordem: p.ordem, dias: p.dias, percentual: p.percentual, valor_fixo: p.valor_fixo
          })));

        if (this.parcelasFA.length === 0) this.addParcela();

        this.loading = false;
      },
      error: (err) => { this.loading = false; this.errorMsg = this.humanizeErr(err); }
    });
  }

  cancelEdit(): void {
    this.formMode = null;
    this.editId = null;
    this.submitted = false;
    this.form.reset({ codigo: '', descricao: '', ativo: true });
    this.clearParcelas();
  }

  save(): void {
    this.submitted = true;
    if (this.form.invalid) return;

    this.saving = true;
    this.errorMsg = null; this.successMsg = null;

    const payload = {
      codigo: (this.form.value.codigo || '').toString().trim(),
      descricao: (this.form.value.descricao || '').toString().trim(),
      ativo: !!this.form.value.ativo,
      parcelas: (this.parcelasFA.value || []).map(x => ({
        ordem: Number(x.ordem) || 1,
        dias: Number(x.dias) || 0,
        percentual: x.percentual === '' ? '0' : x.percentual,
        valor_fixo: x.valor_fixo === '' ? '0' : x.valor_fixo
      })) as FormaPagamentoParcelaWrite[]
    };

    if (this.formMode === 'create') {
      this.api.create(payload).subscribe({
        next: () => {
          this.saving = false;
          this.successMsg = 'Forma criada com sucesso.';
          this.cancelEdit();
          this.reload();
        },
        error: (err) => { this.saving = false; this.errorMsg = this.humanizeErr(err); }
      });
    } else if (this.formMode === 'edit' && this.editId != null) {
      this.api.update(this.editId, payload).subscribe({
        next: () => {
          this.saving = false;
          this.successMsg = 'Alterações salvas com sucesso.';
          this.cancelEdit();
          this.reload();
        },
        error: (err) => { this.saving = false; this.errorMsg = this.humanizeErr(err); }
      });
    }
  }

  remove(row: FormaPagamentoRow): void {
    const id = row.Idformapagamento ?? row.Idforma!;
    if (!id) return;
    this.loading = true;
    this.errorMsg = null; this.successMsg = null;
    this.api.delete(id).subscribe({
      next: () => { this.loading = false; this.successMsg = 'Excluído com sucesso.'; this.reload(); },
      error: (err) => { this.loading = false; this.errorMsg = this.humanizeErr(err); }
    });
  }

  // ================= Parcelas (UI) =================
  addParcela(): void { this.parcelasFA.push(this.makeParcelaGroup()); }

  removeParcela(ix: number): void {
    if (ix < 0 || ix >= this.parcelasFA.length) return;
    this.parcelasFA.removeAt(ix);
    // renumera ordens
    this.parcelasFA.controls.forEach((fg, i) => (fg.get('ordem') as FormControl<number>).setValue(i + 1));
  }

  private makeParcelaGroup(p?: Partial<FormaPagamentoParcelaWrite>): FormGroup {
    return this.fb.group({
      ordem: new FormControl<number>(p?.ordem ?? (this.parcelasFA.length + 1), { nonNullable: true, validators: [Validators.required, Validators.min(1)] }),
      dias: new FormControl<number>(p?.dias ?? 0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
      percentual: new FormControl<string | number>(p?.percentual ?? '', { nonNullable: true }),
      valor_fixo: new FormControl<string | number>(p?.valor_fixo ?? '', { nonNullable: true })
    });
  }

  private clearParcelas(): void { while (this.parcelasFA.length) this.parcelasFA.removeAt(0); }

  // ================= Util =================
  fieldInvalid(path: string): boolean {
    const ctrl = this.form.get(path);
    return !!ctrl && ctrl.invalid && (ctrl.touched || this.submitted);
    }
  getFormErrors(): string[] {
    const msgs: string[] = [];
    const f = this.form;
    if (this.fieldInvalid('codigo')) msgs.push('Código é obrigatório (máx. 10).');
    if (this.fieldInvalid('descricao')) msgs.push('Descrição é obrigatória (máx. 120).');
    this.parcelasFA.controls.forEach((fg, i) => {
      const p = i + 1;
      if (fg.get('ordem')?.invalid) msgs.push(`Parcela ${p}: ordem inválida.`);
      if (fg.get('dias')?.invalid) msgs.push(`Parcela ${p}: dias inválido.`);
    });
    return msgs;
  }

  private humanizeErr(err: any): string {
    if (!err) return 'Erro desconhecido.';
    if (err.error && typeof err.error === 'string') return err.error;
    if (err.error && err.error.detail) return err.error.detail;
    if (err.message) return err.message;
    return 'Falha na operação.';
  }
}
