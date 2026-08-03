import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HubRole } from '../auth/dashboard-user.model';

export interface HubManagedUser {
  readonly id: string;
  readonly email: string;
  readonly username: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly institution: string;
  readonly country: string;
  readonly role: 'user' | 'admin';
  readonly hubRoles: readonly HubRole[];
  readonly hubCountryCodes: readonly string[];
  readonly isCertified: boolean;
  readonly isBanned: boolean;
  readonly lastSeenAt: string;
}

export interface HubManagedUserPage {
  readonly items: readonly HubManagedUser[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
}

@Injectable({ providedIn: 'root' })
export class HubAdminApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/admin/users`;

  listUsers(search: string, page: number, limit: number): Promise<HubManagedUserPage> {
    const params: Record<string, string | number> = { page, limit };
    if (search) params['search'] = search;
    return firstValueFrom(this.http.get<HubManagedUserPage>(this.baseUrl, { params }));
  }

  setHubAccess(
    userId: string,
    roles: readonly HubRole[],
    countryCodes: readonly string[],
  ): Promise<HubManagedUser> {
    return firstValueFrom(
      this.http.patch<HubManagedUser>(
        `${this.baseUrl}/${encodeURIComponent(userId)}/hub-access`,
        { roles, countryCodes },
      ),
    );
  }
}
