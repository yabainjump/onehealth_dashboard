import {
  HealthSector,
  OneHealthObservation,
} from '../../core/data/models/one-health-observation.model';

export type AnalysisSector = 'all' | HealthSector;
export type AnalysisPeriod = 30 | 90 | 365;

export interface AnalysisChartPoint {
  readonly label: string;
  readonly primaryValue: number;
  readonly secondaryValue: number;
  readonly x: number;
  readonly primaryY: number;
  readonly primaryHeight: number;
  readonly secondaryY: number;
}

export interface AnalysisChart {
  readonly title: string;
  readonly description: string;
  readonly primaryLabel: string;
  readonly secondaryLabel: string;
  readonly points: readonly AnalysisChartPoint[];
  readonly linePoints: string;
  readonly correlation: number | null;
}

export interface CountryQualityScore {
  readonly countryCode: string;
  readonly countryName: string;
  readonly score: number;
  readonly completeness: number;
  readonly sectorCoverage: number;
  readonly freshness: number;
  readonly records: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const SECTOR_LABELS: Readonly<Record<HealthSector, string>> = {
  human: 'Santé humaine',
  animal: 'Santé animale',
  environment: 'Environnement',
};

export function analysisReferenceTime(observations: readonly OneHealthObservation[]): number {
  const timestamps = observations
    .map((observation) => new Date(observation.observedAt).getTime())
    .filter(Number.isFinite);
  return timestamps.length ? Math.max(...timestamps) : Date.now();
}

export function filterAnalysisObservations(
  observations: readonly OneHealthObservation[],
  countryCode: string,
  sector: AnalysisSector,
  periodDays: AnalysisPeriod,
): readonly OneHealthObservation[] {
  const referenceTime = analysisReferenceTime(observations);
  const minimumTime = referenceTime - periodDays * DAY_MS;
  return observations.filter((observation) => {
    const observedAt = new Date(observation.observedAt).getTime();
    return (
      observedAt >= minimumTime &&
      (countryCode === 'all' || observation.countryCode === countryCode) &&
      (sector === 'all' || observation.sector === sector)
    );
  });
}

export function buildCountryQualityScores(
  observations: readonly OneHealthObservation[],
): readonly CountryQualityScore[] {
  const referenceTime = analysisReferenceTime(observations);
  const countries = new Map<string, OneHealthObservation[]>();
  for (const observation of observations) {
    const items = countries.get(observation.countryCode) ?? [];
    items.push(observation);
    countries.set(observation.countryCode, items);
  }

  return [...countries.entries()]
    .map(([countryCode, items]) => {
      const complete = items.filter(
        (item) =>
          Boolean(
            item.sourceRecordId &&
            item.countryName &&
            item.adminArea &&
            item.observedAt &&
            item.receivedAt &&
            item.title,
          ) &&
          Number.isFinite(item.latitude) &&
          Number.isFinite(item.longitude),
      ).length;
      const completeness = Math.round((complete / items.length) * 100);
      const sectorCoverage = Math.round((new Set(items.map((item) => item.sector)).size / 3) * 100);
      const latest = Math.max(...items.map((item) => new Date(item.observedAt).getTime()));
      const ageDays = Math.max(0, Math.floor((referenceTime - latest) / DAY_MS));
      const freshness = ageDays <= 7 ? 100 : ageDays <= 30 ? 85 : ageDays <= 90 ? 65 : 40;
      return {
        countryCode,
        countryName: items[0].countryName,
        score: Math.round(completeness * 0.55 + sectorCoverage * 0.3 + freshness * 0.15),
        completeness,
        sectorCoverage,
        freshness,
        records: items.length,
      } satisfies CountryQualityScore;
    })
    .sort(
      (left, right) =>
        right.score - left.score || left.countryName.localeCompare(right.countryName, 'fr'),
    );
}

export function buildAnalysisChart(
  observations: readonly OneHealthObservation[],
  periodDays: AnalysisPeriod,
  sector: AnalysisSector,
): AnalysisChart {
  const referenceTime = analysisReferenceTime(observations);
  const bucketCount = 6;
  const bucketSize = (periodDays * DAY_MS) / bucketCount;
  const startTime = referenceTime - periodDays * DAY_MS;
  const primarySector: HealthSector = sector === 'all' ? 'environment' : sector;
  const secondarySector: HealthSector = sector === 'all' ? 'human' : sector;
  const buckets = Array.from({ length: bucketCount }, (_, index) => ({
    primary: 0,
    secondary: 0,
    labelTime: startTime + bucketSize * (index + 0.5),
  }));

  for (const observation of observations) {
    const timestamp = new Date(observation.observedAt).getTime();
    if (!Number.isFinite(timestamp) || timestamp < startTime || timestamp > referenceTime) continue;
    const bucketIndex = Math.min(
      bucketCount - 1,
      Math.max(0, Math.floor((timestamp - startTime) / bucketSize)),
    );
    const metricValue = observation.metrics[0]?.value ?? 1;
    if (observation.sector === primarySector) {
      buckets[bucketIndex].primary += metricValue;
    }
    if (observation.sector === secondarySector) {
      buckets[bucketIndex].secondary +=
        sector === 'all' ? metricValue : observation.stage === 'observation' ? 0 : 1;
    }
  }

  const maxPrimary = Math.max(1, ...buckets.map((bucket) => bucket.primary));
  const maxSecondary = Math.max(1, ...buckets.map((bucket) => bucket.secondary));
  const baseline = 210;
  const chartHeight = 160;
  const dateFormatter = new Intl.DateTimeFormat('fr', {
    day: '2-digit',
    month: 'short',
  });
  const points = buckets.map((bucket, index) => {
    const primaryHeight = (bucket.primary / maxPrimary) * chartHeight;
    return {
      label: dateFormatter.format(new Date(bucket.labelTime)),
      primaryValue: bucket.primary,
      secondaryValue: bucket.secondary,
      x: 60 + index * 96,
      primaryY: baseline - primaryHeight,
      primaryHeight,
      secondaryY: baseline - (bucket.secondary / maxSecondary) * chartHeight,
    } satisfies AnalysisChartPoint;
  });
  const correlation =
    sector === 'all'
      ? pearsonCorrelation(
          buckets.map((bucket) => bucket.primary),
          buckets.map((bucket) => bucket.secondary),
        )
      : null;

  return {
    title:
      sector === 'all'
        ? 'Évolution environnementale vs santé humaine'
        : `${SECTOR_LABELS[sector]} : valeurs sources vs signaux qualifiés`,
    description:
      sector === 'all'
        ? 'Comparaison temporelle descriptive des premières métriques CAPC-AC et DHIS2.'
        : 'Comparaison temporelle entre la première métrique source et les dossiers qualifiés.',
    primaryLabel:
      sector === 'all'
        ? 'Indicateurs environnementaux'
        : `Métrique ${SECTOR_LABELS[primarySector].toLocaleLowerCase('fr')}`,
    secondaryLabel: sector === 'all' ? 'Indicateurs de santé humaine' : 'Signaux qualifiés',
    points,
    linePoints: points.map((point) => `${point.x + 15},${point.secondaryY}`).join(' '),
    correlation,
  };
}

function pearsonCorrelation(left: readonly number[], right: readonly number[]): number {
  if (left.length !== right.length || left.length < 2) return 0;
  const leftMean = left.reduce((sum, value) => sum + value, 0) / left.length;
  const rightMean = right.reduce((sum, value) => sum + value, 0) / right.length;
  let numerator = 0;
  let leftVariance = 0;
  let rightVariance = 0;
  for (let index = 0; index < left.length; index += 1) {
    const leftDelta = left[index] - leftMean;
    const rightDelta = right[index] - rightMean;
    numerator += leftDelta * rightDelta;
    leftVariance += leftDelta ** 2;
    rightVariance += rightDelta ** 2;
  }
  const denominator = Math.sqrt(leftVariance * rightVariance);
  return denominator ? Number((numerator / denominator).toFixed(2)) : 0;
}
