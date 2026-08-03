import { Injectable } from '@angular/core';

const TOKEN_KEY = 'ohn_hub_session_token';

@Injectable({ providedIn: 'root' })
export class DashboardSessionService {
  getToken(): string | null {
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  setToken(token: string): void {
    const normalized = token.trim();
    if (
      normalized.length < 20 ||
      normalized.length > 8192 ||
      !/^[A-Za-z0-9_=-]+\.[A-Za-z0-9_=-]+\.[A-Za-z0-9_=-]+$/.test(normalized)
    ) {
      throw new Error('Jeton de session invalide');
    }

    sessionStorage.setItem(TOKEN_KEY, normalized);
  }

  clear(): void {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      // Le navigateur peut interdire le stockage en mode privé strict.
    }
  }
}
