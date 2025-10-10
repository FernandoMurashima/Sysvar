import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormaPagamentosComponent } from './forma-pagamentos.component';

describe('FormaPagamentosComponent', () => {
  let component: FormaPagamentosComponent;
  let fixture: ComponentFixture<FormaPagamentosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormaPagamentosComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FormaPagamentosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
