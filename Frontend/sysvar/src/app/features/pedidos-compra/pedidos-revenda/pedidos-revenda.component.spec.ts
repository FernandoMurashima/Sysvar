import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PedidosRevendaComponent } from './pedidos-revenda.component';

describe('PedidosRevendaComponent', () => {
  let component: PedidosRevendaComponent;
  let fixture: ComponentFixture<PedidosRevendaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PedidosRevendaComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PedidosRevendaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
