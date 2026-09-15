import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { DashboardAuthService } from '../../core/auth/dashboard-auth.service';
import { DashboardUser } from '../../core/auth/dashboard-user.model';
import { AlertRegistryStore } from './alert-registry.store';

describe('Alert registry server pagination', () => {
  const user: DashboardUser = {
    id: 'test', role: 'user', hubRoles: ['hub_viewer'], hubCountryCodes: ['CM'],
    email: 'viewer@example.test', firstName: 'Test', lastName: 'Viewer', username: 'viewer',
    institution: '', typeMedecin: '', country: 'CM', city: '', phone: '', bio: '',
    photoURL: '', coverPhotoURL: '', isCertified: false, certificationStatus: 'none',
    lastSeenAt: '', createdAt: '', updatedAt: '',
  };
  let currentUser: ReturnType<typeof signal<DashboardUser | null>>;
  let store: AlertRegistryStore;
  let http: HttpTestingController;
  beforeEach(() => {
    currentUser = signal<DashboardUser | null>(user);
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(), AlertRegistryStore,
      { provide: DashboardAuthService, useValue: { currentUser } },
    ] });
    store = TestBed.inject(AlertRegistryStore);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  function open(): void {
    TestBed.flushEffects();
    http.expectOne((r) => r.url.endsWith('/summary')).flush({ total: 165, byStage: { observation: 149, signal: 13, 'verified-alert': 3 }, simulated: true });
    tick(250);
  }
  it('fetches only one page and uses the server total rather than the item count', fakeAsync(() => {
    open();
    const request = http.expectOne((r) => r.url.endsWith('/observations'));
    expect(request.request.params.get('limit')).toBe('8');
    expect(request.request.params.get('view')).toBe('priority');
    request.flush({ items: [], total: 16, page: 1, pages: 2, limit: 8 });
    expect(store.total()).toBe(16);
    expect(store.summary()?.total).toBe(165);
    store.currentPage.set(2);
    TestBed.flushEffects(); tick(250);
    const next = http.expectOne((r) => r.params.get('page') === '2');
    next.flush({ items: [], total: 16, page: 2, pages: 2, limit: 8 });
    http.expectNone((r) => r.url.endsWith('/summary'));
  }));
  it('cancels obsolete searches and requests no data after logout', fakeAsync(() => {
    open();
    const first = http.expectOne((r) => r.url.endsWith('/observations'));
    store.searchTerm.set('choléra');
    TestBed.flushEffects();
    expect(first.cancelled).toBeTrue();
    tick(250);
    const second = http.expectOne((r) => r.params.get('search') === 'choléra');
    currentUser.set(null);
    TestBed.flushEffects();
    expect(second.cancelled).toBeTrue();
    expect(store.items()).toEqual([]);
    expect(store.summary()).toBeNull();
    tick(300);
    http.expectNone(() => true);
  }));
  it('shows errors without falling back to mock observations', fakeAsync(() => {
    open();
    http.expectOne((r) => r.url.endsWith('/observations')).flush({}, { status: 503, statusText: 'Unavailable' });
    expect(store.loading()).toBeFalse();
    expect(store.error()).not.toBe('');
    expect(store.items()).toEqual([]);
  }));
  it('coalesces rapid filter changes and carries them to the API', fakeAsync(() => {
    TestBed.flushEffects();
    http.expectOne((r) => r.url.endsWith('/summary')).flush({ total: 0 });
    tick(100); store.searchTerm.set('a'); TestBed.flushEffects();
    tick(100); store.searchTerm.set('ab'); store.selectedCountry.set('CM'); TestBed.flushEffects();
    tick(249); http.expectNone((r) => r.url.endsWith('/observations'));
    tick(1);
    http.expectOne((r) => r.params.get('search') === 'ab' && r.params.get('countryCode') === 'CM')
      .flush({ items: [], total: 0, pages: 1, page: 1, limit: 8 });
    expect(store.loading()).toBeFalse();
    expect(store.total()).toBe(0);
  }));
});
