import {
  connectorAvailabilityTone,
  connectorProtocolLabel,
  connectorStatusLabel,
  formatConnectorLastSync,
} from './connector-presenter';

describe('connector presenter', () => {
  it('uses clear French labels for technical values', () => {
    expect(connectorStatusLabel('operational')).toBe('Opérationnel');
    expect(connectorStatusLabel('error')).toBe('En erreur');
    expect(connectorProtocolLabel('GEOJSON')).toBe('API / GeoJSON');
  });

  it('formats the synchronization recency without exposing raw dates', () => {
    const now = new Date('2026-08-02T12:00:00.000Z').getTime();

    expect(formatConnectorLastSync(null, now)).toBe('Non configuré');
    expect(formatConnectorLastSync('invalid', now)).toBe('Indisponible');
    expect(formatConnectorLastSync('2026-08-02T11:50:00.000Z', now)).toContain('10');
  });

  it('classifies availability thresholds consistently', () => {
    expect(connectorAvailabilityTone(99)).toBe('good');
    expect(connectorAvailabilityTone(85)).toBe('warning');
    expect(connectorAvailabilityTone(41)).toBe('danger');
  });
});
