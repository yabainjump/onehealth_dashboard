import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  inject,
  input,
} from '@angular/core';
import * as L from 'leaflet';

import { OneHealthDataService } from '../../../core/data/one-health-data.service';
import {
  HealthSector,
  MapPeriod,
  OneHealthObservation,
} from '../../../core/data/models/one-health-observation.model';

const SECTOR_COLORS: Readonly<Record<HealthSector, string>> = {
  human: '#d83a42',
  animal: '#ef7b18',
  environment: '#2187c9',
};

@Component({
  selector: 'app-regional-map-preview',
  template: `
    <div
      #mapContainer
      class="map-preview__canvas"
      aria-label="Carte régionale en lecture seule des observations One Health"
    ></div>
  `,
  styleUrl: './regional-map-preview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegionalMapPreviewComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true })
  private readonly mapContainer!: ElementRef<HTMLDivElement>;

  readonly period = input<MapPeriod>('year');

  private readonly dataService = inject(OneHealthDataService);
  private map?: L.Map;
  private markersLayer?: L.LayerGroup;

  private readonly periodEffect = effect(() => {
    const period = this.period();
    this.dataService.revision();
    if (this.map) {
      this.renderMarkers(period);
    }
  });

  ngAfterViewInit(): void {
    this.map = L.map(this.mapContainer.nativeElement, {
      zoomControl: false,
      minZoom: 3,
      maxZoom: 13,
      zoomSnap: 0.25,
      preferCanvas: true,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
      attribution: '&copy; OpenStreetMap contributors',
      className: 'ohn-operational-tiles',
      updateWhenIdle: true,
      keepBuffer: 2,
      noWrap: true,
    }).addTo(this.map);

    L.control.zoom({ position: 'topright' }).addTo(this.map);
    this.markersLayer = L.layerGroup().addTo(this.map);
    this.fitCeeac();
    this.renderMarkers(this.period());

    window.setTimeout(() => this.map?.invalidateSize(), 0);
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private fitCeeac(): void {
    const regionalZoom = this.mapContainer.nativeElement.clientWidth < 620 ? 3.5 : 4.25;
    this.map?.setView([0.8, 18.8], regionalZoom);
  }

  private renderMarkers(period: MapPeriod): void {
    if (!this.markersLayer) {
      return;
    }

    this.markersLayer.clearLayers();
    const observations = this.dataService.filter({
      period,
      sectors: new Set(['human', 'animal', 'environment']),
    });

    for (const observation of observations) {
      const marker = L.circleMarker(
        [observation.latitude, observation.longitude],
        this.markerOptions(observation),
      );
      const tooltip = document.createElement('span');
      tooltip.textContent = `${observation.countryName} · ${observation.title}`;
      marker.bindTooltip(tooltip, { direction: 'top', offset: [0, -6] });
      marker.addTo(this.markersLayer);
    }
  }

  private markerOptions(observation: OneHealthObservation): L.CircleMarkerOptions {
    return {
      radius: observation.stage === 'verified-alert' ? 8 : observation.stage === 'signal' ? 6 : 4,
      color: '#ffffff',
      weight: observation.stage === 'verified-alert' ? 3 : 2,
      fillColor: SECTOR_COLORS[observation.sector],
      fillOpacity: observation.stage === 'observation' ? 0.68 : 0.94,
      opacity: 1,
    };
  }
}
