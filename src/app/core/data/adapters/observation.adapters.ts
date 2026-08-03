import {
  ObservationSeverity,
  ObservationStage,
  OneHealthObservation,
} from '../models/one-health-observation.model';
import { ArisOutbreak, CapcReading, Dhis2Event } from '../models/source-records.model';

const VERIFIED_ALERT_IDS = new Set([
  'DHIS2-CM-01',
  'ARIS-CF-01',
  'CAPC-GA-01',
]);

const SIGNAL_IDS = new Set([
  'DHIS2-TD-01',
  'DHIS2-CD-01',
  'DHIS2-CG-01',
  'DHIS2-BI-01',
  'ARIS-CM-01',
  'ARIS-AO-01',
  'ARIS-RW-01',
  'ARIS-GQ-01',
  'CAPC-TD-01',
  'CAPC-CD-01',
  'CAPC-ST-01',
  'CAPC-BI-01',
]);

function classification(sourceRecordId: string): {
  readonly stage: ObservationStage;
  readonly severity: ObservationSeverity;
} {
  if (VERIFIED_ALERT_IDS.has(sourceRecordId)) {
    return { stage: 'verified-alert', severity: 'critical' };
  }

  if (SIGNAL_IDS.has(sourceRecordId)) {
    return { stage: 'signal', severity: 'high' };
  }

  const sequence = Number(sourceRecordId.slice(-2));
  return {
    stage: 'observation',
    severity: sequence >= 4 ? 'medium' : 'low',
  };
}

export function normalizeDhis2Event(event: Dhis2Event): OneHealthObservation {
  const { stage, severity } = classification(event.eventId);
  const isVerifiedAlert = event.eventId === 'DHIS2-CM-01';

  return {
    id: `OBS-${event.eventId}`,
    sourceSystem: 'DHIS2',
    sourceRecordId: event.eventId,
    sector: 'human',
    countryCode: event.countryCode,
    countryName: event.countryName,
    adminArea: event.adminArea,
    latitude: event.location.latitude,
    longitude: event.location.longitude,
    observedAt: event.occurredAt,
    receivedAt: event.receivedAt,
    category: 'Surveillance syndromique',
    title: isVerifiedAlert ? 'Foyer de fièvre hémorragique' : event.syndrome,
    summary: isVerifiedAlert
      ? 'Alerte validée après rapprochement de rapports humains et fauniques.'
      : `${event.suspectedCases} cas suspects déclarés par ${event.organisationUnit}.`,
    stage,
    severity,
    metrics: [
      { label: 'Cas suspects', value: event.suspectedCases },
      { label: 'Cas confirmés', value: event.confirmedCases },
    ],
    simulated: true,
  };
}

export function normalizeArisOutbreak(outbreak: ArisOutbreak): OneHealthObservation {
  const { stage, severity } = classification(outbreak.outbreakId);
  const isVerifiedAlert = outbreak.outbreakId === 'ARIS-CF-01';

  return {
    id: `OBS-${outbreak.outbreakId}`,
    sourceSystem: 'ARIS 3',
    sourceRecordId: outbreak.outbreakId,
    sector: 'animal',
    countryCode: outbreak.countryCode,
    countryName: outbreak.countryName,
    adminArea: outbreak.adminArea,
    latitude: outbreak.location.latitude,
    longitude: outbreak.location.longitude,
    observedAt: outbreak.occurredAt,
    receivedAt: outbreak.receivedAt,
    category: 'Surveillance des foyers animaux',
    title: isVerifiedAlert ? 'Mortalité animale inhabituelle' : outbreak.syndrome,
    summary: isVerifiedAlert
      ? 'Alerte validée par les services vétérinaires après investigation de terrain.'
      : `${outbreak.deaths} décès parmi ${outbreak.animalsAtRisk} ${outbreak.species.toLowerCase()} exposés.`,
    stage,
    severity,
    metrics: [
      { label: 'Animaux exposés', value: outbreak.animalsAtRisk },
      { label: 'Décès', value: outbreak.deaths },
    ],
    simulated: true,
  };
}

export function normalizeCapcReading(reading: CapcReading): OneHealthObservation {
  const { stage, severity } = classification(reading.readingId);
  const isVerifiedAlert = reading.readingId === 'CAPC-GA-01';

  return {
    id: `OBS-${reading.readingId}`,
    sourceSystem: 'CAPC-AC',
    sourceRecordId: reading.readingId,
    sector: 'environment',
    countryCode: reading.countryCode,
    countryName: reading.countryName,
    adminArea: reading.adminArea,
    latitude: reading.location.latitude,
    longitude: reading.location.longitude,
    observedAt: reading.occurredAt,
    receivedAt: reading.receivedAt,
    category: 'Climat et environnement',
    title: isVerifiedAlert ? 'Risque hydrique saisonnier' : reading.indicator,
    summary: isVerifiedAlert
      ? 'Alerte validée après dépassement durable des seuils hydrométéorologiques.'
      : `Mesure ${reading.value} ${reading.unit}, écart de ${reading.baselineDifference}% à la référence.`,
    stage,
    severity,
    metrics: [
      { label: reading.indicator, value: reading.value, unit: reading.unit },
      { label: 'Écart à la référence', value: reading.baselineDifference, unit: '%' },
    ],
    simulated: true,
  };
}
