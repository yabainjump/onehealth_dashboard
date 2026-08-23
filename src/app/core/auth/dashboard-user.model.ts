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
  readonly typeMedecin: string;
  readonly country: string;
  readonly city: string;
  readonly phone: string;
  readonly bio: string;
  readonly photoURL: string;
  readonly coverPhotoURL: string;
  readonly isCertified: boolean;
  readonly certificationStatus: 'none' | 'pending' | 'approved' | 'rejected';
  readonly lastSeenAt: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface DashboardProfileUpdate {
  readonly username: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly institution: string;
  readonly typeMedecin: string;
  readonly country: string;
  readonly city: string;
  readonly phone: string;
  readonly bio: string;
}

export interface LoginResponse {
  readonly accessToken: string;
  readonly tokenType: 'Bearer';
  readonly expiresIn: string;
  readonly user: DashboardUser;
}
