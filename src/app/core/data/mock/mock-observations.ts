import {
  normalizeArisOutbreak,
  normalizeCapcReading,
  normalizeDhis2Event,
} from '../adapters/observation.adapters';
import { OneHealthObservation } from '../models/one-health-observation.model';
import {
  MOCK_ARIS_OUTBREAKS,
  MOCK_CAPC_READINGS,
  MOCK_DHIS2_EVENTS,
} from './mock-source-records';

export const MOCK_ONE_HEALTH_OBSERVATIONS: readonly OneHealthObservation[] = [
  ...MOCK_DHIS2_EVENTS.map(normalizeDhis2Event),
  ...MOCK_ARIS_OUTBREAKS.map(normalizeArisOutbreak),
  ...MOCK_CAPC_READINGS.map(normalizeCapcReading),
].sort((left, right) => right.observedAt.localeCompare(left.observedAt));
