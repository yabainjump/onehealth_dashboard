import { OneHealthObservation } from '../../core/data/models/one-health-observation.model';
import {
  CEEAC_TERRITORY_COLORS,
  countryStyle,
  summarizeCeeacCountry,
} from './ceeac-boundaries.util';

describe('CEEAC boundaries utilities', () => {
  it('summarizes only the visible observations of the requested country', () => {
    const observations = [
      {
        countryCode: 'CM',
        stage: 'observation',
        sector: 'human',
        severity: 'low',
        observedAt: '2026-08-01T08:00:00.000Z',
      },
      {
        countryCode: 'CM',
        stage: 'signal',
        sector: 'animal',
        severity: 'high',
        observedAt: '2026-08-02T08:00:00.000Z',
      },
      {
        countryCode: 'CM',
        stage: 'verified-alert',
        sector: 'environment',
        severity: 'critical',
        observedAt: '2026-08-03T08:00:00.000Z',
      },
      {
        countryCode: 'GA',
        stage: 'signal',
        sector: 'human',
        severity: 'medium',
        observedAt: '2026-08-04T08:00:00.000Z',
      },
    ] as OneHealthObservation[];

    expect(summarizeCeeacCountry('CM', observations)).toEqual({
      observations: 3,
      signals: 1,
      verifiedAlerts: 1,
      sectors: ['Humaine', 'Animale', 'Environnement'],
      latestObservedAt: '2026-08-03T08:00:00.000Z',
      level: 'high',
    });
  });

  it('removes only the unselected country fills while a country is selected', () => {
    const summary = {
      observations: 2,
      signals: 1,
      verifiedAlerts: 0,
      sectors: ['Humaine'],
      latestObservedAt: '2026-08-03T08:00:00.000Z',
      level: 'medium' as const,
    };

    expect(
      countryStyle(
        summary,
        {
          highlighted: true,
          selected: false,
          selectionActive: true,
        },
        'CM',
      ).fillOpacity,
    ).toBe(0);
    const selectedStyle = countryStyle(
      summary,
      {
        highlighted: false,
        selected: true,
        selectionActive: true,
      },
      'CM',
    );
    expect(selectedStyle.fillOpacity).toBeGreaterThan(0);
    expect(selectedStyle.color).toBe('#a9693d');
    expect(selectedStyle.fillColor).toBe('#f5cfb3');
  });

  it('defines one territory palette for every CEEAC member state', () => {
    expect(Object.keys(CEEAC_TERRITORY_COLORS).sort()).toEqual(
      ['AO', 'BI', 'CD', 'CF', 'CG', 'CM', 'GA', 'GQ', 'RW', 'ST', 'TD'],
    );
  });
});
