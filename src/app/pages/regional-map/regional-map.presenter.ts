import { HubEventApi } from '../../core/data/hub-api.service';
import { OneHealthObservation } from '../../core/data/models/one-health-observation.model';

export interface MapTimelineState {
  readonly startMs: number;
  readonly endMs: number;
  readonly cutoffMs: number;
}

export interface MapDateRange {
  readonly from: string;
  readonly to: string;
}

export function filterObservationsByDateRange(
  observations: readonly OneHealthObservation[],
  range: MapDateRange,
): readonly OneHealthObservation[] {
  const fromMs = Date.parse(`${range.from}T00:00:00.000Z`);
  const toMs = Date.parse(`${range.to}T23:59:59.999Z`);

  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || fromMs > toMs) {
    return [];
  }

  return observations.filter((observation) => {
    const observedAt = Date.parse(observation.observedAt);
    return Number.isFinite(observedAt) && observedAt >= fromMs && observedAt <= toMs;
  });
}

export function buildMapTimeline(
  observations: readonly OneHealthObservation[],
  requestedPercent: number,
): MapTimelineState | null {
  const timestamps = observations
    .map((observation) => Date.parse(observation.observedAt))
    .filter(Number.isFinite);

  if (timestamps.length === 0) {
    return null;
  }

  const startMs = Math.min(...timestamps);
  const endMs = Math.max(...timestamps);
  const percent = Math.min(100, Math.max(0, requestedPercent));

  return {
    startMs,
    endMs,
    cutoffMs: startMs + ((endMs - startMs) * percent) / 100,
  };
}

export function filterObservationsAt(
  observations: readonly OneHealthObservation[],
  cutoffMs: number | null,
): readonly OneHealthObservation[] {
  if (cutoffMs === null) {
    return observations;
  }

  return observations.filter((observation) => Date.parse(observation.observedAt) <= cutoffMs);
}

export function observationsForEvent(
  event: HubEventApi,
  observations: readonly OneHealthObservation[],
): readonly OneHealthObservation[] {
  const eventObservationIds = new Set(event.observationIds);
  return observations.filter((observation) => eventObservationIds.has(observation.id));
}
