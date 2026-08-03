import {
  buildDemoSharingPolicies,
  normalizeSharingPolicy,
  validateSharingPolicy,
} from './sharing-policy-presenter';

describe('sharing policy presenter', () => {
  it('builds one demonstration policy per CEEAC country', () => {
    const policies = buildDemoSharingPolicies();
    expect(policies.length).toBe(11);
    expect(new Set(policies.map((policy) => policy.countryOwner)).size).toBe(11);
  });

  it('removes personal and precise data from a public policy', () => {
    const policy = normalizeSharingPolicy({
      sharingLevel: 'PUBLIC_AGGREGATED',
      allowedRoles: ['hub_viewer'],
      allowedCountries: ['CM'],
      aggregationLevel: 'POINT',
      retentionPeriodDays: 90,
      containsPersonalData: true,
    });
    expect(policy.allowedCountries).toEqual([]);
    expect(policy.aggregationLevel).toBe('COUNTRY');
    expect(policy.containsPersonalData).toBeFalse();
  });

  it('requires a country for explicit country sharing', () => {
    const input = normalizeSharingPolicy({
      sharingLevel: 'AUTHORIZED_COUNTRIES',
      allowedRoles: ['hub_analyst'],
      allowedCountries: [],
      aggregationLevel: 'ADMIN_1',
      retentionPeriodDays: 365,
      containsPersonalData: false,
    });
    expect(validateSharingPolicy(input)).toContain('pays');
  });
});
