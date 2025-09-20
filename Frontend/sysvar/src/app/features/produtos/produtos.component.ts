import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ProdutosService } from '../../core/services/produtos.service';
import { ColecoesService } from '../../core/services/colecoes.service';
import { GruposService } from '../../core/services/grupos.service';
import { SubgruposService } from '../../core/services/subgrupos.service';
import { UnidadesService } from '../../core/services/unidades.service';
import { NcmsService } from '../../core/services/ncms.service';
import { CodigosService, CodigoRow } from '../../core/services/codigos.service';
import { TabelaprecoService } from '../../core/services/tabelapreco.service';
import { GradesService } from '../../core/services/grades.service';
import { TamanhosService } from '../../core/services/tamanhos.service';
import { CoresService } from '../../core/services/cores.service';
import { LojasSelectorComponent } from '../../shared/lojas-selector/lojas-selector.component';

import { GrupoModel } from '../../core/models/grupo';
import { SubgrupoModel } from '../../core/models/subgrupo';
import { Unidade } from '../../core/models/unidade';
import { Colecao } from '../../core/models/colecoes';
import { TabelaPreco } from '../../core/models/tabelapreco';
import { Grade } from '../../core/models/grade';
import { TamanhoModel } from '../../core/models/tamanho';
import { CorModel } from '../../core/models/cor';

import { firstValueFrom } from 'rxjs';

type Ncm = { ncm: string; descricao?: string };

@Component({
  selector: 'app-produtos',
  standalone: true,
  imports: [CommonModule, FormsModule, LojasSelectorComponent],
  templateUrl: './produtos.component.html',
  styleUrls: ['./produtos.component.css']
})
export class ProdutosComponent implements OnInit {
  action: '' | 'novo' | 'consultar' = '';

  // listas
  grupos: GrupoModel[] = [];
  subgrupos: SubgrupoModel[] = [];
  unidades: Unidade[] = [];
  ncms: Ncm[] = [];
  tabelasPreco: TabelaPreco[] = [];
  grades: Grade[] = [];

  colecoes: Colecao[] = [];
  colecoesCodigos: string[] = [];
  estacoesDaColecao: string[] = [];

  // CORES / TAMANHOS
  cores: CorModel[] = [];
  corFiltro = '';
  coresSelecionadas = new Set<number>();
  tamanhosDaGrade: TamanhoModel[] = [];

  // mensagens
  errorMsg = '';
  successMsg = '';
  infoMsg = '';
  fieldErrors: Array<{ field: string; messages: string[] }> = [];

  // mensagens do batch
  batchMsg = '';
  batchErrors: string[] = [];
  savingSkus = false;

  // preview de referência
  referenciaPreview = '';

  // id do produto salvo
  productId: number | null = null;

  // lojas marcadas para inicializar estoque (qty 0)
  lojasMarcadas: number[] = [];

  // SKUs gerados (preview)
  combinacoes: Array<{
    cor: CorModel;
    tamanho: TamanhoModel;
    ean13: string;
    preco: number | null;
  }> = [];

  // aguarda tecla após salvar SKUs (esconde formulário)
  awaitKeyAfterSave = false;

  form = {
    colecao: null as string | null,
    estacao: null as string | null,
    grupo: null as string | null,
    subgrupo: null as number | null,
    unidade: null as number | null,
    classificacao_fiscal: '' as string,
    tabela_preco: null as number | null,
    Preco: null as number | null,
    grade: null as number | null,
    Descricao: '' as string,
    Desc_reduzida: '' as string | null
  };

  constructor(
    private produtosApi: ProdutosService,
    private colecoesApi: ColecoesService,
    private gruposApi: GruposService,
    private subgruposApi: SubgruposService,
    private unidadesApi: UnidadesService,
    private ncmsApi: NcmsService,
    private codigosApi: CodigosService,
    private tabelasApi: TabelaprecoService,
    private gradesApi: GradesService,
    private tamanhosApi: TamanhosService,
    private coresApi: CoresService
  ) {}

  ngOnInit(): void {
    this.loadColecoes();

    this.gruposApi.list({ ordering: 'Descricao' }).subscribe({
      next: (res: any) => { this.grupos = Array.isArray(res) ? res : (res?.results ?? []); }
    });
    this.unidadesApi.list({ ordering: 'Descricao' }).subscribe({
      next: (res: any) => { this.unidades = Array.isArray(res) ? res : (res?.results ?? []); }
    });
    this.ncmsApi.list({ ordering: 'ncm' }).subscribe({
      next: (res: any) => { this.ncms = Array.isArray(res) ? res : (res?.results ?? []); }
    });
    this.tabelasApi.list({ ordering: 'NomeTabela' }).subscribe({
      next: (res: any) => { this.tabelasPreco = Array.isArray(res) ? res : (res?.results ?? []); }
    });
    this.gradesApi.list({ ordering: 'Descricao' }).subscribe({
      next: (res: any) => { this.grades = Array.isArray(res) ? res : (res?.results ?? []); }
    });
    this.coresApi.list({ ordering: 'Descricao' }).subscribe({
      next: (res: any) => { this.cores = Array.isArray(res) ? res : (res?.results ?? []); }
    });
  }

