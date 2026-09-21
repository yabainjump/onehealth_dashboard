import { ObservationSeverity } from '../../core/data/models/one-health-observation.model';

export type MapRiskLevel = 'low' | 'medium' | 'high';

export const MAP_RISK_COLORS: Readonly<Record<MapRiskLevel, string>> = {
  low: '#2e7d32',
  medium: '#ed6c02',
  high: '#e57373',
};

export const MAP_RISK_LABELS: Readonly<Record<MapRiskLevel, string>> = {
  low: 'Faible',
  medium: 'Moyen',
  high: 'Fort',
};

/**
 * Projection visuelle d'une gravité canonique transmise par l'API Hub.
 * La carte ne calcule jamais une gravité sanitaire à partir des métriques brutes.
 */
export function toMapRiskLevel(severity: ObservationSeverity): MapRiskLevel {
  if (severity === 'low') {
    return 'low';
  }
  if (severity === 'medium') {
    return 'medium';
  }
  return 'high';
}

export function isPulsingMapRiskLevel(level: MapRiskLevel): boolean {
  return level === 'medium' || level === 'high';
}
