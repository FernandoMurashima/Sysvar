import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NfeService, ReconciliarResp } from '../../../core/services/nfe.service';

@Component({
  selector: 'app-conciliar-nfe',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './conciliar-nfe.component.html',
  styleUrls: ['./conciliar-nfe.component.css']
})
export class ConciliarNfeComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private nfe = inject(NfeService);

  nfeId!: number;
  fornecedorId?: number;   // só se NF não tiver fornecedor
  loading = true; error?: string;
  data?: ReconciliarResp;

  ngOnInit(): void {
    this.nfeId = Number(this.route.snapshot.paramMap.get('id'));
    this.reconciliar();
  }

  reconciliar() {
    this.loading = true; this.error = undefined;
    this.nfe.reconciliar(this.nfeId, this.fornecedorId).subscribe({
      next: (resp) => { this.loading = false; this.data = resp; },
      error: (err) => { this.loading = false; this.error = err?.error?.detail || 'Falha na conciliação.'; }
    });
  }

  continuar() { this.router.navigate(['/compras/nfe', this.nfeId, 'confirmar']); }

  countPendentes(): number {
    if (!this.data) return 0;
    return this.data.itens.filter(i => !i.destino).length;
  }
}
