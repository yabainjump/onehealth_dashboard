export interface GeoPoint {
  readonly latitude: number;
  readonly longitude: number;
}

interface SourceRecordBase {
  readonly countryCode: string;
  readonly countryName: string;
  readonly adminArea: string;
  readonly location: GeoPoint;
  readonly occurredAt: string;
  readonly receivedAt: string;
}

export interface Dhis2Event extends SourceRecordBase {
  readonly eventId: string;
  readonly organisationUnit: string;
  readonly syndrome: string;
  readonly suspectedCases: number;
  readonly confirmedCases: number;
}

export interface ArisOutbreak extends SourceRecordBase {
  readonly outbreakId: string;
  readonly reportingUnit: string;
  readonly syndrome: string;
  readonly species: string;
  readonly animalsAtRisk: number;
  readonly deaths: number;
}

export interface CapcReading extends SourceRecordBase {
  readonly readingId: string;
  readonly stationId: string;
  readonly indicator: string;
  readonly value: number;
  readonly unit: string;
  readonly baselineDifference: number;
}
