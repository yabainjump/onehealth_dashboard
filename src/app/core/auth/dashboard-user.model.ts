export type HubRole = 'hub_viewer' | 'hub_analyst' | 'hub_verifier' | 'hub_admin';

export interface DashboardUser {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly username: string;
  readonly institution: string;
  readonly role: 'user' | 'admin';
  readonly hubRoles: readonly HubRole[];
  readonly hubCountryCodes: readonly string[];
}

export interface LoginResponse {
  readonly accessToken: string;
  readonly tokenType: 'Bearer';
  readonly expiresIn: string;
  readonly user: DashboardUser;
}
