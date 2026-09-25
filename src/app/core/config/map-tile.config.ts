import { Injectable } from '@angular/core';
import * as L from 'leaflet';

import { environment } from '../../../environments/environment';

export type MapTileProvider = 'openstreetmap' | 'custom' | 'none';

export interface MapTileEnvironment {
  readonly provider: MapTileProvider;
  readonly urlTemplate: string;
  readonly attribution: string;
  readonly attributionUrl: string;
  readonly maxZoom: number;
}

export interface ResolvedMapTileConfiguration {
  readonly enabled: boolean;
  readonly urlTemplate: string;
  readonly attributionHtml: string;
  readonly maxZoom: number;
  readonly reason?: string;
}

const OSM_CONFIGURATION: ResolvedMapTileConfiguration = {
  enabled: true,
  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png?ngsw-bypass=true',
  attributionHtml:
    '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
  maxZoom: 19,
};

const DISABLED_CONFIGURATION: ResolvedMapTileConfiguration = {
  enabled: false,
  urlTemplate: '',
  attributionHtml: '',
  maxZoom: 13,
};

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ??
      character,
  );
}

function safeHttpsUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

export function resolveMapTileConfiguration(
  input?: Partial<MapTileEnvironment>,
): ResolvedMapTileConfiguration {
  const provider = input?.provider ?? 'openstreetmap';

  if (provider === 'none') return DISABLED_CONFIGURATION;
  if (provider === 'openstreetmap') return OSM_CONFIGURATION;

  const urlTemplate = input?.urlTemplate ?? '';
  const attributionValue = input?.attribution ?? '';
  const attributionUrlValue = input?.attributionUrl ?? '';
  const requestedMaxZoom = input?.maxZoom ?? 19;

  const templateUrl = safeHttpsUrl(
    urlTemplate.replace('{z}', '0').replace('{x}', '0').replace('{y}', '0'),
  );
  const hasCoordinates = ['{z}', '{x}', '{y}'].every((token) => urlTemplate.includes(token));
  const attribution = attributionValue.trim();
  const attributionUrl = attributionUrlValue ? safeHttpsUrl(attributionUrlValue) : null;
  const maxZoom =
    Number.isInteger(requestedMaxZoom) && requestedMaxZoom >= 3 && requestedMaxZoom <= 22
      ? requestedMaxZoom
      : 19;

  if (!templateUrl || !hasCoordinates || !attribution) {
    return {
      ...DISABLED_CONFIGURATION,
      reason: 'La configuration du fournisseur cartographique est invalide.',
    };
  }

  const safeAttribution = escapeHtml(attribution.slice(0, 160));
  return {
    enabled: true,
    urlTemplate,
    attributionHtml: attributionUrl
      ? `&copy; <a href="${escapeHtml(attributionUrl.href)}" target="_blank" rel="noopener noreferrer">${safeAttribution}</a>`
      : `&copy; ${safeAttribution}`,
    maxZoom,
  };
}

@Injectable({ providedIn: 'root' })
export class MapTileLayerService {
  // Local and server-generated environment files are intentionally ignored by Git. The optional
  // shape keeps older deployments buildable while the deployment script is being upgraded.
  private readonly runtimeEnvironment = environment as typeof environment & {
    readonly mapTiles?: Partial<MapTileEnvironment>;
  };

  readonly configuration = resolveMapTileConfiguration(this.runtimeEnvironment.mapTiles);

  addBaseLayer(map: L.Map, onSettled: () => void): L.TileLayer | null {
    if (!this.configuration.enabled) {
      queueMicrotask(onSettled);
      return null;
    }

    const layer = L.tileLayer(this.configuration.urlTemplate, {
      maxZoom: this.configuration.maxZoom,
      attribution: this.configuration.attributionHtml,
      className: 'ohn-operational-tiles',
      updateWhenIdle: true,
      updateWhenZooming: false,
      keepBuffer: 1,
      noWrap: true,
    });
    layer.once('load', onSettled);
    layer.once('tileerror', onSettled);
    layer.addTo(map);
    return layer;
  }
}
