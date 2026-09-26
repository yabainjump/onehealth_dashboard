import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { AppShellComponent } from './app-shell.component';
import { DashboardAuthService } from '../../core/auth/dashboard-auth.service';
import { OneHealthDataService } from '../../core/data/one-health-data.service';

describe('AppShellComponent logout privacy', () => {
  const configure = () => {
    const currentUser = signal<unknown | null>(null);
    let finishRevocation!: () => void;
    const revocation = new Promise<void>((resolve) => {
      finishRevocation = resolve;
    });
    const auth = {
      currentUser,
      canAnalyze: () => false,
      canManageHubUsers: () => false,
      logout: jasmine.createSpy('logout').and.callFake(() => {
        currentUser.set(null);
        return revocation;
      }),
    };
    TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: DashboardAuthService, useValue: auth },
        { provide: OneHealthDataService, useValue: { dataMode: signal('api') } },
      ],
    });
    const fixture = TestBed.createComponent(AppShellComponent);
    return { fixture, auth, finishRevocation };
  };

  it('does not mount any protected shell content without a current user', () => {
    const { fixture } = configure();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.shell')).toBeNull();
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeNull();
  });

  it('navigates before server logout completes', async () => {
    const { fixture, finishRevocation } = configure();
    const router = TestBed.inject(Router);
    const navigate = spyOn(router, 'navigateByUrl').and.resolveTo(true);
    const logout = (fixture.componentInstance as unknown as { logout(): Promise<void> }).logout();
    expect(navigate).toHaveBeenCalledWith('/connexion');
    finishRevocation();
    await logout;
  });
});
