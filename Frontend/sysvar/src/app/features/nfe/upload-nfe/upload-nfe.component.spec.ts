import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UploadNfeComponent } from './upload-nfe.component';

describe('UploadNfeComponent', () => {
  let component: UploadNfeComponent;
  let fixture: ComponentFixture<UploadNfeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UploadNfeComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UploadNfeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
