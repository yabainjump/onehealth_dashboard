import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { AppShellComponent } from './app-shell.component';
import { DashboardAuthService } from '../../core/auth/dashboard-auth.service';
import { OneHealthDataService } from '../../core/data/one-health-data.service';
import { HubAiApiService } from '../../core/data/hub-ai-api.service';

describe('AppShellComponent logout privacy', () => {
  const configure = (initialUser: unknown | null = null) => {
    const currentUser = signal<unknown | null>(initialUser);
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
    const hubAi = {
      ask: jasmine.createSpy('ask').and.resolveTo({
        content: '## Synthèse\n\nSituation régionale stable.',
        mode: 'assistant',
        model: 'test-model',
        generatedAt: '2026-09-27T00:00:00.000Z',
        sourceIds: [],
        humanValidationRequired: true,
      }),
    };
    TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: DashboardAuthService, useValue: auth },
        { provide: OneHealthDataService, useValue: { dataMode: signal('api') } },
        { provide: HubAiApiService, useValue: hubAi },
      ],
    });
    const fixture = TestBed.createComponent(AppShellComponent);
    return { fixture, auth, hubAi, finishRevocation };
  };

  it('does not mount any protected shell content without a current user', () => {
    const { fixture } = configure();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.shell')).toBeNull();
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeNull();
  });

  it('renders the protected shell for an authenticated Hub user', () => {
    const { fixture } = configure({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.invalid',
      institution: 'CEEAC',
      role: 'user',
      hubRoles: ['hub_viewer'],
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.shell')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.topbar')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('router-outlet')).not.toBeNull();
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

  it('keeps the Hub Rudolf exchange in an in-memory session thread', async () => {
    const { fixture, hubAi } = configure({
      firstName: 'Hub',
      lastName: 'Analyst',
      email: 'analyst@example.invalid',
      institution: 'CEEAC',
      role: 'user',
      hubRoles: ['hub_analyst'],
    });
    spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);
    const component = fixture.componentInstance as unknown as {
      assistantQuestion: { set(value: string): void };
      assistantMessages(): readonly { id: number; role: string; content: string }[];
      askRudolf(): Promise<void>;
    };

    component.assistantQuestion.set('Résume la situation régionale.');
    await component.askRudolf();

    expect(hubAi.ask).toHaveBeenCalledOnceWith('Résume la situation régionale.');
    expect(component.assistantMessages()).toEqual([
      { id: 1, role: 'user', content: 'Résume la situation régionale.' },
      { id: 2, role: 'assistant', content: '## Synthèse\n\nSituation régionale stable.' },
    ]);
  });
});
