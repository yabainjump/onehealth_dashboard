import type { Feature, FeatureCollection, Geometry } from 'geojson';
import * as L from 'leaflet';

import { OneHealthObservation } from '../../core/data/models/one-health-observation.model';

export interface CeeacCountryProperties {
  readonly code: string;
  readonly name: string;
}

export interface CeeacCountrySummary {
  readonly observations: number;
  readonly signals: number;
  readonly verifiedAlerts: number;
  readonly sectors: readonly string[];
  readonly latestObservedAt: string | null;
  readonly level: CeeacActivityLevel;
}

export type CeeacActivityLevel = 'none' | 'watch' | 'elevated' | 'critical';

export interface CeeacCountrySelection {
  readonly code: string;
  readonly name: string;
  readonly bounds: L.LatLngBounds;
}

export interface CeeacBoundaryLayerOptions {
  readonly visibleObservations: () => readonly OneHealthObservation[];
  readonly selectedCountryCode?: () => string | null;
  readonly onCountrySelect?: (selection: CeeacCountrySelection) => void;
}

export type CeeacBoundaries = FeatureCollection<Geometry, CeeacCountryProperties>;

const CEEAC_BOUNDARIES_URL = 'assets/geo/ceeac-countries.geojson';
const CEEAC_PANE = 'ceeac-country-boundaries';
const ACTIVITY_COLORS: Readonly<Record<CeeacActivityLevel, string>> = {
  none: '#64748b',
  watch: '#eab308',
  elevated: '#f97316',
  critical: '#ef4444',
};
const ACTIVITY_LABELS: Readonly<Record<CeeacActivityLevel, string>> = {
  none: 'Aucune donnée visible',
  watch: 'Veille',
  elevated: 'Surveillance renforcée',
  critical: 'Activité critique',
};
const SECTOR_LABELS: Readonly<Record<OneHealthObservation['sector'], string>> = {
  human: 'Humaine',
  animal: 'Animale',
  environment: 'Environnement',
};

let cachedBoundaries: Promise<CeeacBoundaries> | undefined;

export async function loadCeeacBoundaries(): Promise<CeeacBoundaries> {
  cachedBoundaries ??= fetch(CEEAC_BOUNDARIES_URL, {
    credentials: 'same-origin',
    headers: { Accept: 'application/geo+json, application/json' },
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(`CEEAC boundaries unavailable (${response.status})`);
    }

    const data = (await response.json()) as CeeacBoundaries;
    if (data.type !== 'FeatureCollection' || data.features.length !== 11) {
      throw new Error('Invalid CEEAC boundaries payload');
    }
    return data;
  });

  try {
    return await cachedBoundaries;
  } catch (error) {
    cachedBoundaries = undefined;
    throw error;
  }
}

export function summarizeCeeacCountry(
  countryCode: string,
  observations: readonly OneHealthObservation[],
): CeeacCountrySummary {
  const countryObservations = observations.filter(
    (observation) => observation.countryCode === countryCode,
  );
  const signals = countryObservations.filter((observation) => observation.stage === 'signal').length;
  const verifiedAlerts = countryObservations.filter(
    (observation) => observation.stage === 'verified-alert',
  ).length;
  const hasCriticalSeverity = countryObservations.some(
    (observation) => observation.severity === 'critical',
  );
  const hasHighSeverity = countryObservations.some(
    (observation) => observation.severity === 'high',
  );
  const sectors = [...new Set(countryObservations.map((observation) => observation.sector))].map(
    (sector) => SECTOR_LABELS[sector],
  );
  const latestObservedAt = countryObservations.reduce<string | null>(
    (latest, observation) =>
      latest === null || observation.observedAt > latest ? observation.observedAt : latest,
    null,
  );
  const level: CeeacActivityLevel =
    verifiedAlerts > 0 || hasCriticalSeverity
      ? 'critical'
      : signals > 0 || hasHighSeverity
        ? 'elevated'
        : countryObservations.length > 0
          ? 'watch'
          : 'none';

  return {
    observations: countryObservations.length,
    signals,
    verifiedAlerts,
    sectors,
    latestObservedAt,
    level,
  };
}

