import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProdutosPrecoOverlayComponent } from './produtos-preco-overlay.component';

describe('ProdutosPrecoOverlayComponent', () => {
  let component: ProdutosPrecoOverlayComponent;
  let fixture: ComponentFixture<ProdutosPrecoOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProdutosPrecoOverlayComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ProdutosPrecoOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
