import {
  HealthSector,
  ObservationSeverity,
  ObservationStage,
} from './models/one-health-observation.model';

export const SECTOR_LABELS: Readonly<Record<HealthSector, string>> = {
  human: 'Santé humaine',
  animal: 'Santé animale',
  environment: 'Climat et environnement',
};

export const STAGE_LABELS: Readonly<Record<ObservationStage, string>> = {
  observation: 'Observation source',
  signal: 'Signal à vérifier',
  'verified-alert': 'Alerte vérifiée',
};

export const SEVERITY_LABELS: Readonly<Record<ObservationSeverity, string>> = {
  low: 'Faible',
  medium: 'Modérée',
  high: 'Élevée',
  critical: 'Critique',
};

export function formatObservationDate(isoDate: string, includeTime = false): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    timeZone: 'UTC',
  }).format(new Date(isoDate));
}
