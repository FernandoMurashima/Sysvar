import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/** Compatível com o seu CorModel (Idcor opcional) */
export type CorRow = {
  Idcor?: number | null;
  Descricao?: string | null;
  Codigo?: string | null;
};

@Component({
  selector: 'app-cores-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cores-selector.component.html',
  styleUrls: ['./cores-selector.component.css']
})
export class CoresSelectorComponent {
  /** Lista completa de cores (CorModel compatível) */
  @Input() cores: CorRow[] = [];

  /** Filtro vindo do pai (ex.: corFiltro) */
  @Input() filtro = '';

  /** Two-way binding: [(selected)] */
  @Input() set selected(v: number[] | null | undefined) {
    this._selected = Array.isArray(v) ? [...v] : [];
  }
  get selected(): number[] {
    return this._selected;
  }
  @Output() selectedChange = new EventEmitter<number[]>();

  private _selected: number[] = [];

  /** Lista visível aplicando o filtro */
  visiveis(): CorRow[] {
    const q = (this.filtro || '').trim().toLowerCase();
    if (!q) return this.cores;
    return this.cores.filter(c =>
      (c?.Descricao || '').toLowerCase().includes(q) ||
      (c?.Codigo || '').toLowerCase().includes(q)
    );
  }

  /** trackBy estável para *ngFor */
  trackById = (_: number, r: CorRow) => (r?.Idcor ?? -1);

  /** Seleção */
  isChecked(id?: number | null): boolean {
    if (id == null) return false;
    return this._selected.includes(id);
  }

  toggle(id?: number | null, checked?: boolean): void {
    if (id == null) return;
    const has = this._selected.includes(id);
    if (checked === undefined) checked = !has;

    if (checked && !has) {
      this._selected = [...this._selected, id];
    } else if (!checked && has) {
      this._selected = this._selected.filter(x => x !== id);
    }
    this.selectedChange.emit(this._selected);
  }

  /** Selecionar todas as visíveis (opcional, caso o pai chame via ViewChild) */
  selecionarTodasVisiveis(): void {
    const toAdd = this.visiveis()
      .map(v => v.Idcor)
      .filter((id): id is number => typeof id === 'number');

    const set = new Set(this._selected);
    toAdd.forEach(id => set.add(id));
    this._selected = Array.from(set.values());
    this.selectedChange.emit(this._selected);
  }

  /** Limpar seleção (opcional) */
  limparSelecao(): void {
    this._selected = [];
    this.selectedChange.emit(this._selected);
  }
}
