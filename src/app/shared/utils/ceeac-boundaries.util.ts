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
}

export type CeeacBoundaries = FeatureCollection<Geometry, CeeacCountryProperties>;

const CEEAC_BOUNDARIES_URL = 'assets/geo/ceeac-countries.geojson';
const CEEAC_PANE = 'ceeac-country-boundaries';
const COUNTRY_COLORS: Readonly<Record<string, string>> = {
  AO: '#f59e0b',
  BI: '#38bdf8',
  CM: '#fb7185',
  CF: '#facc15',
  TD: '#a78bfa',
  CG: '#34d399',
  CD: '#f97316',
  GQ: '#22d3ee',
  GA: '#4ade80',
  RW: '#e879f9',
  ST: '#60a5fa',
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

  return {
    observations: countryObservations.length,
    signals: countryObservations.filter((observation) => observation.stage === 'signal').length,
    verifiedAlerts: countryObservations.filter(
      (observation) => observation.stage === 'verified-alert',
    ).length,
  };
}

export function createCeeacBoundaryLayer(
  map: L.Map,
  boundaries: CeeacBoundaries,
  visibleObservations: () => readonly OneHealthObservation[],
): L.GeoJSON<CeeacCountryProperties> {
  const pane = map.getPane(CEEAC_PANE) ?? map.createPane(CEEAC_PANE);
  pane.style.zIndex = '350';

  const renderer = L.svg({ pane: CEEAC_PANE, padding: 0.4 });
  return L.geoJSON<CeeacCountryProperties>(boundaries, {
    style: (feature) => ({
      ...countryStyle(feature?.properties.code ?? '', false),
      renderer,
    }),
    onEachFeature: (feature, layer) => {
      const tooltip = buildCountryTooltip(feature, visibleObservations());
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
            layer.setStyle(countryStyle(feature.properties.code, true));
          }
          layer.setTooltipContent(buildCountryTooltip(feature, visibleObservations()));
        },
        mouseout: () => {
          if (layer instanceof L.Path) {
            layer.setStyle(countryStyle(feature.properties.code, false));
          }
        },
      });
    },
  }).addTo(map);
}

function countryStyle(code: string, highlighted: boolean): L.PathOptions {
  const color = COUNTRY_COLORS[code] ?? '#38bdf8';
  return {
    className: 'ceeac-country-boundary',
    color,
    fillColor: color,
    fillOpacity: highlighted ? 0.2 : 0.035,
    opacity: highlighted ? 1 : 0.88,
    weight: highlighted ? 3 : 1.7,
  };
}

function buildCountryTooltip(
  feature: Feature<Geometry, CeeacCountryProperties>,
  observations: readonly OneHealthObservation[],
): HTMLElement {
  const summary = summarizeCeeacCountry(feature.properties.code, observations);
  const card = document.createElement('article');
  card.className = 'ceeac-country-card';

  const eyebrow = document.createElement('small');
  eyebrow.textContent = 'État membre CEEAC';
  const title = document.createElement('strong');
  title.textContent = feature.properties.name;
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

  card.append(eyebrow, title, metrics);
  return card;
}
