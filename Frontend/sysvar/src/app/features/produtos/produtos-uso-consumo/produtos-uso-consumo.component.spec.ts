import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProdutosUsoConsumoComponent } from './produtos-uso-consumo.component';

describe('ProdutosUsoConsumoComponent', () => {
  let component: ProdutosUsoConsumoComponent;
  let fixture: ComponentFixture<ProdutosUsoConsumoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProdutosUsoConsumoComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ProdutosUsoConsumoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
