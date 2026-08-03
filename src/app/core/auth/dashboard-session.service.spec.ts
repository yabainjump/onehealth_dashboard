import { DashboardSessionService } from './dashboard-session.service';

describe('DashboardSessionService', () => {
  let service: DashboardSessionService;

  beforeEach(() => {
    sessionStorage.clear();
    service = new DashboardSessionService();
  });

  afterEach(() => sessionStorage.clear());

  it('stores a structurally valid JWT only for the browser session', () => {
    const token = `${'a'.repeat(24)}.${'b'.repeat(24)}.${'c'.repeat(24)}`;

    service.setToken(token);

    expect(service.getToken()).toBe(token);
    expect(localStorage.getItem('ohn_hub_session_token')).toBeNull();
  });

  it('rejects malformed tokens and clears the active session', () => {
    expect(() => service.setToken('not-a-token')).toThrowError(
      'Jeton de session invalide',
    );

    const token = `${'a'.repeat(24)}.${'b'.repeat(24)}.${'c'.repeat(24)}`;
    service.setToken(token);
    service.clear();
    expect(service.getToken()).toBeNull();
  });
});
