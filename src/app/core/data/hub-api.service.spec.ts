import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { fakeAsync, flushMicrotasks, TestBed } from '@angular/core/testing';
import { HubApiService } from './hub-api.service';

describe('HubApiService bounded loading', () => {
  let service: HubApiService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(HubApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('starts at most three pages and publishes only the complete result', fakeAsync(() => {
    let complete = false;
    void service.getAllObservations().then(() => {
      complete = true;
    });
    http.expectOne((r) => r.params.get('page') === '1').flush({ items: [], total: 700, pages: 7 });
    flushMicrotasks();
    const batch = http.match(() => true);
    expect(batch.map((r) => r.request.params.get('page'))).toEqual(['2', '3', '4']);
    expect(complete).toBeFalse();
    batch.forEach((request) => request.flush({ items: [] }));
    flushMicrotasks();
    const last = http.match(() => true);
    expect(last.map((r) => r.request.params.get('page'))).toEqual(['5', '6', '7']);
    last.forEach((request) => request.flush({ items: [] }));
    flushMicrotasks();
    expect(complete).toBeTrue();
  }));

  it('rejects an oversized dataset without launching additional pages', fakeAsync(() => {
    let rejected = false;
    void service.getAllObservations().catch(() => {
      rejected = true;
    });
    http.expectOne(() => true).flush({ items: [], total: 10_001, pages: 101 });
    flushMicrotasks();
    expect(rejected).toBeTrue();
    http.expectNone(() => true);
  }));

  it('cancels outstanding HTTP requests on scope invalidation', fakeAsync(() => {
    const controller = new AbortController();
    let rejected = false;
    void service.getAllObservations(controller.signal).catch(() => {
      rejected = true;
    });
    const request = http.expectOne(() => true);
    controller.abort();
    flushMicrotasks();
    expect(request.cancelled).toBeTrue();
    expect(rejected).toBeTrue();
    http.expectNone(() => true);
  }));
});
