import { routes } from './app.routes';

describe('Dashboard routes', () => {
  it('exposes a public landing page without a Hub resolver or authentication guard', () => {
    const landingRoute = routes.find((route) => route.path === '' && route.pathMatch === 'full');

    expect(landingRoute).toBeDefined();
    expect(landingRoute?.loadComponent).toBeDefined();
    expect(landingRoute?.canActivate).toBeUndefined();
    expect(landingRoute?.resolve).toBeUndefined();
  });

  it('keeps the operational dashboard inside the authenticated Hub shell', () => {
    const protectedShell = routes.find((route) => route.path === '' && route.pathMatch !== 'full');
    const dashboardRoute = protectedShell?.children?.find((route) => route.path === 'dashboard');

    expect(protectedShell?.canActivate?.length).toBeGreaterThan(0);
    expect(protectedShell?.resolve).toBeUndefined();
    expect(dashboardRoute?.resolve?.['hubData']).toBeDefined();
    for (const path of ['alertes', 'aide', 'profil', 'administration', 'connecteurs', 'souverainete']) {
      expect(protectedShell?.children?.find((route) => route.path === path)?.resolve).toBeUndefined();
    }
    expect(dashboardRoute?.loadComponent).toBeDefined();
  });

  it('redirects unknown public URLs to the landing page', () => {
    const wildcard = routes.find((route) => route.path === '**');

    expect(wildcard?.redirectTo).toBe('');
  });
});
