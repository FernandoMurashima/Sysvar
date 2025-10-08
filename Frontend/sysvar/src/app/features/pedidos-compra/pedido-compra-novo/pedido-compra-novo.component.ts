import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { PedidosCompraService, PedidoCompraCreateDTO } from '../../../core/services/pedidos-compra.service';

@Component({
  standalone: true,
  selector: 'app-pedido-compra-novo',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './pedido-compra-novo.component.html',
  styleUrls: ['./pedido-compra-novo.component.css']
})
export class PedidoCompraNovoComponent {
  private fb = inject(FormBuilder);
  private service = inject(PedidosCompraService);
  private router = inject(Router);

  salvando = false;
  erro: string | null = null;

  form = this.fb.nonNullable.group({
    Idfornecedor: this.fb.nonNullable.control<number | null>(null, { validators: [Validators.required] }),
    Idloja: this.fb.nonNullable.control<number | null>(null, { validators: [Validators.required] }),
    Datapedido: this.fb.nonNullable.control<string>(''),   // opcional
    Dataentrega: this.fb.nonNullable.control<string>(''),  // opcional
    Documento: this.fb.nonNullable.control<string>(''),    // opcional
  });

  salvar(): void {
    this.erro = null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: PedidoCompraCreateDTO = {
      Idfornecedor: Number(raw.Idfornecedor),
      Idloja: Number(raw.Idloja),
      Datapedido: raw.Datapedido?.trim() ? raw.Datapedido : null,
      Dataentrega: raw.Dataentrega?.trim() ? raw.Dataentrega : null,
      Documento: raw.Documento?.trim() ? raw.Documento : null,
    };

    this.salvando = true;
    this.service.create(payload).subscribe({
      next: (_res: any) => {
        // depois podemos redirecionar para edição/detalhe quando houver
        this.router.navigateByUrl('/compras/pedidos');
      },
      error: (err) => {
        console.error(err);
        this.erro = 'Falha ao salvar pedido.';
        this.salvando = false;
      },
      complete: () => (this.salvando = false),
    });
  }

  cancelar(): void {
    this.router.navigateByUrl('/compras/pedidos');
  }
}
