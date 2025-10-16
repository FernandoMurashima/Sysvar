import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConsultaReferenciaComponent } from './consulta-referencia.component';

describe('ConsultaReferenciaComponent', () => {
  let component: ConsultaReferenciaComponent;
  let fixture: ComponentFixture<ConsultaReferenciaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConsultaReferenciaComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ConsultaReferenciaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
