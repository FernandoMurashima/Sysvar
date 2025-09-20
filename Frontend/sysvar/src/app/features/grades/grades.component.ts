import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { GradesService } from '../../core/services/grades.service';
import { TamanhosService } from '../../core/services/tamanhos.service';
import { Grade } from '../../core/models/grade';
import { TamanhoModel } from '../../core/models/tamanho';

@Component({
  selector: 'app-grades',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './grades.component.html',
  styleUrls: ['./grades.component.css']
})
export class GradesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private gradesApi = inject(GradesService);
  private tamanhosApi = inject(TamanhosService);

  loading = false;
  saving = false;
  errorMsg = '';
  successMsg = '';
  submitted = false;

  grades: Grade[] = [];
  tamanhos: TamanhoModel[] = [];
  search = '';

  // controle de visibilidade do formulário de Grade
  showGradeForm = false;


  // edição/seleção
  editingGradeId: number | null = null;
  selectedGradeId: number | null = null;

  formGrade = this.fb.group({
    Descricao: ['', [Validators.required, Validators.maxLength(100)]],
    Status: [''],
  });

  // Tamanhos
  editingTamanhoId: number | null = null;
  submittedTamanho = false;

  formTamanho = this.fb.group({
    idgrade: [0, [Validators.required]],
    Tamanho: ['', [Validators.required, Validators.maxLength(10)]],
    Descricao: ['Tamanho', [Validators.maxLength(100)]],
    Status: [''],
  });

  get showTamanhos(): boolean {
    return this.selectedGradeId !== null;
  }

  ngOnInit(): void {
    this.loadGrades();
  }

  // ===== GRADES =====
  loadGrades() {
    this.loading = true;
    this.errorMsg = '';
    this.gradesApi.list({ search: this.search, ordering: '-data_cadastro' }).subscribe({
      next: (data) => {
        this.grades = Array.isArray(data) ? data : (data as any).results ?? [];
      },
      error: (err) => {
        console.error(err);
        this.errorMsg = 'Falha ao carregar grades.';
      },
      complete: () => (this.loading = false),
    });
  }

  onSearchKeyup(ev: KeyboardEvent) { if (ev.key === 'Enter') this.loadGrades(); }
  doSearch() { this.loadGrades(); }
  clearSearch() { this.search = ''; this.loadGrades(); }

  novaGrade() {
    this.editingGradeId = null;
    this.submitted = false;
    this.formGrade.reset({
      Descricao: '',
      Status: '',
    });
    this.successMsg = '';
    this.errorMsg = '';
    this.showGradeForm = true; // <- abre o form
  }

  editarGrade(g: Grade) {
    this.editingGradeId = g.Idgrade ?? null;
    this.submitted = false;
    this.formGrade.reset({
      Descricao: g.Descricao ?? '',
      Status: g.Status ?? '',
    });
    this.successMsg = '';
    this.errorMsg = '';
    this.showGradeForm = true; // <- abre o form para editar
  }

  salvarGrade() {
    this.submitted = true;
    if (this.formGrade.invalid) {
      this.errorMsg = 'Revise os campos destacados e tente novamente.';
      return;
    }
    this.saving = true;
    this.errorMsg = '';
    this.successMsg = '';

    const raw = this.formGrade.getRawValue();
    const payload: Grade = {
      Descricao: String(raw.Descricao ?? '').trim(),
      Status: (raw.Status ?? '').toString().trim() || undefined,
    };

    const req$ = this.editingGradeId
      ? this.gradesApi.update(this.editingGradeId, payload)
      : this.gradesApi.create(payload);

    req$.subscribe({
      next: (g) => {
        this.successMsg = this.editingGradeId ? 'Grade atualizada.' : 'Grade criada.';
        this.loadGrades();
        this.cancelarEdicaoGrade(); // <- fecha e limpa o form após sucesso
        if (!this.editingGradeId && g?.Idgrade) this.selecionarGrade(g.Idgrade); // opcional: já abrir tamanhos da grade criada
      },
      error: (err: HttpErrorResponse) => {
        console.error(err);
        const detail = (err?.error?.detail || err?.error?.error || err?.error) ?? '';
        this.errorMsg = (typeof detail === 'string' && detail) ? detail : 'Falha ao salvar a grade.';
      },
      complete: () => (this.saving = false),
    });
  }

  excluirGrade(g: Grade) {
    if (!g.Idgrade) return;
    const ok = confirm(`Excluir a grade "${g.Descricao}"?`);
    if (!ok) return;

    this.gradesApi.remove(g.Idgrade).subscribe({
      next: () => {
        this.successMsg = 'Grade excluída.';
        this.loadGrades();
        if (this.editingGradeId === g.Idgrade) this.novaGrade();
        if (this.selectedGradeId === g.Idgrade) this.fecharTamanhos();
      },
      error: (err) => {
        console.error(err);
        this.errorMsg = 'Falha ao excluir a grade.';
      }
    });
  }

  cancelarEdicaoGrade() {
    this.editingGradeId = null;
    this.submitted = false;
    this.formGrade.reset({
      Descricao: '',
      Status: '',
    });
    this.showGradeForm = false; // <- fecha o form
  }

  fieldInvalidGrade(name: string) {
    const c = this.formGrade.get(name);
    return (c?.touched || this.submitted) && c?.invalid;
  }

  getGradeErrors(): string[] {
    const msgs: string[] = [];
    if (this.fieldInvalidGrade('Descricao')) msgs.push('Informe a Descrição (máx. 100).');
    return msgs;
  }

  // ===== TAMANHOS =====
  selecionarGrade(idgrade: number) {
    this.selectedGradeId = idgrade;
    this.carregarTamanhos(idgrade);
    this.novoTamanho();
  }

  fecharTamanhos() {
    this.selectedGradeId = null;
    this.tamanhos = [];
    this.novoTamanho();
  }

  carregarTamanhos(idgrade: number) {
    this.tamanhosApi.list({ idgrade, ordering: 'Tamanho' }).subscribe({
      next: (data) => {
        this.tamanhos = Array.isArray(data) ? data : (data as any).results ?? [];
      },
      error: (err) => {
        console.error(err);
        this.errorMsg = 'Falha ao carregar tamanhos da grade.';
      }
    });
  }

  novoTamanho() {
    this.editingTamanhoId = null;
    this.submittedTamanho = false;
    this.formTamanho.reset({
      idgrade: this.selectedGradeId ?? 0,
      Tamanho: '',
      Descricao: 'Tamanho',
      Status: '',
    });
  }

  editarTamanho(t: TamanhoModel) {
    this.editingTamanhoId = t.Idtamanho ?? null;
    this.submittedTamanho = false;
    const idgrade = (t as any).idgrade?.Idgrade ?? (t as any).idgrade ?? this.selectedGradeId ?? 0;
    this.formTamanho.reset({
      idgrade,
      Tamanho: t.Tamanho ?? '',
      Descricao: t.Descricao ?? 'Tamanho',
      Status: t.Status ?? '',
    });
  }

  salvarTamanho() {
    this.submittedTamanho = true;
    if (this.formTamanho.invalid) return;

    const raw = this.formTamanho.getRawValue();
    const payload: TamanhoModel = {
      idgrade: Number(raw.idgrade),
      Tamanho: String(raw.Tamanho ?? '').trim(),
      Descricao: (raw.Descricao ?? '').toString().trim() || undefined,
      Status: (raw.Status ?? '').toString().trim() || undefined,
    };

    const req$ = this.editingTamanhoId
      ? this.tamanhosApi.update(this.editingTamanhoId, payload)
      : this.tamanhosApi.create(payload);

    req$.subscribe({
      next: () => {
        this.successMsg = this.editingTamanhoId ? 'Tamanho atualizado.' : 'Tamanho criado.';
        if (this.selectedGradeId) this.carregarTamanhos(this.selectedGradeId);
        this.novoTamanho();
      },
      error: (err: HttpErrorResponse) => {
        console.error(err);
        this.errorMsg = 'Falha ao salvar o tamanho.';
      }
    });
  }

  excluirTamanho(t: TamanhoModel) {
    if (!t.Idtamanho) return;
    const ok = confirm(`Excluir o tamanho "${t.Tamanho}"?`);
    if (!ok) return;

    this.tamanhosApi.remove(t.Idtamanho).subscribe({
      next: () => {
        this.successMsg = 'Tamanho excluído.';
        if (this.selectedGradeId) this.carregarTamanhos(this.selectedGradeId);
      },
      error: (err) => {
        console.error(err);
        this.errorMsg = 'Falha ao excluir o tamanho.';
      }
    });
  }

  cancelarEdicaoTamanho() { this.novoTamanho(); }

  fieldInvalidTamanho(name: string) {
    const c = this.formTamanho.get(name);
    return (c?.touched || this.submittedTamanho) && c?.invalid;
  }

  getTamanhoErrors(): string[] {
    const msgs: string[] = [];
    if (this.fieldInvalidTamanho('idgrade')) msgs.push('Selecione uma Grade.');
    if (this.fieldInvalidTamanho('Tamanho')) msgs.push('Informe o código/valor do Tamanho (máx. 10).');
    if (this.formTamanho.get('Descricao')?.errors?.['maxlength']) msgs.push('Descrição do tamanho: máx. 100 caracteres.');
    return msgs;
  }
}