  private loadColecoes(): void {
    this.colecoesApi.list({ ordering: '-data_cadastro' }).subscribe({
      next: (res: any) => {
        this.colecoes = Array.isArray(res) ? res : (res?.results ?? []);
        const set = new Set<string>();
        this.colecoes.forEach(c => set.add((c.Codigo || '').toString().padStart(2, '0')));
        this.colecoesCodigos = Array.from(set).sort();
      }
    });
  }

  setAction(a: '' | 'novo' | 'consultar'): void {
    this.action = a;
    this.clearMessages();
    if (a === 'novo') this.resetForm();
  }

  cancelar(): void {
    this.resetForm();
    this.clearMessages();
    this.action = '';
  }

  onColecaoChange(): void {
    this.estacoesDaColecao = [];
    this.form.estacao = null;
    this.referenciaPreview = '';

    if (!this.form.colecao) return;
    const cc = this.form.colecao.toString().padStart(2, '0');

    const estSet = new Set<string>();
    this.colecoes
      .filter(c => (c.Codigo || '').toString().padStart(2, '0') === cc)
      .forEach(c => estSet.add((c.Estacao || '').toString().padStart(2, '0')));
    this.estacoesDaColecao = Array.from(estSet).sort();

    this.updateReferenciaPreview();
  }

  onEstacaoChange(): void {
    this.updateReferenciaPreview();
  }

  onGrupoChange(): void {
    this.form.subgrupo = null;
    if (!this.form.grupo) { this.subgrupos = []; this.referenciaPreview = ''; return; }

    const gcod = this.form.grupo.toString().padStart(2, '0');
    const g = this.grupos.find(x => (x.Codigo || '').toString().padStart(2, '0') === gcod);
    if (!g?.Idgrupo) { this.subgrupos = []; this.referenciaPreview = ''; return; }

    this.subgruposApi.list({ Idgrupo: g.Idgrupo, ordering: 'Descricao' }).subscribe({
      next: (res: any) => { this.subgrupos = Array.isArray(res) ? res : (res?.results ?? []); }
    });

    this.updateReferenciaPreview();
  }

  /** carrega tamanhos da grade ao selecionar e limpa o preview de SKUs */
  onGradeChange(): void {
    this.tamanhosDaGrade = [];
    this.combinacoes = []; // evita manter SKUs de uma grade anterior
    if (!this.form.grade) return;
    this.tamanhosApi.list({ idgrade: this.form.grade, ordering: 'Tamanho' }).subscribe({
      next: (res: any) => { this.tamanhosDaGrade = Array.isArray(res) ? res : (res?.results ?? []); }
    });
  }

  grupoLabel(g: GrupoModel): string {
    const cod = (g.Codigo || '').toString().padStart(2, '0');
    return `${cod} — ${g.Descricao}`;
  }

  private resetForm(): void {
    this.form = {
      colecao: null,
      estacao: null,
      grupo: null,
      subgrupo: null,
      unidade: null,
      classificacao_fiscal: '',
      tabela_preco: null,
      Preco: null,
      grade: null,
      Descricao: '',
      Desc_reduzida: ''
    };
    this.estacoesDaColecao = [];
    this.subgrupos = [];
    this.referenciaPreview = '';

    // limpa cores / tamanhos / skus
    this.coresSelecionadas.clear();
    this.corFiltro = '';
    this.tamanhosDaGrade = [];
    this.combinacoes = [];

    // mensagens
    this.batchMsg = '';
    this.batchErrors = [];
    this.productId = null;
  }

  private clearMessages(): void {
    this.errorMsg = '';
    this.successMsg = '';
    this.infoMsg = '';
    this.fieldErrors = [];
    this.batchMsg = '';
    this.batchErrors = [];
  }

