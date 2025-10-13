import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModeloDocumentoComponent } from './modelo-documento.component';

describe('ModeloDocumentoComponent', () => {
  let component: ModeloDocumentoComponent;
  let fixture: ComponentFixture<ModeloDocumentoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModeloDocumentoComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ModeloDocumentoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
