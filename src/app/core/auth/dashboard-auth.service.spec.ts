import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DashboardAuthService } from './dashboard-auth.service';
import { DashboardSessionService } from './dashboard-session.service';
import { DashboardUser } from './dashboard-user.model';
import { OneHealthDataService } from '../data/one-health-data.service';

describe('Dashboard auth session isolation', () => {
  let auth: DashboardAuthService;
  let http: HttpTestingController;
  let session: jasmine.SpyObj<DashboardSessionService>;
  let data: jasmine.SpyObj<OneHealthDataService>;
  const user: DashboardUser = {
    id: 'A',
    role: 'user',
    hubRoles: ['hub_viewer'],
    hubCountryCodes: ['CM'],
    email: 'test@example.invalid',
    firstName: 'Test',
    lastName: '',
    username: 'test',
    institution: '',
    typeMedecin: '',
    country: '',
    city: '',
    phone: '',
    bio: '',
    photoURL: '',
    coverPhotoURL: '',
    isCertified: false,
    certificationStatus: 'none',
    lastSeenAt: '',
    createdAt: '',
    updatedAt: '',
  };
  beforeEach(() => {
    session = jasmine.createSpyObj('Session', ['getToken', 'setToken', 'clear']);
    session.getToken.and.returnValue('test-session');
    data = jasmine.createSpyObj('HubData', ['reset']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DashboardSessionService, useValue: session },
        { provide: OneHealthDataService, useValue: data },
      ],
    });
    auth = TestBed.inject(DashboardAuthService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('clears local data immediately and ignores a restoration arriving after logout', async () => {
    const restore = auth.restoreSession();
    const me = http.expectOne((r) => r.url.endsWith('/auth/me'));
    const logout = auth.logout();
    expect(data.reset).toHaveBeenCalled();
    expect(session.clear).toHaveBeenCalled();
    expect(auth.currentUser()).toBeNull();
    me.flush(user);
    expect(await restore).toBeNull();
    http.expectOne((r) => r.url.endsWith('/auth/logout')).flush({});
    await logout;
    expect(auth.currentUser()).toBeNull();
  });

  it('ignores a late old logout after a new successful login', async () => {
    const logout = auth.logout();
    const old = http.expectOne((r) => r.url.endsWith('/auth/logout'));
    const login = auth.login('test@example.invalid', 'test-only');
    http
      .expectOne((r) => r.url.endsWith('/auth/login'))
      .flush({ user, accessToken: 'new-test-session' });
    await login;
    old.flush({});
    await logout;
    expect(auth.currentUser()).toEqual(user);
    expect(session.clear).toHaveBeenCalledTimes(1);
  });

  it('does not apply a profile response after changing session', async () => {
    auth.currentUser.set(user);
    const update = auth.updateProfile({
      firstName: 'Test',
      lastName: '',
      username: 'test',
      institution: '',
      typeMedecin: '',
      country: '',
      city: '',
      phone: '',
      bio: '',
    });
    const rejected = expectAsync(update).toBeRejected();
    const profile = http.expectOne((r) => r.url.endsWith('/users/me'));
    const logout = auth.logout();
    profile.flush(user);
    await rejected;
    http.expectOne((r) => r.url.endsWith('/auth/logout')).flush({});
    await logout;
    expect(auth.currentUser()).toBeNull();
  });
});
