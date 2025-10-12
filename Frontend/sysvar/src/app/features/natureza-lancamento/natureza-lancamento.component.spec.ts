import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NaturezaLancamentoComponent } from './natureza-lancamento.component';

describe('NaturezaLancamentoComponent', () => {
  let component: NaturezaLancamentoComponent;
  let fixture: ComponentFixture<NaturezaLancamentoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NaturezaLancamentoComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(NaturezaLancamentoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
