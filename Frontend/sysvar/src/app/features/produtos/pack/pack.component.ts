import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, FormArray, FormGroup } from '@angular/forms';
import { PackService } from '../../../core/services/pack.service';
import { PackDTO, GradeDTO, TamanhoDTO } from '../../../core/models/pack';

type Mode = 'new' | 'edit' | null;

@Component({
  selector: 'app-pack',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './pack.component.html',
  styleUrls: ['./pack.component.css']
})
export class PackComponent implements OnInit {

  private srv = inject(PackService);
  private fb = inject(FormBuilder);
  private cdRef = inject(ChangeDetectorRef);
  public Math = Math;

  // toolbar / busca / paginação
  search = '';
  page = 1;
  pageSize = 10;
  pageSizeOptions = [10, 20, 50];
  total = 0;
  totalPages = 0;
  loading = false;
  loadingTamanhos = false;

  // dados
  packs: PackDTO[] = [];
  grades: GradeDTO[] = [];
  tamanhosDaGrade: TamanhoDTO[] = [];

  // mensagens
  errorMsg = '';
  successMsg = '';

  // form
  form = this.fb.group({
    id: this.fb.control<number | null>(null),
    nome: this.fb.control<string | null>(null, [Validators.maxLength(80)]),
    grade: this.fb.control<number | null>(null, [Validators.required]),
    ativo: this.fb.control<boolean>(true),
    itens: this.fb.array<FormGroup<{
      tamanho: any; // number
      qtd: any;     // number
    }>>([])
  });

  formMode: Mode = null;
  submitted = false;
  saving = false;

  get itensFA() {
    return this.form.controls.itens as FormArray;
  }

  ngOnInit(): void {
    this.loadGrades();
    this.loadPage(1);
  }

  // ===== Listagem / paginação =====
  loadPage(pg: number) {
    this.loading = true;
    this.errorMsg = '';
    this.srv.list({ page: pg, page_size: this.pageSize, search: this.search, ordering: '-id' })
      .subscribe({
        next: (res) => {
          const results = (res as any).results ?? res;
          this.packs = results;
          this.total = (res as any).count ?? results.length;
          this.page = pg;
          this.totalPages = Math.max(1, Math.ceil(this.total / this.pageSize));
          this.loading = false;
        },
        error: () => {
          this.errorMsg = 'Falha ao carregar Packs.';
          this.loading = false;
        }
      });
  }
  firstPage(){ if (this.page>1) this.loadPage(1); }
  prevPage(){ if (this.page>1) this.loadPage(this.page-1); }
  nextPage(){ if (this.page<this.totalPages) this.loadPage(this.page+1); }
  lastPage(){ if (this.page<this.totalPages) this.loadPage(this.totalPages); }
  onPageSizeChange(n: number){ this.pageSize = +n; this.loadPage(1); }

  // ===== Busca =====
  onSearchKeyup(ev: KeyboardEvent) { if (ev.key === 'Enter') this.doSearch(); }
  doSearch(){ this.loadPage(1); }
  clearSearch(){ this.search = ''; this.loadPage(1); }

  // ===== Form =====
  novo() {
    this.formMode = 'new';
    this.submitted = false;
    this.form.reset({ id: null, nome: null, grade: null, ativo: true });
    this.itensFA.clear();
    this.tamanhosDaGrade = [];
  }

  editar(p: PackDTO) {
    this.formMode = 'edit';
    this.submitted = false;
    this.form.reset({
      id: p.id ?? null,
      nome: p.nome ?? null,
      grade: p.grade ?? null,
      ativo: !!p.ativo,
    });
    this.itensFA.clear();
    (p.itens || []).forEach(it => {
      this.itensFA.push(this.fb.group({
        tamanho: this.fb.control<number>(it.tamanho, { nonNullable: true, validators: [Validators.required] }),
        qtd: this.fb.control<number>(it.qtd, { nonNullable: true, validators: [Validators.min(0)] })
      }));
    });
    if (p.grade) this.onGradeChange(p.grade);
  }

  cancelarEdicao() {
    this.formMode = null;
    this.submitted = false;
    this.form.reset();
    this.itensFA.clear();
    this.tamanhosDaGrade = [];
  }

