import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConsultaColestComponent } from './consulta-colest.component';

describe('ConsultaColestComponent', () => {
  let component: ConsultaColestComponent;
  let fixture: ComponentFixture<ConsultaColestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConsultaColestComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ConsultaColestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
