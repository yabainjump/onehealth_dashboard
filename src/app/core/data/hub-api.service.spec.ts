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

  it('loads a scenario report through the protected Hub API path', fakeAsync(() => {
    let reportId = '';
    void service.getScenarioReport('SCN-CM/TD').then((report) => {
      reportId = report.reportId;
    });

    const request = http.expectOne((candidate) =>
      candidate.url.endsWith('/api/hub/demo/scenarios/SCN-CM%2FTD/report'),
    );
    expect(request.request.method).toBe('GET');
    request.flush({ reportId: 'SIM-SCN-CM-TD' });
    flushMicrotasks();

    expect(reportId).toBe('SIM-SCN-CM-TD');
  }));

  it('sends only the bounded scenario configuration to the Hub', fakeAsync(() => {
    const input = {
      sourceCountryCode: 'GA',
      comparisonCountryCode: 'CG',
      dateFrom: '2026-09-01',
      dateTo: '2026-09-20',
    } as const;
    void service.runScenario(input);

    const request = http.expectOne((candidate) =>
      candidate.url.endsWith('/api/hub/demo/scenario/run'),
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(input);
    request.flush({ scenarioCode: 'SCN-GA-CG-20260901-20260920' });
    flushMicrotasks();
  }));
});
