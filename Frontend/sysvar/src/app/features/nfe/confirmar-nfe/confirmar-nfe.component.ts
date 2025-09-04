import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NfeService, ConfirmarResp } from '../../../core/services/nfe.service';

@Component({
  selector: 'app-confirmar-nfe',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './confirmar-nfe.component.html',
  styleUrls: ['./confirmar-nfe.component.css']
})
export class ConfirmarNfeComponent {
  private route = inject(ActivatedRoute);
  private nfe = inject(NfeService);

  nfeId = Number(this.route.snapshot.paramMap.get('id'));
  permitirParcial = false;
  loading = false; error?: string; resultado?: ConfirmarResp;

  confirmar() {
    this.loading = true; this.error = undefined;
    this.nfe.confirmar(this.nfeId, this.permitirParcial).subscribe({
      next: (resp) => { this.loading = false; this.resultado = resp; },
      error: (err) => { this.loading = false; this.error = err?.error?.detail || 'Falha ao confirmar.'; }
    });
  }
}