  salvar() {
    this.submitted = true;
    this.errorMsg = '';
    this.successMsg = '';

    if (this.form.invalid) return;

    const payload: PackDTO = {
      id: this.form.value.id ?? undefined,
      nome: this.form.value.nome ?? null,
      grade: Number(this.form.value.grade),
      ativo: !!this.form.value.ativo,
      itens: (this.form.value.itens || []).map((g: any) => ({
        tamanho: Number(g.tamanho),
        qtd: Number(g.qtd || 0)
      }))
    };

    this.saving = true;
    const req$ = this.formMode === 'edit' && payload.id
      ? this.srv.update(payload.id, payload)
      : this.srv.create(payload);

    req$.subscribe({
      next: () => {
        this.successMsg = 'Pack salvo com sucesso!';
        this.saving = false;
        this.cancelarEdicao();
        this.loadPage(this.page);
      },
      error: (err) => {
        this.errorMsg = 'Falha ao salvar o Pack.';
        if (err?.error && typeof err.error === 'object') {
          try { this.errorMsg += ' ' + JSON.stringify(err.error); } catch {}
        }
        this.saving = false;
      }
    });
  }

  excluir(p: PackDTO) {
    if (!p.id) return;
    if (!confirm(`Excluir o Pack "${p.nome ?? '(sem nome)'}"?`)) return;
    this.srv.delete(p.id).subscribe({
      next: () => {
        this.successMsg = 'Pack excluído com sucesso.';
        const proxima = (this.packs.length === 1 && this.page > 1) ? this.page - 1 : this.page;
        this.loadPage(proxima);
      },
      error: () => this.errorMsg = 'Falha ao excluir Pack.'
    });
  }

  // ===== Itens (linhas do pack) =====
  addItem() {
    if (!this.form.value.grade) {
      this.errorMsg = 'Selecione a grade antes de adicionar itens.';
      return;
    }
    this.itensFA.push(this.fb.group({
      tamanho: this.fb.control<number | null>(null, { validators:[Validators.required] }),
      qtd: this.fb.control<number>(0, { nonNullable: true, validators:[Validators.min(0)] })
    }));
  }
  rmItem(ix: number) { this.itensFA.removeAt(ix); }
  trackRow = (i: number) => i;

  // ===== Grade / Tamanhos =====
  private loadGrades() {
    this.srv.listGrades().subscribe({
      next: (res: any) => { this.grades = (res?.results ?? res) as GradeDTO[]; },
      error: () => { /* silencioso */ }
    });
  }

  onGradeChange(idgrade: number | null | undefined): void {
    // limpa lista e zera valores de tamanho nas linhas
    this.tamanhosDaGrade = [];
    this.loadingTamanhos = true;
    this.itensFA.controls.forEach(ctrl => {
      (ctrl as FormGroup).get('tamanho')?.setValue(null, { emitEvent: false });
    });
    this.cdRef.detectChanges();

    // normaliza
    const id =
      typeof idgrade === 'number'
        ? idgrade
        : idgrade != null
          ? Number(idgrade)
          : null;

    if (id == null || Number.isNaN(id)) {
      this.loadingTamanhos = false;
      this.cdRef.detectChanges();
      return;
    }

    this.srv.listTamanhosByGrade(id).subscribe({
      next: (res: any) => {
        this.tamanhosDaGrade = (res?.results ?? res) as TamanhoDTO[];
        this.loadingTamanhos = false;
        this.cdRef.detectChanges(); // força repintar opções do select
      },
      error: () => {
        this.loadingTamanhos = false;
        this.cdRef.detectChanges();
      }
    });
  }

  getTamanhoLabel(id: number | null | undefined): string {
    if (!id) return '';
    const t = this.tamanhosDaGrade.find(x => x.Idtamanho === id);
    if (!t) return String(id);
    return t.Tamanho ? `${t.Tamanho} (${t.Descricao})` : t.Descricao;
  }

  // ===== validação simples (overlay) =====
  fieldInvalid(ctrl: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[ctrl];
    return !!(this.submitted && c.invalid);
  }

  getFormErrors(): string[] {
    const msgs: string[] = [];
    if (this.fieldInvalid('grade')) msgs.push('Selecione uma grade.');
    const seen = new Set<number>();
    for (let i = 0; i < this.itensFA.length; i++) {
      const g = this.itensFA.at(i) as FormGroup;
      const tam = Number(g.value['tamanho'] || 0);
      if (tam) {
        if (seen.has(tam)) msgs.push(`Tamanho repetido na linha ${i+1}.`);
        seen.add(tam);
      }
    }
    return msgs;
  }
}