  /** Monta preview da referência (CC-EE-GGXXX) sem gravar/incrementar */
  private updateReferenciaPreview(): void {
    this.referenciaPreview = '';
    if (!this.form.colecao || !this.form.estacao || !this.form.grupo) return;

    const cc = this.form.colecao.toString().padStart(2, '0');
    const ee = this.form.estacao.toString().padStart(2, '0');
    const gg = this.form.grupo.toString().padStart(2, '0');

    this.codigosApi.getRow(cc, ee).subscribe({
      next: (row: CodigoRow | null) => {
        const atual = Number(row?.valor_var ?? 0);
        const prox = (atual + 1).toString().padStart(3, '0');
        this.referenciaPreview = `${cc}-${ee}-${gg}${prox}`;
      },
      error: () => { /* mantém vazio */ }
    });
  }

  /* ------------ Seletor de cores ------------ */
  get coresFiltradas(): CorModel[] {
    const q = (this.corFiltro || '').toLowerCase().trim();
    if (!q) return this.cores;
    return this.cores.filter(c =>
      (c.Descricao || '').toLowerCase().includes(q) ||
      (c.Codigo || '').toLowerCase().includes(q)
    );
  }

  selecionarTodasVisiveis(): void {
    for (const c of this.coresFiltradas) {
      if (c.Idcor != null) this.coresSelecionadas.add(c.Idcor);
    }
  }

  limparSelecaoCores(): void {
    this.coresSelecionadas.clear();
  }

  toggleCor(id: number | null | undefined, checked: boolean): void {
    if (id == null) return;
    if (checked) this.coresSelecionadas.add(id);
    else this.coresSelecionadas.delete(id);
  }

