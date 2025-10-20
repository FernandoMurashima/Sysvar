import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { EstoquesService } from '../../../core/services/estoques.service';

type LojaOpt = { id: number; nome: string };

type FormShape = {
  colecoes: FormArray<FormControl<string>>;
  todasLojas: FormControl<boolean>;
  lojas: FormArray<FormControl<number>>;
  tabela_preco_id: FormControl<number>;
  ativo: FormControl<boolean>;
  moeda: FormControl<string>;
};

@Component({
  selector: 'app-consulta-colest',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './consulta-colest.component.html',
})
export class ConsultaColestComponent implements OnInit {
  form!: FormGroup<FormShape>;

  // opções de coleções – pode vir de API depois
  colecoesDisponiveis = [
    { value: '25', label: 'Coleção 25' },
    { value: '26', label: 'Coleção 26' },
  ];

  // será preenchido a partir de data.eixos.lojas
  lojasDisponiveis: LojaOpt[] = [];

  loading = false;
  errorMsg = '';
  data: any = null;

  // === INÍCIO: propriedades e helpers usados pelo template ===
resposta: {
  eixos: { colest: Array<{ key: string; rotulo: string }> };
  matriz: {
    por_loja: Array<{
      loja_id: number;
      loja_nome: string;
      colest: Record<string, { itens: number; valor: number }>;
      total_itens: number;
      total_valor: number;
    }>;
    totais: {
      por_colest: Record<string, { itens: number; valor: number }>;
      geral: { itens: number; valor: number };
    };
  };
} = {
  eixos: { colest: [] },
  matriz: {
    por_loja: [],
    totais: { por_colest: {}, geral: { itens: 0, valor: 0 } },
  },
};

public getItens(linha: any, key: string): number {
  return linha?.colest?.[key]?.itens ?? 0;
}
public getValor(linha: any, key: string): number {
  return linha?.colest?.[key]?.valor ?? 0;
}
public trackLoja = (_: number, item: any) => item?.loja_id ?? _;

private setResposta(data: any) {
  this.resposta = data ?? this.resposta;
}
// === FIM ===


  constructor(private fb: FormBuilder, private estoquesService: EstoquesService) {}

  ngOnInit(): void {
    this.form = this.fb.group<FormShape>({
      colecoes: this.fb.array<FormControl<string>>([]),
      todasLojas: this.fb.nonNullable.control(true),
      lojas: this.fb.array<FormControl<number>>([]),
      tabela_preco_id: this.fb.nonNullable.control(1),
      ativo: this.fb.nonNullable.control(true),
      moeda: this.fb.nonNullable.control('BRL'),
    });

    // marca 25 e 26 por padrão
    this.setColecoesSelecionadas(['25', '26']);

    // primeira carga
    this.onBuscar();
  }

  // ---------- getters tipados ----------
  get colecoesFA(): FormArray<FormControl<string>> {
    return this.form.controls.colecoes;
  }
  get lojasFA(): FormArray<FormControl<number>> {
    return this.form.controls.lojas;
  }

  // ---------- helpers de seleção ----------
  setColecoesSelecionadas(vals: string[]) {
    this.colecoesFA.clear();
    vals.forEach(v => this.colecoesFA.push(this.fb.nonNullable.control(v)));
  }

  isColecaoMarcada(value: string): boolean {
    return (this.colecoesFA.value || []).includes(value);
  }

  toggleColecao(value: string, checked: boolean) {
    const arr = this.colecoesFA.value || [];
    const idx = arr.indexOf(value);
    if (checked && idx === -1) this.colecoesFA.push(this.fb.nonNullable.control(value));
    if (!checked && idx > -1) this.colecoesFA.removeAt(idx);
  }

  isLojaMarcada(id: number): boolean {
    return (this.lojasFA.value || []).includes(id);
  }

  toggleLoja(id: number, checked: boolean) {
    const arr = this.lojasFA.value || [];
    const idx = arr.indexOf(id);
    if (checked && idx === -1) this.lojasFA.push(this.fb.nonNullable.control(id));
    if (!checked && idx > -1) this.lojasFA.removeAt(idx);
  }

  onToggleTodas(checked: boolean) {
    this.form.controls.todasLojas.setValue(checked);
    if (checked) {
      this.lojasFA.clear();
    } else {
      // se desmarcar "todas", marca todas as opções disponiveis
      this.lojasFA.clear();
      this.lojasDisponiveis.forEach(l =>
        this.lojasFA.push(this.fb.nonNullable.control(l.id))
      );
    }
  }

  // ---------- chamada ao backend ----------
  async onBuscar() {
    this.loading = true;
    this.errorMsg = '';
    this.data = null;

    try {
      const colecoes = this.colecoesFA.value;
      if (!colecoes.length) {
        this.errorMsg = 'Selecione pelo menos uma coleção.';
        return;
      }

      const lojas = this.form.controls.todasLojas.value ? [] : this.lojasFA.value;
      const tabela = this.form.controls.tabela_preco_id.value;
      const ativo = this.form.controls.ativo.value;
      const moeda = this.form.controls.moeda.value;

      const resp = await firstValueFrom(
        this.estoquesService.getMatrizColEst(colecoes, tabela, lojas, ativo, moeda)
      );

      this.data = resp;

      // popula lojas quando vierem dos eixos
      if (resp?.eixos?.lojas) {
        this.lojasDisponiveis = resp.eixos.lojas as LojaOpt[];
        // se "todas" estiver desmarcado, garante seleção de todas
        if (!this.form.controls.todasLojas.value && this.lojasFA.length === 0) {
          this.lojasDisponiveis.forEach(l =>
            this.lojasFA.push(this.fb.nonNullable.control(l.id))
          );
        }
      }
    } catch (e: any) {
      this.errorMsg = e?.error?.detail || 'Falha ao carregar matriz.';
    } finally {
      this.loading = false;
    }
  }

  // ---------- leitura de valores no payload ----------
  itensLojaColest(loja: any, key: string): number {
    return Number(loja?.colest?.[key]?.itens || 0);
  }
  valorLojaColest(loja: any, key: string): number {
    return Number(loja?.colest?.[key]?.valor || 0);
  }
  totalColestItens(key: string): number {
    return Number(this.data?.matriz?.totais?.por_colest?.[key]?.itens || 0);
    // se o backend não trouxer por_colest, poderíamos somar por_loja aqui.
  }
  totalColestValor(key: string): number {
    return Number(this.data?.matriz?.totais?.por_colest?.[key]?.valor || 0);
  }
  totalGeralItens(): number {
    return Number(this.data?.matriz?.totais?.geral?.itens || 0);
  }
  totalGeralValor(): number {
    return Number(this.data?.matriz?.totais?.geral?.valor || 0);
  }
}

