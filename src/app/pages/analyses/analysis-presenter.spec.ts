import { OneHealthObservation } from '../../core/data/models/one-health-observation.model';
import {
  buildAnalysisChart,
  buildCountryQualityScores,
  filterAnalysisObservations,
} from './analysis-presenter';

function observation(
  id: string,
  sector: OneHealthObservation['sector'],
  countryCode: string,
  observedAt: string,
  value: number,
  stage: OneHealthObservation['stage'] = 'observation',
): OneHealthObservation {
  return {
    id,
    sourceSystem: sector === 'human' ? 'DHIS2' : sector === 'animal' ? 'ARIS 3' : 'CAPC-AC',
    sourceRecordId: id.replace('OBS-', ''),
    sector,
    countryCode,
    countryName: countryCode === 'CM' ? 'Cameroun' : 'Gabon',
    adminArea: 'Zone test',
    latitude: 4,
    longitude: 12,
    observedAt,
    receivedAt: observedAt,
    category: 'Démonstration',
    title: 'Observation test',
    summary: 'Résumé test',
    stage,
    severity: stage === 'observation' ? 'low' : 'high',
    metrics: [{ label: 'Valeur', value }],
    simulated: true,
  };
}

describe('analysis presenter', () => {
  const observations = [
    observation('OBS-DHIS2-CM-01', 'human', 'CM', '2026-08-02T12:00:00.000Z', 10, 'signal'),
    observation('OBS-CAPC-CM-01', 'environment', 'CM', '2026-08-01T12:00:00.000Z', 40),
    observation('OBS-ARIS-CM-01', 'animal', 'CM', '2026-07-31T12:00:00.000Z', 8),
    observation('OBS-DHIS2-GA-01', 'human', 'GA', '2026-05-01T12:00:00.000Z', 5),
  ] as const;

  it('combines period, country and sector filters', () => {
    expect(filterAnalysisObservations(observations, 'CM', 'all', 30).length).toBe(3);
    expect(filterAnalysisObservations(observations, 'CM', 'animal', 30).length).toBe(1);
    expect(filterAnalysisObservations(observations, 'GA', 'all', 30).length).toBe(0);
  });

  it('computes quality from completeness, sector coverage and freshness', () => {
    const scores = buildCountryQualityScores(observations);

    expect(scores[0].countryCode).toBe('CM');
    expect(scores[0].score).toBe(100);
    expect(scores[0].sectorCoverage).toBe(100);
  });

  it('creates six chart buckets and a bounded descriptive correlation', () => {
    const chart = buildAnalysisChart(observations, 30, 'all');

    expect(chart.points.length).toBe(6);
    expect(chart.linePoints).toContain(',');
    expect(chart.correlation).not.toBeNull();
    expect(Math.abs(chart.correlation ?? 0)).toBeLessThanOrEqual(1);
  });
});
