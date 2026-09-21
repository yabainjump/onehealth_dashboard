import type { Feature, FeatureCollection, Geometry } from 'geojson';
import * as L from 'leaflet';

import { OneHealthObservation } from '../../core/data/models/one-health-observation.model';
import {
  MAP_RISK_LABELS,
  MapRiskLevel,
  toMapRiskLevel,
} from './observation-risk.util';

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

export type CeeacActivityLevel = 'none' | MapRiskLevel;

export interface CeeacCountrySelection {
  readonly code: string;
  readonly name: string;
  readonly bounds: L.LatLngBounds;
}

export interface CeeacTerritoryColor {
  readonly fill: string;
  readonly stroke: string;
}

export interface CeeacBoundaryLayerOptions {
  readonly visibleObservations: () => readonly OneHealthObservation[];
  readonly selectedCountryCode?: () => string | null;
  readonly onCountrySelect?: (selection: CeeacCountrySelection) => void;
}

export type CeeacBoundaries = FeatureCollection<Geometry, CeeacCountryProperties>;

const CEEAC_BOUNDARIES_URL = 'assets/geo/ceeac-countries.geojson';
const CEEAC_PANE = 'ceeac-country-boundaries';
const DEFAULT_TERRITORY_COLOR: CeeacTerritoryColor = {
  fill: '#b8c7d9',
  stroke: '#60758c',
};
export const CEEAC_TERRITORY_COLORS: Readonly<Record<string, CeeacTerritoryColor>> = {
  AO: { fill: '#e8b9c0', stroke: '#9f5f6a' },
  BI: { fill: '#dcc8ef', stroke: '#7b5b9d' },
  CM: { fill: '#f5cfb3', stroke: '#a9693d' },
  CF: { fill: '#c4ecd8', stroke: '#4f9072' },
  TD: { fill: '#fff9ad', stroke: '#a89735' },
  CG: { fill: '#c8efa7', stroke: '#67964a' },
  CD: { fill: '#78b478', stroke: '#3f7948' },
  GQ: { fill: '#eba45f', stroke: '#995923' },
  GA: { fill: '#a9c8f2', stroke: '#4f75ad' },
  RW: { fill: '#f4e2ae', stroke: '#a47e32' },
  ST: { fill: '#b8dfb1', stroke: '#548659' },
};
const ACTIVITY_LABELS: Readonly<Record<CeeacActivityLevel, string>> = {
  none: 'Aucune donnée visible',
  ...MAP_RISK_LABELS,
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
  const riskLevels = countryObservations.map((observation) =>
    toMapRiskLevel(observation.severity),
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
    verifiedAlerts > 0 || riskLevels.includes('high')
      ? 'high'
      : riskLevels.includes('medium')
        ? 'medium'
        : riskLevels.includes('low')
          ? 'low'
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
        {
          highlighted: false,
          selected: feature?.properties.code === options.selectedCountryCode?.(),
          selectionActive: Boolean(options.selectedCountryCode?.()),
        },
        feature?.properties.code ?? '',
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
                {
                  highlighted: true,
                  selected: feature.properties.code === options.selectedCountryCode?.(),
                  selectionActive: Boolean(options.selectedCountryCode?.()),
                },
                feature.properties.code,
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
                {
                  highlighted: false,
                  selected: feature.properties.code === options.selectedCountryCode?.(),
                  selectionActive: Boolean(options.selectedCountryCode?.()),
                },
                feature.properties.code,
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
      {
        highlighted: false,
        selected: feature?.properties.code === selectedCountryCode,
        selectionActive: selectedCountryCode !== null,
      },
      feature?.properties.code ?? '',
    ),
  );
}

export function countryStyle(
  summary: CeeacCountrySummary,
  state: {
    readonly highlighted: boolean;
    readonly selected: boolean;
    readonly selectionActive: boolean;
  },
  countryCode: string,
): L.PathOptions {
  const territoryColor = CEEAC_TERRITORY_COLORS[countryCode] ?? DEFAULT_TERRITORY_COLOR;
  const baseFillOpacity = summary.observations > 0 ? 0.16 : 0.08;
  const fillOpacity =
    state.selectionActive && !state.selected
      ? 0
      : state.selected && state.highlighted
        ? 0.38
        : state.selected
          ? 0.32
          : state.highlighted
            ? 0.26
            : baseFillOpacity;
  return {
    className: 'ceeac-country-boundary',
    color: territoryColor.stroke,
    fillColor: territoryColor.fill,
    fillOpacity,
    opacity: state.highlighted || state.selected ? 1 : 0.88,
    weight: state.highlighted ? 3.2 : state.selected ? 2.8 : 1.7,
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