  /* ------------ EAN-13 helper (fallback local) ------------ */
  private ean13CheckDigit12(d12: string): string {
    const digits = d12.split('').map(d => parseInt(d, 10));
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      const pos = i + 1;
      sum += digits[i] * (pos % 2 === 0 ? 3 : 1);
    }
    const mod = sum % 10;
    const check = (10 - mod) % 10;
    return String(check);
  }

  /** Gera um EAN-13 local com prefixos fixos e uma sequência numérica */
  private gerarEan13Local(seq: number): string {
    const prefixoPais = '789';
    const prefixoEmpresa = '1234';
    const produto = String(seq % 100000).padStart(5, '0');
    const base12 = `${prefixoPais}${prefixoEmpresa}${produto}`;
    const dv = this.ean13CheckDigit12(base12);
    return `${base12}${dv}`;
  }

  /* ------------ Geração de SKUs (EAN-13) ------------ */
  async gerarSkus(): Promise<void> {
    this.errorMsg = ''; this.successMsg = ''; this.infoMsg = '';
    this.combinacoes = [];

    if (!this.form.grade) {
      this.errorMsg = 'Selecione a Grade.';
      return;
    }
    if (this.coresSelecionadas.size === 0) {
      this.errorMsg = 'Selecione ao menos uma Cor.';
      return;
    }
    if (this.form.tabela_preco == null || this.form.Preco == null) {
      this.errorMsg = 'Informe Tabela de Preço e o Preço de venda.';
      return;
    }

    // garante tamanhos carregados
    if (!this.tamanhosDaGrade.length) {
      const res = await firstValueFrom(this.tamanhosApi.list({ idgrade: this.form.grade!, ordering: 'Tamanho' }));
      this.tamanhosDaGrade = Array.isArray(res) ? res : (res?.results ?? []);
    }

    const coresMap = new Map<number, CorModel>();
    this.cores.forEach(c => { if (c.Idcor != null) coresMap.set(c.Idcor, c); });

    let seq = Date.now() % 100000;

    for (const corId of Array.from(this.coresSelecionadas.values())) {
      const cor = coresMap.get(corId);
      if (!cor) continue;

      for (const tam of this.tamanhosDaGrade) {
        let ean13 = '';
        try {
          const resp = await firstValueFrom(this.codigosApi.nextEan13());
          ean13 = resp?.ean13 || '';
        } catch { /* fallback abaixo */ }
        if (!ean13) ean13 = this.gerarEan13Local(++seq);

        this.combinacoes.push({
          cor,
          tamanho: tam,
          ean13,
          preco: this.form.Preco
        });
      }
    }

    this.infoMsg = `Gerados ${this.combinacoes.length} SKUs para as cores e tamanhos selecionados.`;
  }

  /* ------------ Salvar SKUs em lote ------------ */
  salvarSkus(produtoSalvo?: any): void {
    this.batchMsg = '';
    this.batchErrors = [];

    const pid = produtoSalvo?.Idproduto ?? produtoSalvo?.id ?? this.productId ?? null;
    if (!pid) {
      this.errorMsg = 'Produto não identificado. Salve o produto antes de salvar os SKUs.';
      return;
    }
    if (!this.form.tabela_preco) {
      this.errorMsg = 'Selecione a Tabela de Preço antes de salvar os SKUs.';
      return;
    }
    if (this.form.Preco == null) {
      this.errorMsg = 'Informe um preço padrão para os SKUs.';
      return;
    }
    if (!this.combinacoes.length) {
      this.errorMsg = 'Nenhuma combinação para salvar.';
      return;
    }

    const itens = this.combinacoes.map(c => ({
      cor_id: c.cor.Idcor!,
      tamanho_id: c.tamanho.Idtamanho!,
      ean13: c.ean13,
      preco: c.preco ?? this.form.Preco!
    }));

    const payload = {
      product_id: Number(pid),
      tabela_preco_id: this.form.tabela_preco!,
      preco_padrao: this.form.Preco!,
      lojas: this.lojasMarcadas,
      itens
    };

    this.savingSkus = true;
    this.produtosApi.saveSkus(payload).subscribe({
      next: (res) => {
        this.savingSkus = false;
        const created = res?.created ?? 0;
        const updated = res?.updated ?? 0;
        const errList = Array.isArray(res?.errors) ? res.errors : [];
        this.batchMsg = `SKUs salvos: ${created} criado(s), ${updated} atualizado(s).`;
        if (errList.length) {
          this.batchErrors = errList.map((e: any) => `Item #${e.index}: ${e.detail || 'erro na validação'}`);
        }

        // >>> NOVO COMPORTAMENTO: mostra mensagem e espera qualquer tecla
        this.successMsg = 'SKUs salvos com sucesso.';
        this.awaitKeyAfterSave = true; // esconde o formulário até o usuário apertar uma tecla
      },
      error: (err) => {
        this.savingSkus = false;
        this.errorMsg = 'Falha ao salvar os SKUs.';
        if (err?.error?.detail) this.batchErrors = [String(err.error.detail)];
      }
    });
  }

  // Quando estiver aguardando, qualquer tecla volta pro começo (placeholder)
  @HostListener('document:keydown', ['$event'])
  onAnyKey(_ev: KeyboardEvent): void {
    if (!this.awaitKeyAfterSave) return;
    this.awaitKeyAfterSave = false;
    this.successMsg = '';
    this.batchMsg = '';
    this.setAction(''); // volta para a tela inicial do cadastro (sem formulário visível)
  }

  salvar(): void {
    this.clearMessages();

    if (!this.form.colecao || !this.form.estacao || !this.form.grupo || !this.form.Descricao) {
      this.errorMsg = 'Preencha Coleção, Estação, Grupo e Descrição.';
      return;
    }
    if (!this.form.unidade) {
      this.errorMsg = 'Selecione a Unidade.';
      return;
    }
    if (!this.form.classificacao_fiscal) {
      this.errorMsg = 'Selecione a Classificação Fiscal (NCM).';
      return;
    }
    if (!this.form.tabela_preco) {
      this.errorMsg = 'Selecione a Tabela de Preço.';
      return;
    }
    if (this.form.Preco == null || this.form.Preco < 0) {
      this.errorMsg = 'Informe um Preço de venda válido.';
      return;
    }

    const payload: any = {
      Tipoproduto: '1',
      Descricao: this.form.Descricao,
      Desc_reduzida: this.form.Desc_reduzida ?? '',
      colecao: this.form.colecao.toString().padStart(2, '0'),
      estacao: this.form.estacao.toString().padStart(2, '0'),
      grupo: this.form.grupo.toString().padStart(2, '0'),
      subgrupo: this.form.subgrupo,
      unidade: this.form.unidade,
      classificacao_fiscal: this.form.classificacao_fiscal,
      grade: this.form.grade,
      tabela_preco: this.form.tabela_preco,
      preco: this.form.Preco
    };

    this.produtosApi.create(payload).subscribe({
      next: (p: any) => {
        this.productId = p?.Idproduto ?? p?.id ?? null;
        this.successMsg = `Produto salvo com referência ${p?.referencia ?? this.referenciaPreview}.`;
      },
      error: (err) => {
        this.errorMsg = 'Não foi possível salvar o produto.';
        if (err?.error && typeof err.error === 'object') {
          const eobj = err.error;
          const fields: Array<{ field: string; messages: string[] }> = [];
          Object.keys(eobj).forEach(k => {
            const v = eobj[k];
            if (Array.isArray(v)) {
              fields.push({ field: k, messages: v.map(x => String(x)) });
            } else if (typeof v === 'string') {
              fields.push({ field: k, messages: [v] });
            }
          });
          this.fieldErrors = fields;
        }
      }
    });
  }
}
