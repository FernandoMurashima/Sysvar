import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LojasSelectorComponent } from './lojas-selector.component';

describe('LojasSelectorComponent', () => {
  let component: LojasSelectorComponent;
  let fixture: ComponentFixture<LojasSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LojasSelectorComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LojasSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
