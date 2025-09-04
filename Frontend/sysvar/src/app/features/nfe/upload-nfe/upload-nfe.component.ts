import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NfeService } from '../../../core/services/nfe.service';

@Component({
  selector: 'app-upload-nfe',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './upload-nfe.component.html',
  styleUrls: ['./upload-nfe.component.css']
})
export class UploadNfeComponent {
  private router = inject(Router);
  private nfe = inject(NfeService);
  // TODO: integre com seu AuthService para pegar a loja do usuário logado
  lojaId: number | null = null;           // preencha aqui ou exiba o campo na tela
  fornecedorId?: number;                  // opcional
  file?: File;
  loading = false; error?: string;

  onFileChange(ev: Event) {
    const input = ev.target as HTMLInputElement;
    if (input.files?.length) { this.file = input.files[0]; this.error = undefined; }
  }

  enviar() {
    if (!this.file) { this.error = 'Selecione um XML (.xml).'; return; }
    if (!this.file.name.toLowerCase().endsWith('.xml')) { this.error = 'Arquivo inválido: somente .xml'; return; }
    if (!this.lojaId) { this.error = 'Informe o Id da loja (Idloja).'; return; }

    this.loading = true; this.error = undefined;
    this.nfe.uploadXml(this.file, this.lojaId, this.fornecedorId).subscribe({
      next: (resp) => {
        this.loading = false;
        const id = (resp as any).Idnfe;     // <- backend retorna Idnfe
        this.router.navigate(['/compras/nfe', id, 'conciliar']);
      },
      error: (err) => { this.loading = false; this.error = err?.error?.detail || 'Falha ao enviar XML.'; }
    });
  }
}
