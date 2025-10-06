import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProdutosSkuOverlayComponent } from './produtos-sku-overlay.component';

describe('ProdutosSkuOverlayComponent', () => {
  let component: ProdutosSkuOverlayComponent;
  let fixture: ComponentFixture<ProdutosSkuOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProdutosSkuOverlayComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ProdutosSkuOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
