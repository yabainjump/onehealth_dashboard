import { HubConnectorApi, HubConnectorStatus } from '../../core/data/hub-api.service';

export function connectorStatusLabel(status: HubConnectorStatus): string {
  return {
    operational: 'Opérationnel',
    degraded: 'Dégradé',
    error: 'En erreur',
    suspended: 'Suspendu',
  }[status];
}

export function connectorSectorLabel(sector: HubConnectorApi['sector']): string {
  return {
    human: 'Santé humaine',
    animal: 'Santé animale',
    environment: 'Environnement',
  }[sector];
}

export function connectorProtocolLabel(protocol: HubConnectorApi['protocol']): string {
  return {
    API_REST: 'API REST',
    SYNC: 'Synchronisation',
    PUSH_SFTP: 'Push SFTP',
    GEOJSON: 'API / GeoJSON',
  }[protocol];
}

export function formatConnectorLastSync(value: string | null, now = Date.now()): string {
  if (!value) return 'Non configuré';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Indisponible';
  const deltaMinutes = Math.round((date.getTime() - now) / 60_000);
  const formatter = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });
  if (Math.abs(deltaMinutes) < 60) return formatter.format(deltaMinutes, 'minute');
  const deltaHours = Math.round(deltaMinutes / 60);
  if (Math.abs(deltaHours) < 24) return formatter.format(deltaHours, 'hour');
  return formatter.format(Math.round(deltaHours / 24), 'day');
}

export function connectorAvailabilityTone(value: number): 'good' | 'warning' | 'danger' {
  if (value >= 95) return 'good';
  if (value >= 80) return 'warning';
  return 'danger';
}
