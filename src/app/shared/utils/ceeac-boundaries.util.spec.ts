import { OneHealthObservation } from '../../core/data/models/one-health-observation.model';
import { summarizeCeeacCountry } from './ceeac-boundaries.util';

describe('CEEAC boundaries utilities', () => {
  it('summarizes only the visible observations of the requested country', () => {
    const observations = [
      { countryCode: 'CM', stage: 'observation' },
      { countryCode: 'CM', stage: 'signal' },
      { countryCode: 'CM', stage: 'verified-alert' },
      { countryCode: 'GA', stage: 'signal' },
    ] as OneHealthObservation[];

    expect(summarizeCeeacCountry('CM', observations)).toEqual({
      observations: 3,
      signals: 1,
      verifiedAlerts: 1,
    });
  });
});
