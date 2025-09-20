import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LojasService } from '../../core/services/lojas.service';

export interface Loja {
  Idloja: number;
  nome_loja: string;
}

@Component({
  selector: 'app-lojas-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lojas-selector.component.html',
  styleUrls: ['./lojas-selector.component.css']
})
export class LojasSelectorComponent implements OnInit {
  private lojasSvc = inject(LojasService);

  lojas: Loja[] = [];
  @Input() selected: number[] = [];
  @Output() selectedChange = new EventEmitter<number[]>();

  loading = signal(false);
  erro = signal<string | null>(null);

  ngOnInit(): void {
    this.loading.set(true);
    this.lojasSvc.list().subscribe({
      next: (data: any) => {
        // aceita array direto ou { results: [] }
        this.lojas = Array.isArray(data) ? data : (data?.results ?? []);
      },
      error: () => this.erro.set('Falha ao carregar lojas'),
      complete: () => this.loading.set(false)
    });
  }

  /** Handler do (change) do checkbox com cast seguro */
  onCheckboxChange(event: Event, lojaId: number): void {
    const input = event.target as HTMLInputElement | null;
    const checked = !!input?.checked;
    this.toggle(lojaId, checked);
  }

  toggle(lojaId: number, checked: boolean): void {
    const set = new Set<number>(this.selected);
    checked ? set.add(lojaId) : set.delete(lojaId);
    this.selected = Array.from(set);
    this.selectedChange.emit(this.selected);
  }
}