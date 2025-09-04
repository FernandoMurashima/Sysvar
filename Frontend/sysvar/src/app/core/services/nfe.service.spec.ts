import { TestBed } from '@angular/core/testing';

import { NfeService } from './nfe.service';

describe('NfeService', () => {
  let service: NfeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NfeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
