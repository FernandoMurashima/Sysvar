import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmarNfeComponent } from './confirmar-nfe.component';

describe('ConfirmarNfeComponent', () => {
  let component: ConfirmarNfeComponent;
  let fixture: ComponentFixture<ConfirmarNfeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmarNfeComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ConfirmarNfeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
