import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpClientService } from './http-client.service';
describe('HttpClientService', () => {
  it('creates with the application HTTP provider', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    expect(TestBed.inject(HttpClientService)).toBeTruthy();
  });
});
