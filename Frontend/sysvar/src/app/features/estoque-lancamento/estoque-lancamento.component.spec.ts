import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EstoqueLancamentoComponent } from './estoque-lancamento.component';

describe('EstoqueLancamentoComponent', () => {
  let component: EstoqueLancamentoComponent;
  let fixture: ComponentFixture<EstoqueLancamentoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EstoqueLancamentoComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EstoqueLancamentoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
