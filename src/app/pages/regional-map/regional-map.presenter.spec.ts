import { HubEventApi } from '../../core/data/hub-api.service';
import { OneHealthObservation } from '../../core/data/models/one-health-observation.model';
import {
  buildMapTimeline,
  filterObservationsByDateRange,
  filterObservationsAt,
  observationsForEvent,
} from './regional-map.presenter';

const observation = (id: string, observedAt: string): OneHealthObservation => ({
  id,
  observedAt,
  sourceSystem: 'DHIS2',
  sourceRecordId: id,
  sector: 'human',
  countryCode: 'CMR',
  countryName: 'Cameroun',
  adminArea: 'Centre',
  latitude: 3.86,
  longitude: 11.51,
  receivedAt: observedAt,
  category: 'test',
  title: id,
  summary: 'Donnée de test',
  stage: 'observation',
  severity: 'low',
  metrics: [],
  simulated: true,
});

describe('regional map presenter', () => {
  const observations = [
    observation('first', '2026-01-01T00:00:00.000Z'),
    observation('middle', '2026-01-02T00:00:00.000Z'),
    observation('last', '2026-01-03T00:00:00.000Z'),
  ];

  it('clamps the timeline and calculates its cutoff', () => {
    expect(buildMapTimeline(observations, 50)?.cutoffMs).toBe(
      Date.parse('2026-01-02T00:00:00.000Z'),
    );
    expect(buildMapTimeline(observations, 120)?.cutoffMs).toBe(
      Date.parse('2026-01-03T00:00:00.000Z'),
    );
  });

  it('only exposes observations received before the playback cutoff', () => {
    const cutoff = Date.parse('2026-01-02T00:00:00.000Z');
    expect(filterObservationsAt(observations, cutoff).map(({ id }) => id)).toEqual([
      'first',
      'middle',
    ]);
  });

  it('filters an inclusive custom date range', () => {
    expect(
      filterObservationsByDateRange(observations, {
        from: '2026-01-02',
        to: '2026-01-03',
      }).map(({ id }) => id),
    ).toEqual(['middle', 'last']);
  });

  it('rejects an inverted custom date range', () => {
    expect(
      filterObservationsByDateRange(observations, {
        from: '2026-01-03',
        to: '2026-01-01',
      }),
    ).toEqual([]);
  });

  it('draws correlations only from observation ids consolidated by the Hub', () => {
    const event: HubEventApi = {
      eventCode: 'EVT-1',
      title: 'Rapprochement de test',
      status: 'CONSOLIDATED',
      observationIds: ['first', 'last'],
      countryCodes: ['CMR'],
      sectors: ['human'],
      longitude: 11.51,
      latitude: 3.86,
      maxDistanceKm: 25,
      timeWindowHours: 72,
      correlationScore: 0.8,
      correlationReasons: ['Fenêtre temporelle'],
      ruleVersion: 'test-v1',
      scenarioId: 'scenario-test',
      firstObservedAt: '2026-01-01T00:00:00.000Z',
      lastObservedAt: '2026-01-03T00:00:00.000Z',
      consolidatedBy: 'test',
      consolidatedAt: '2026-01-03T01:00:00.000Z',
      simulated: true,
    };

    expect(observationsForEvent(event, observations).map(({ id }) => id)).toEqual([
      'first',
      'last',
    ]);
  });
});
