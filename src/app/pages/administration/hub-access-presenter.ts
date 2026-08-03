import { HubRole } from '../../core/auth/dashboard-user.model';

export interface NormalizedHubAccess {
  readonly roles: readonly HubRole[];
  readonly countryCodes: readonly string[];
}

const ROLE_ORDER: readonly HubRole[] = [
  'hub_viewer',
  'hub_analyst',
  'hub_verifier',
  'hub_admin',
];

export function normalizeHubAccess(
  roles: readonly HubRole[],
  countryCodes: readonly string[],
): NormalizedHubAccess {
  const uniqueRoles = ROLE_ORDER.filter((role) => roles.includes(role));
  if (uniqueRoles.includes('hub_admin')) {
    return { roles: ['hub_admin'], countryCodes: [] };
  }
  return {
    roles: uniqueRoles,
    countryCodes: [...new Set(countryCodes.map((code) => code.trim().toUpperCase()).filter(Boolean))],
  };
}

export function validateHubAccess(access: NormalizedHubAccess): string | null {
  if (
    access.roles.length > 0 &&
    !access.roles.includes('hub_admin') &&
    access.countryCodes.length === 0
  ) {
    return 'Sélectionnez au moins un pays pour les rôles à portée nationale.';
  }
  return null;
}
