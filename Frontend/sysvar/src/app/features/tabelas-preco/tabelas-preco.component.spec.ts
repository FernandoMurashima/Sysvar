import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TabelasPrecoComponent } from './tabelas-preco.component';

describe('TabelasPrecoComponent', () => {
  let component: TabelasPrecoComponent;
  let fixture: ComponentFixture<TabelasPrecoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabelasPrecoComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TabelasPrecoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
