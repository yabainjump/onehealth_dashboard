import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DashboardUser, LoginResponse } from './dashboard-user.model';
import { DashboardSessionService } from './dashboard-session.service';

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
  private restorePromise: Promise<DashboardUser | null> | null = null;

  readonly currentUser = signal<DashboardUser | null>(null);

  async login(email: string, password: string): Promise<DashboardUser> {
    try {
      const response = await firstValueFrom(
        this.http.post<LoginResponse>(`${environment.apiBaseUrl}/auth/login`, {
          email: email.trim().toLowerCase(),
          password,
        }),
      );
      this.session.setToken(response.accessToken);
      this.currentUser.set(response.user);
      return response.user;
    } catch (error: unknown) {
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
      this.restorePromise = firstValueFrom(
        this.http.get<DashboardUser>(`${environment.apiBaseUrl}/auth/me`),
      )
        .then((user) => {
          this.currentUser.set(user);
          return user;
        })
        .catch(() => {
          this.session.clear();
          this.currentUser.set(null);
          return null;
        })
        .finally(() => {
          this.restorePromise = null;
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

  canManageConnectors(user: DashboardUser | null = this.currentUser()): boolean {
    return !!user && (user.role === 'admin' || user.hubRoles.includes('hub_admin'));
  }

  canManageHubUsers(user: DashboardUser | null = this.currentUser()): boolean {
    return !!user && user.role === 'admin';
  }

  async logout(): Promise<void> {
    if (this.session.getToken()) {
      try {
        await firstValueFrom(this.http.post(`${environment.apiBaseUrl}/auth/logout`, {}));
      } catch {
        // La session locale doit toujours être supprimée, même hors ligne.
      }
    }
    this.session.clear();
    this.currentUser.set(null);
  }
}
