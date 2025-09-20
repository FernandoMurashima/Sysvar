import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConciliarNfeComponent } from './conciliar-nfe.component';

describe('ConciliarNfeComponent', () => {
  let component: ConciliarNfeComponent;
  let fixture: ComponentFixture<ConciliarNfeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConciliarNfeComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ConciliarNfeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
