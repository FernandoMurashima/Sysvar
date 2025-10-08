import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PedidosCompraListComponent } from './pedidos-compra-list.component';

describe('PedidosCompraListComponent', () => {
  let component: PedidosCompraListComponent;
  let fixture: ComponentFixture<PedidosCompraListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PedidosCompraListComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PedidosCompraListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
