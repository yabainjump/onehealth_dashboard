import { ArisOutbreak, CapcReading, Dhis2Event, GeoPoint } from '../models/source-records.model';
import { CEEAC_COUNTRIES, DEMO_REFERENCE_DATE } from './ceeac-reference';

const POINT_OFFSETS: readonly (readonly [number, number])[] = [
  [-0.48, -0.34],
  [0.36, -0.21],
  [-0.12, 0.42],
  [0.51, 0.31],
  [-0.38, 0.22],
];

const HUMAN_SYNDROMES = [
  'Syndrome fébrile inhabituel',
  'Syndrome respiratoire aigu',
  'Diarrhée aqueuse aiguë',
  'Cas suspects de rougeole',
  'Syndrome ictérique aigu',
] as const;

const ANIMAL_SYNDROMES = [
  'Mortalité animale inhabituelle',
  'Suspicion de peste porcine africaine',
  'Syndrome respiratoire aviaire',
  'Avortements groupés chez les ruminants',
  'Suspicion de rage animale',
] as const;

const ANIMAL_SPECIES = ['Bovins', 'Porcins', 'Volailles', 'Petits ruminants', 'Canidés'] as const;

const ENVIRONMENTAL_INDICATORS = [
  { label: 'Anomalie pluviométrique', unit: 'mm', baseValue: 86 },
  { label: 'Risque hydrique saisonnier', unit: 'indice', baseValue: 64 },
  { label: 'Température supérieure à la normale', unit: '°C', baseValue: 2.4 },
  { label: 'Dégradation de la qualité de l’air', unit: 'AQI', baseValue: 118 },
  { label: 'Indice de sécheresse élevé', unit: 'indice', baseValue: 71 },
] as const;

function demoDate(daysAgo: number, hoursOffset = 0): string {
  const date = new Date(DEMO_REFERENCE_DATE);
  date.setUTCDate(date.getUTCDate() - daysAgo);
  date.setUTCHours(date.getUTCHours() + hoursOffset);
  return date.toISOString();
}

function pointFor(
  countryIndex: number,
  recordIndex: number,
  sectorOffset: number,
): GeoPoint {
  const country = CEEAC_COUNTRIES[countryIndex];
  const [latitudeOffset, longitudeOffset] = POINT_OFFSETS[recordIndex];
  const sectorJitter = (sectorOffset - 1) * 0.055;

  return {
    latitude: Number(
      (country.center[0] + latitudeOffset * country.coordinateSpread + sectorJitter).toFixed(5),
    ),
    longitude: Number(
      (country.center[1] + longitudeOffset * country.coordinateSpread - sectorJitter).toFixed(5),
    ),
  };
}

function daysAgo(countryIndex: number, recordIndex: number, sectorOffset: number): number {
  const countryCode = CEEAC_COUNTRIES[countryIndex].code;

  if (recordIndex === 0 && sectorOffset === 0 && countryCode === 'CM') {
    return 0;
  }

  if (recordIndex === 0 && sectorOffset === 1 && countryCode === 'CF') {
    return 1;
  }

  if (recordIndex === 0 && sectorOffset === 2 && countryCode === 'GA') {
    return 2;
  }

  return recordIndex * 62 + countryIndex * 2 + sectorOffset;
}

export const MOCK_DHIS2_EVENTS: readonly Dhis2Event[] = CEEAC_COUNTRIES.flatMap(
  (country, countryIndex) =>
    HUMAN_SYNDROMES.map((syndrome, recordIndex) => {
      const suspectedCases = 8 + ((countryIndex * 7 + recordIndex * 11) % 47);
      const occurredAt = demoDate(daysAgo(countryIndex, recordIndex, 0));

      return {
        eventId: `DHIS2-${country.code}-${String(recordIndex + 1).padStart(2, '0')}`,
        organisationUnit: `${country.adminAreas[recordIndex]} · Surveillance intégrée`,
        countryCode: country.code,
        countryName: country.name,
        adminArea: country.adminAreas[recordIndex],
        location: pointFor(countryIndex, recordIndex, 0),
        occurredAt,
        receivedAt: demoDate(daysAgo(countryIndex, recordIndex, 0), 6),
        syndrome,
        suspectedCases,
        confirmedCases: Math.max(0, Math.floor(suspectedCases * (0.08 + recordIndex * 0.025))),
      } satisfies Dhis2Event;
    }),
);

export const MOCK_ARIS_OUTBREAKS: readonly ArisOutbreak[] = CEEAC_COUNTRIES.flatMap(
  (country, countryIndex) =>
    ANIMAL_SYNDROMES.map((syndrome, recordIndex) => {
      const animalsAtRisk = 45 + ((countryIndex * 31 + recordIndex * 47) % 460);

      return {
        outbreakId: `ARIS-${country.code}-${String(recordIndex + 1).padStart(2, '0')}`,
        reportingUnit: `${country.adminAreas[recordIndex]} · Services vétérinaires`,
        countryCode: country.code,
        countryName: country.name,
        adminArea: country.adminAreas[recordIndex],
        location: pointFor(countryIndex, recordIndex, 1),
        occurredAt: demoDate(daysAgo(countryIndex, recordIndex, 1)),
        receivedAt: demoDate(daysAgo(countryIndex, recordIndex, 1), 8),
        syndrome,
        species: ANIMAL_SPECIES[recordIndex],
        animalsAtRisk,
        deaths: Math.max(1, Math.floor(animalsAtRisk * (0.015 + recordIndex * 0.012))),
      } satisfies ArisOutbreak;
    }),
);

export const MOCK_CAPC_READINGS: readonly CapcReading[] = CEEAC_COUNTRIES.flatMap(
  (country, countryIndex) =>
    ENVIRONMENTAL_INDICATORS.map((indicator, recordIndex) => {
      const variance = ((countryIndex * 13 + recordIndex * 9) % 21) - 6;
      const value = Number((indicator.baseValue + variance).toFixed(1));

      return {
        readingId: `CAPC-${country.code}-${String(recordIndex + 1).padStart(2, '0')}`,
        stationId: `ST-${country.code}-${String(recordIndex + 1).padStart(3, '0')}`,
        countryCode: country.code,
        countryName: country.name,
        adminArea: country.adminAreas[recordIndex],
        location: pointFor(countryIndex, recordIndex, 2),
        occurredAt: demoDate(daysAgo(countryIndex, recordIndex, 2)),
        receivedAt: demoDate(daysAgo(countryIndex, recordIndex, 2), 3),
        indicator: indicator.label,
        value,
        unit: indicator.unit,
        baselineDifference: Number((7 + ((countryIndex + recordIndex * 3) % 19)).toFixed(1)),
      } satisfies CapcReading;
    }),
);
