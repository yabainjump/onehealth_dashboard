import { HubRole } from '../../core/auth/dashboard-user.model';
import {
  HubAggregationLevel,
  HubSharingLevel,
  HubSharingPolicyApi,
  UpdateHubSharingPolicyInput,
} from '../../core/data/hub-api.service';
import { CEEAC_COUNTRIES } from '../../core/data/mock/ceeac-reference';

export const SHARING_LEVEL_LABELS: Readonly<Record<HubSharingLevel, string>> = {
  OWNER_ONLY: 'État propriétaire uniquement',
  OWNER_AND_CEEAC: 'État propriétaire et CEEAC',
  AUTHORIZED_COUNTRIES: 'Pays explicitement autorisés',
  REGIONAL_AUTHORIZED: 'Partage régional autorisé',
  PUBLIC_AGGREGATED: 'Données agrégées publiques',
};

export const AGGREGATION_LABELS: Readonly<Record<HubAggregationLevel, string>> = {
  POINT: 'Coordonnée précise',
  ADMIN_1: 'Niveau administratif 1',
  COUNTRY: 'Niveau national',
  REGIONAL: 'Niveau régional',
};

const ALL_ROLES: readonly HubRole[] = [
  'hub_viewer',
  'hub_analyst',
  'hub_verifier',
  'hub_admin',
];
const ALL_COUNTRIES = CEEAC_COUNTRIES.map((country) => country.code);

export function buildDemoSharingPolicies(): readonly HubSharingPolicyApi[] {
  return CEEAC_COUNTRIES.map((country) => ({
    policyId: `POLICY-DEMO-${country.code}`,
    countryOwner: country.code,
    sharingLevel: 'REGIONAL_AUTHORIZED',
    allowedRoles: ALL_ROLES,
    allowedCountries: ALL_COUNTRIES,
    aggregationLevel: 'ADMIN_1',
    retentionPeriodDays: 365,
    containsPersonalData: false,
    updatedAt: '2026-08-02T12:00:00.000Z',
    simulated: true,
  }));
}

export function normalizeSharingPolicy(
  input: UpdateHubSharingPolicyInput,
): UpdateHubSharingPolicyInput {
  const allowedRoles = ALL_ROLES.filter((role) => input.allowedRoles.includes(role));
  let allowedCountries = ALL_COUNTRIES.filter((code) => input.allowedCountries.includes(code));
  let aggregationLevel = input.aggregationLevel;
  let containsPersonalData = input.containsPersonalData;

  if (input.sharingLevel === 'REGIONAL_AUTHORIZED') {
    allowedCountries = ALL_COUNTRIES;
  }
  if (
    input.sharingLevel === 'OWNER_ONLY' ||
    input.sharingLevel === 'OWNER_AND_CEEAC' ||
    input.sharingLevel === 'PUBLIC_AGGREGATED'
  ) {
    allowedCountries = [];
  }
  if (input.sharingLevel === 'PUBLIC_AGGREGATED') {
    containsPersonalData = false;
    if (!['COUNTRY', 'REGIONAL'].includes(aggregationLevel)) {
      aggregationLevel = 'COUNTRY';
    }
  }

  return {
    sharingLevel: input.sharingLevel,
    allowedRoles: input.sharingLevel === 'OWNER_ONLY' ? [] : allowedRoles,
    allowedCountries,
    aggregationLevel,
    retentionPeriodDays: Math.min(3650, Math.max(1, Math.round(input.retentionPeriodDays))),
    containsPersonalData,
  };
}

export function validateSharingPolicy(input: UpdateHubSharingPolicyInput): string | null {
  if (input.sharingLevel === 'AUTHORIZED_COUNTRIES' && !input.allowedCountries.length) {
    return 'Sélectionnez au moins un pays explicitement autorisé.';
  }
  return null;
}

export function sharingLevelTone(
  level: HubSharingLevel,
): 'restricted' | 'controlled' | 'regional' | 'public' {
  if (level === 'OWNER_ONLY') return 'restricted';
  if (level === 'PUBLIC_AGGREGATED') return 'public';
  if (level === 'REGIONAL_AUTHORIZED') return 'regional';
  return 'controlled';
}
