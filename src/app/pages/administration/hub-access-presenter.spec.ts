import { normalizeHubAccess, validateHubAccess } from './hub-access-presenter';

describe('hub access presenter', () => {
  it('normalizes and deduplicates scoped access', () => {
    const access = normalizeHubAccess(
      ['hub_verifier', 'hub_viewer', 'hub_viewer'],
      ['cm', 'CM', 'ga'],
    );
    expect(access.roles).toEqual(['hub_viewer', 'hub_verifier']);
    expect(access.countryCodes).toEqual(['CM', 'GA']);
  });

  it('turns Hub administration into unrestricted access', () => {
    const access = normalizeHubAccess(['hub_viewer', 'hub_admin'], ['CM']);
    expect(access).toEqual({ roles: ['hub_admin'], countryCodes: [] });
  });

  it('requires a country for non-administrator roles', () => {
    expect(validateHubAccess(normalizeHubAccess(['hub_analyst'], []))).toContain('pays');
    expect(validateHubAccess(normalizeHubAccess([], []))).toBeNull();
  });
});
