export type HealthSector = 'human' | 'animal' | 'environment';

export type SourceSystem = 'DHIS2' | 'ARIS 3' | 'CAPC-AC';

export type ObservationStage = 'observation' | 'signal' | 'verified-alert';

export type ObservationSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ObservationMetric {
  readonly label: string;
  readonly value: number;
  readonly unit?: string;
}

export interface OneHealthObservation {
  readonly id: string;
  readonly sourceSystem: SourceSystem;
  readonly sourceRecordId: string;
  readonly sector: HealthSector;
  readonly countryCode: string;
  readonly countryName: string;
  readonly adminArea: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly observedAt: string;
  readonly receivedAt: string;
  readonly category: string;
  readonly title: string;
  readonly summary: string;
  readonly stage: ObservationStage;
  readonly severity: ObservationSeverity;
  readonly metrics: readonly ObservationMetric[];
  readonly simulated: true;
}

export interface ObservationSummary {
  readonly total: number;
  readonly countries: number;
  readonly bySector: Readonly<Record<HealthSector, number>>;
  readonly byStage: Readonly<Record<ObservationStage, number>>;
  readonly completeness: number;
}

export type MapPeriod = '7d' | '30d' | 'year';

export interface ObservationFilter {
  readonly period: MapPeriod;
  readonly sectors: ReadonlySet<HealthSector>;
  readonly stages?: ReadonlySet<ObservationStage>;
}
