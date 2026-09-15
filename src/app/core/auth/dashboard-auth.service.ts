import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DashboardProfileUpdate, DashboardUser, LoginResponse } from './dashboard-user.model';
import { DashboardSessionService } from './dashboard-session.service';
import { OneHealthDataService } from '../data/one-health-data.service';

export class DashboardLoginError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

@Injectable({ providedIn: 'root' })
export class DashboardAuthService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(DashboardSessionService);
  private readonly hubData = inject(OneHealthDataService);
  private restorePromise: Promise<DashboardUser | null> | null = null;
  private sessionVersion = 0;

  readonly currentUser = signal<DashboardUser | null>(null);

  async login(email: string, password: string): Promise<DashboardUser> {
    const version = ++this.sessionVersion;
    this.restorePromise = null;
    this.hubData.reset();
    try {
      const response = await firstValueFrom(
        this.http.post<LoginResponse>(`${environment.apiBaseUrl}/auth/login`, {
          email: email.trim().toLowerCase(),
          password,
        }),
      );
      if (version !== this.sessionVersion)
        throw new Error('Connexion remplacée par une nouvelle session.');
      this.session.setToken(response.accessToken);
      this.currentUser.set(response.user);
      return response.user;
    } catch (error: unknown) {
      if (version !== this.sessionVersion) throw error;
      this.session.clear();
      this.currentUser.set(null);
      if (error instanceof HttpErrorResponse) {
        const message =
          error.status === 0
            ? 'Le serveur One Health est momentanément inaccessible.'
            : error.status === 401
              ? 'Adresse e-mail ou mot de passe incorrect.'
              : 'La connexion a échoué. Veuillez réessayer.';
        throw new DashboardLoginError(error.status, message);
      }
      throw error;
    }
  }

  restoreSession(): Promise<DashboardUser | null> {
    if (this.currentUser()) {
      return Promise.resolve(this.currentUser());
    }
    if (!this.session.getToken()) {
      return Promise.resolve(null);
    }
    if (!this.restorePromise) {
      const version = this.sessionVersion;
      const token = this.session.getToken();
      this.restorePromise = firstValueFrom(
        this.http.get<DashboardUser>(`${environment.apiBaseUrl}/auth/me`),
      )
        .then((user) => {
          if (version !== this.sessionVersion || token !== this.session.getToken()) return null;
          this.currentUser.set(user);
          return user;
        })
        .catch(() => {
          if (version !== this.sessionVersion || token !== this.session.getToken()) return null;
          this.hubData.reset();
          this.session.clear();
          this.currentUser.set(null);
          return null;
        })
        .finally(() => {
          if (version === this.sessionVersion) this.restorePromise = null;
        });
    }
    return this.restorePromise;
  }

  hasHubAccess(user: DashboardUser | null = this.currentUser()): boolean {
    if (!user) return false;
    if (user.role === 'admin' || user.hubRoles.includes('hub_admin')) return true;
    return user.hubRoles.length > 0 && user.hubCountryCodes.length > 0;
  }

  canVerify(user: DashboardUser | null = this.currentUser()): boolean {
    return (
      !!user &&
      (user.role === 'admin' ||
        user.hubRoles.includes('hub_admin') ||
        user.hubRoles.includes('hub_verifier'))
    );
  }

  canAnalyze(user: DashboardUser | null = this.currentUser()): boolean {
    return (
      !!user &&
      (user.role === 'admin' ||
        user.hubRoles.some((role) => ['hub_admin', 'hub_verifier', 'hub_analyst'].includes(role)))
    );
  }

  canPublish(user: DashboardUser | null = this.currentUser()): boolean {
    return !!user && (user.role === 'admin' || user.hubRoles.includes('hub_admin'));
  }

  canManageConnectors(user: DashboardUser | null = this.currentUser()): boolean {
    return !!user && (user.role === 'admin' || user.hubRoles.includes('hub_admin'));
  }

  canManageHubUsers(user: DashboardUser | null = this.currentUser()): boolean {
    return !!user && user.role === 'admin';
  }

  async updateProfile(update: DashboardProfileUpdate): Promise<DashboardUser> {
    const version = this.sessionVersion;
    try {
      const user = await firstValueFrom(
        this.http.patch<DashboardUser>(`${environment.apiBaseUrl}/users/me`, update),
      );
      const previous = this.currentUser();
      if (version !== this.sessionVersion || previous?.id !== user.id) {
        throw new Error('Session modifiée pendant la mise à jour du profil.');
      }
      if (
        previous &&
        (previous.role !== user.role ||
          JSON.stringify(previous.hubRoles) !== JSON.stringify(user.hubRoles) ||
          JSON.stringify(previous.hubCountryCodes) !== JSON.stringify(user.hubCountryCodes))
      ) {
        this.hubData.reset();
      }
      this.currentUser.set(user);
      return user;
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse) {
        const message =
          error.status === 409
            ? "Ce nom d'utilisateur est déjà utilisé."
            : error.status === 400
              ? 'Certaines informations du profil sont invalides.'
              : error.status === 0
                ? 'Le serveur One Health est momentanément inaccessible.'
                : 'La mise à jour du profil a échoué.';
        throw new DashboardLoginError(error.status, message);
      }
      throw error;
    }
  }

  async logout(): Promise<void> {
    this.sessionVersion += 1;
    this.restorePromise = null;
    this.hubData.reset();
    // Subscribe while the old token still exists; erase local state immediately.
    const request = this.session.getToken()
      ? firstValueFrom(
          this.http.post(`${environment.apiBaseUrl}/auth/logout`, {}).pipe(timeout(10_000)),
        )
      : Promise.resolve();
    this.session.clear();
    this.currentUser.set(null);
    try {
      await request;
    } catch {
      // Never restore local credentials when the network logout fails.
    }
  }
}