export function createCeeacBoundaryLayer(
  map: L.Map,
  boundaries: CeeacBoundaries,
  options: CeeacBoundaryLayerOptions,
): L.GeoJSON<CeeacCountryProperties> {
  const pane = map.getPane(CEEAC_PANE) ?? map.createPane(CEEAC_PANE);
  pane.style.zIndex = '350';

  const renderer = L.svg({ pane: CEEAC_PANE, padding: 0.4 });
  return L.geoJSON<CeeacCountryProperties>(boundaries, {
    style: (feature) => ({
      ...countryStyle(
        summarizeCeeacCountry(feature?.properties.code ?? '', options.visibleObservations()),
        false,
        feature?.properties.code === options.selectedCountryCode?.(),
      ),
      renderer,
    }),
    onEachFeature: (feature, layer) => {
      const tooltip = buildCountryTooltip(
        feature,
        options.visibleObservations(),
        Boolean(options.onCountrySelect),
      );
      layer.bindTooltip(tooltip, {
        className: 'ceeac-country-tooltip',
        direction: 'top',
        sticky: true,
        opacity: 1,
        offset: [0, -8],
      });

      layer.on({
        mouseover: () => {
          if (layer instanceof L.Path) {
            layer.setStyle(
              countryStyle(
                summarizeCeeacCountry(feature.properties.code, options.visibleObservations()),
                true,
                feature.properties.code === options.selectedCountryCode?.(),
              ),
            );
          }
          layer.setTooltipContent(
            buildCountryTooltip(
              feature,
              options.visibleObservations(),
              Boolean(options.onCountrySelect),
            ),
          );
        },
        mouseout: () => {
          if (layer instanceof L.Path) {
            layer.setStyle(
              countryStyle(
                summarizeCeeacCountry(feature.properties.code, options.visibleObservations()),
                false,
                feature.properties.code === options.selectedCountryCode?.(),
              ),
            );
          }
        },
        click: () => {
          if (options.onCountrySelect && layer instanceof L.Polygon) {
            options.onCountrySelect({
              code: feature.properties.code,
              name: feature.properties.name,
              bounds: layer.getBounds(),
            });
          }
        },
      });
    },
  }).addTo(map);
}

export function refreshCeeacBoundaryLayer(
  layer: L.GeoJSON<CeeacCountryProperties> | undefined,
  observations: readonly OneHealthObservation[],
  selectedCountryCode: string | null = null,
): void {
  layer?.setStyle((feature) =>
    countryStyle(
      summarizeCeeacCountry(feature?.properties.code ?? '', observations),
      false,
      feature?.properties.code === selectedCountryCode,
    ),
  );
}

function countryStyle(
  summary: CeeacCountrySummary,
  highlighted: boolean,
  selected: boolean,
): L.PathOptions {
  const color = ACTIVITY_COLORS[summary.level];
  const baseFillOpacity: Readonly<Record<CeeacActivityLevel, number>> = {
    none: 0.025,
    watch: 0.07,
    elevated: 0.11,
    critical: 0.15,
  };
  return {
    className: 'ceeac-country-boundary',
    color,
    fillColor: color,
    fillOpacity: highlighted ? 0.3 : selected ? 0.22 : baseFillOpacity[summary.level],
    opacity: highlighted || selected ? 1 : 0.9,
    weight: highlighted ? 3.2 : selected ? 2.8 : 1.7,
  };
}

function buildCountryTooltip(
  feature: Feature<Geometry, CeeacCountryProperties>,
  observations: readonly OneHealthObservation[],
  selectable: boolean,
): HTMLElement {
  const summary = summarizeCeeacCountry(feature.properties.code, observations);
  const card = document.createElement('article');
  card.className = 'ceeac-country-card';

  const eyebrow = document.createElement('small');
  eyebrow.textContent = 'État membre CEEAC';
  const title = document.createElement('strong');
  title.textContent = feature.properties.name;
  const status = document.createElement('span');
  status.className = `ceeac-country-card__status ceeac-country-card__status--${summary.level}`;
  status.textContent = ACTIVITY_LABELS[summary.level];
  const metrics = document.createElement('div');

  for (const [value, label] of [
    [summary.observations, 'données visibles'],
    [summary.signals, 'signaux'],
    [summary.verifiedAlerts, 'alertes vérifiées'],
  ] as const) {
    const metric = document.createElement('span');
    const metricValue = document.createElement('b');
    const metricLabel = document.createElement('i');
    metricValue.textContent = String(value);
    metricLabel.textContent = label;
    metric.append(metricValue, metricLabel);
    metrics.append(metric);
  }

  const context = document.createElement('p');
  const latest = summary.latestObservedAt
    ? new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(summary.latestObservedAt))
    : '—';
  context.textContent = `Secteurs : ${summary.sectors.join(', ') || '—'} · Dernière donnée : ${latest}`;

  card.append(eyebrow, title, status, metrics, context);
  if (selectable) {
    const hint = document.createElement('small');
    hint.className = 'ceeac-country-card__hint';
    hint.textContent = 'Cliquer pour filtrer ce pays';
    card.append(hint);
  }
  return card;
}
