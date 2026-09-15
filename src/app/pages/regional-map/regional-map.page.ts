import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideActivity,
  LucideCalendarDays,
  LucideCheck,
  LucideChevronRight,
  LucideFilter,
  LucideLocateFixed,
  LucideMapPinned,
  LucideNetwork,
  LucidePawPrint,
  LucidePause,
  LucidePlay,
  LucideRotateCcw,
  LucideShieldCheck,
  LucideStethoscope,
  LucideTrees,
  LucideX,
} from '@lucide/angular';
import * as L from 'leaflet';

import { HubApiService, HubEventApi } from '../../core/data/hub-api.service';
import { DEMO_REFERENCE_DATE } from '../../core/data/mock/ceeac-reference';
import { OneHealthDataService } from '../../core/data/one-health-data.service';
import {
  HealthSector,
  MapPeriod,
  ObservationStage,
  OneHealthObservation,
} from '../../core/data/models/one-health-observation.model';
import {
  buildMapTimeline,
  filterObservationsByDateRange,
  filterObservationsAt,
  observationsForEvent,
} from './regional-map.presenter';

interface SectorOption {
  readonly id: HealthSector;
  readonly label: string;
  readonly description: string;
  readonly color: string;
}

interface StageOption {
  readonly id: ObservationStage;
  readonly label: string;
}

const SECTOR_COLORS: Readonly<Record<HealthSector, string>> = {
  human: '#d83a42',
  animal: '#ef7b18',
  environment: '#2187c9',
};

const formatDateInput = (date: Date): string => date.toISOString().slice(0, 10);
const DEFAULT_CUSTOM_DATE_TO = formatDateInput(DEMO_REFERENCE_DATE);
const DEFAULT_CUSTOM_DATE_FROM = formatDateInput(
  new Date(DEMO_REFERENCE_DATE.getTime() - 29 * 24 * 60 * 60 * 1000),
);

@Component({
  selector: 'app-regional-map-page',
  imports: [
    RouterLink,
    LucideActivity,
    LucideCalendarDays,
    LucideCheck,
    LucideChevronRight,
    LucideFilter,
    LucideLocateFixed,
    LucideMapPinned,
    LucideNetwork,
    LucidePawPrint,
    LucidePause,
    LucidePlay,
    LucideRotateCcw,
    LucideShieldCheck,
    LucideStethoscope,
    LucideTrees,
    LucideX,
  ],
  templateUrl: './regional-map.page.html',
  styleUrl: './regional-map.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegionalMapPage implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true })
  private readonly mapContainer!: ElementRef<HTMLDivElement>;

  private readonly dataService = inject(OneHealthDataService);
  private readonly hubApi = inject(HubApiService);
  private readonly zone = inject(NgZone);
  private map?: L.Map;
  private markersLayer?: L.LayerGroup;
  private correlationLayer?: L.LayerGroup;
  private timelineTimer?: number;

  protected readonly period = signal<MapPeriod>('30d');
  protected readonly customPeriodActive = signal(false);
  protected readonly customDateFrom = signal(DEFAULT_CUSTOM_DATE_FROM);
  protected readonly customDateTo = signal(DEFAULT_CUSTOM_DATE_TO);
  protected readonly activeSectors = signal<ReadonlySet<HealthSector>>(
    new Set(['human', 'animal', 'environment']),
  );
  protected readonly activeStages = signal<ReadonlySet<ObservationStage>>(
    new Set(['observation', 'signal', 'verified-alert']),
  );
  protected readonly filtersOpen = signal(false);
  protected readonly timelinePercent = signal(100);
  protected readonly timelinePlaying = signal(false);
  protected readonly correlationsVisible = signal(true);
  protected readonly hubEvents = signal<readonly HubEventApi[]>([]);
  protected readonly selectedObservation = signal<OneHealthObservation | null>(
    this.dataService.verifiedAlerts[0] ?? null,
  );

  protected readonly sectorOptions: readonly SectorOption[] = [
    {
      id: 'human',
      label: 'Santé humaine',
      description: 'Épidémies et cas suspects · DHIS2',
      color: SECTOR_COLORS.human,
    },
    {
      id: 'animal',
      label: 'Santé animale',
      description: 'Zoonoses et mortalité · ARIS 3',
      color: SECTOR_COLORS.animal,
    },
    {
      id: 'environment',
      label: 'Climat et environnement',
      description: 'Anomalies et stations · CAPC-AC',
      color: SECTOR_COLORS.environment,
    },
  ];

  protected readonly stageOptions: readonly StageOption[] = [
    { id: 'observation', label: 'Observations sources' },
    { id: 'signal', label: 'Signaux à vérifier' },
    { id: 'verified-alert', label: 'Alertes vérifiées' },
  ];

  protected readonly customDateError = computed(() => {
    if (!this.customPeriodActive()) {
      return '';
    }

    const from = this.customDateFrom();
    const to = this.customDateTo();
    if (!from || !to) {
      return 'Sélectionnez une date de début et une date de fin.';
    }
    return from > to ? 'La date de début doit précéder la date de fin.' : '';
  });

  private readonly dateFilteredObservations = computed(() => {
    this.dataService.revision();
    const sectors = this.activeSectors();

    if (this.customPeriodActive()) {
      if (this.customDateError()) {
        return [];
      }
      return filterObservationsByDateRange(this.dataService.observations, {
        from: this.customDateFrom(),
        to: this.customDateTo(),
      }).filter((observation) => sectors.has(observation.sector));
    }

    return this.dataService.filter({ period: this.period(), sectors });
  });

  private readonly periodObservations = computed(() => {
    const stages = this.activeStages();
    return this.dateFilteredObservations().filter((observation) => stages.has(observation.stage));
  });

  protected readonly timeline = computed(() =>
    buildMapTimeline(this.periodObservations(), this.timelinePercent()),
  );

  protected readonly filteredObservations = computed(() =>
    filterObservationsAt(this.periodObservations(), this.timeline()?.cutoffMs ?? null),
  );

  protected readonly visibleCorrelationCount = computed(() => {
    const observations = this.filteredObservations();
    return this.hubEvents().filter((event) => observationsForEvent(event, observations).length >= 2)
      .length;
  });

  private readonly mapDataEffect = effect(() => {
    this.filteredObservations();
    this.hubEvents();
    this.correlationsVisible();
    if (this.map) {
      this.refreshMapLayers();
    }
  });

  protected readonly filteredStageCounts = computed(() => {
    const counts: Record<ObservationStage, number> = {
      observation: 0,
      signal: 0,
      'verified-alert': 0,
    };
    const observations = this.dateFilteredObservations();

    for (const observation of observations) {
      counts[observation.stage] += 1;
    }

    return counts;
  });

  protected readonly totalObservations = this.dataService.summary.total;
  protected readonly sourceSummaries = this.dataService.sourceSummaries;

  ngAfterViewInit(): void {
    this.initializeMap();
    void this.loadHubEvents();
  }

  ngOnDestroy(): void {
    this.stopTimelinePlayback();
    this.map?.remove();
  }

  protected selectPeriod(period: MapPeriod): void {
    this.stopTimelinePlayback();
    this.customPeriodActive.set(false);
    this.period.set(period);
    this.timelinePercent.set(100);
  }

  protected selectCustomPeriod(): void {
    this.stopTimelinePlayback();
    this.customPeriodActive.set(true);
    this.timelinePercent.set(100);
  }

  protected onCustomDateInput(boundary: 'from' | 'to', event: Event): void {
    this.stopTimelinePlayback();
    const value = (event.target as HTMLInputElement).value;
    if (boundary === 'from') {
      this.customDateFrom.set(value);
    } else {
      this.customDateTo.set(value);
    }
    this.timelinePercent.set(100);
  }

  protected toggleSector(sector: HealthSector): void {
    const nextSectors = new Set(this.activeSectors());

    if (nextSectors.has(sector)) {
      nextSectors.delete(sector);
    } else {
      nextSectors.add(sector);
    }

    this.activeSectors.set(nextSectors);
  }

  protected toggleStage(stage: ObservationStage): void {
    const nextStages = new Set(this.activeStages());

    if (nextStages.has(stage)) {
      nextStages.delete(stage);
    } else {
      nextStages.add(stage);
    }

    this.activeStages.set(nextStages);
  }

  protected resetFilters(): void {
    this.period.set('30d');
    this.customPeriodActive.set(false);
    this.customDateFrom.set(DEFAULT_CUSTOM_DATE_FROM);
    this.customDateTo.set(DEFAULT_CUSTOM_DATE_TO);
    this.activeSectors.set(new Set(['human', 'animal', 'environment']));
    this.activeStages.set(new Set(['observation', 'signal', 'verified-alert']));
    this.timelinePercent.set(100);
    this.correlationsVisible.set(true);
    this.selectedObservation.set(null);
    this.stopTimelinePlayback();
    this.fitCeeac();
  }

  protected onTimelineInput(event: Event): void {
    this.stopTimelinePlayback();
    this.timelinePercent.set(Number((event.target as HTMLInputElement).value));
  }

  protected toggleTimelinePlayback(): void {
    if (this.timelinePlaying()) {
      this.stopTimelinePlayback();
      return;
    }

    if (this.timelinePercent() >= 100) {
      this.timelinePercent.set(0);
    }

    this.timelinePlaying.set(true);
    this.timelineTimer = window.setInterval(() => {
      this.zone.run(() => {
        const nextPercent = Math.min(100, this.timelinePercent() + 4);
        this.timelinePercent.set(nextPercent);
        if (nextPercent === 100) {
          this.stopTimelinePlayback();
        }
      });
    }, 320);
  }

  protected toggleCorrelations(): void {
    this.correlationsVisible.update((visible) => !visible);
  }

  protected toggleFilters(): void {
    this.filtersOpen.update((open) => !open);
    window.setTimeout(() => this.map?.invalidateSize(), 220);
  }

  protected closeFilters(): void {
    this.filtersOpen.set(false);
    window.setTimeout(() => this.map?.invalidateSize(), 220);
  }

  protected closeDetails(): void {
    this.selectedObservation.set(null);
  }

  protected fitCeeac(): void {
    const regionalZoom = this.mapContainer.nativeElement.clientWidth < 620 ? 3.5 : 4.25;
    this.map?.setView([0.8, 18.8], regionalZoom);
  }

  protected locateUser(): void {
    this.map?.locate({ setView: true, maxZoom: 7 });
  }

  protected isSectorActive(sector: HealthSector): boolean {
    return this.activeSectors().has(sector);
  }

  protected isStageActive(stage: ObservationStage): boolean {
    return this.activeStages().has(stage);
  }

  protected sectorLabel(sector: HealthSector): string {
    return {
      human: 'Santé humaine',
      animal: 'Santé animale',
      environment: 'Climat et environnement',
    }[sector];
  }

  protected stageLabel(stage: ObservationStage): string {
    return {
      observation: 'Observation source',
      signal: 'Signal à vérifier',
      'verified-alert': 'Alerte vérifiée',
    }[stage];
  }

  protected formatDate(isoDate: string): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    }).format(new Date(isoDate));
  }

  protected formatTimelineDate(timestamp: number): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(timestamp));
  }

  private initializeMap(): void {
    this.map = L.map(this.mapContainer.nativeElement, {
      zoomControl: false,
      minZoom: 3,
      maxZoom: 13,
      zoomSnap: 0.25,
      preferCanvas: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
      attribution: '&copy; OpenStreetMap contributors',
      className: 'ohn-operational-tiles',
      updateWhenIdle: true,
      keepBuffer: 3,
      noWrap: true,
    }).addTo(this.map);

    L.control.zoom({ position: 'topright' }).addTo(this.map);
    this.correlationLayer = L.layerGroup().addTo(this.map);
    this.markersLayer = L.layerGroup().addTo(this.map);
    this.fitCeeac();
    this.refreshMapLayers();
  }

  private refreshMapLayers(): void {
    this.renderCorrelations();
    this.renderMarkers();

    const selected = this.selectedObservation();
    if (selected && !this.filteredObservations().some((item) => item.id === selected.id)) {
      this.selectedObservation.set(null);
    }
  }

  private renderMarkers(): void {
    if (!this.map || !this.markersLayer) {
      return;
    }

    this.markersLayer.clearLayers();

    for (const observation of this.filteredObservations()) {
      const radius =
        observation.stage === 'verified-alert' ? 8 : observation.stage === 'signal' ? 6 : 4;

      if (observation.stage !== 'observation') {
        L.circleMarker([observation.latitude, observation.longitude], {
          radius: radius + 3,
          className: `observation-pulse observation-pulse--${observation.stage}`,
          color: SECTOR_COLORS[observation.sector],
          fill: false,
          opacity: 0.52,
          weight: 2,
          interactive: false,
        }).addTo(this.markersLayer);
      }

      const marker = L.circleMarker([observation.latitude, observation.longitude], {
        radius,
        className: `observation-point observation-point--${observation.stage}`,
        color: '#ffffff',
        weight: observation.stage === 'verified-alert' ? 3 : 2,
        fillColor: SECTOR_COLORS[observation.sector],
        fillOpacity: observation.stage === 'observation' ? 0.72 : 0.96,
        opacity: 1,
      });

      const tooltip = document.createElement('span');
      tooltip.textContent = `${observation.countryName} · ${observation.title}`;
      marker.bindTooltip(tooltip, { direction: 'top', offset: [0, -6] });
      marker.on('click', () => {
        this.zone.run(() => {
          this.selectedObservation.set(observation);
          this.map?.panTo([observation.latitude, observation.longitude]);
        });
      });
      marker.addTo(this.markersLayer);
    }
  }

  private renderCorrelations(): void {
    if (!this.correlationLayer) {
      return;
    }

    this.correlationLayer.clearLayers();
    if (!this.correlationsVisible()) {
      return;
    }

    const visibleObservations = this.filteredObservations();
    for (const event of this.hubEvents()) {
      const related = observationsForEvent(event, visibleObservations);
      if (
        related.length < 2 ||
        !Number.isFinite(event.latitude) ||
        !Number.isFinite(event.longitude)
      ) {
        continue;
      }

      const center: L.LatLngExpression = [event.latitude, event.longitude];
      for (const observation of related) {
        L.polyline([[observation.latitude, observation.longitude], center], {
          color: '#6554c0',
          dashArray: '4 6',
          interactive: false,
          opacity: 0.56,
          weight: 1.5,
        }).addTo(this.correlationLayer);
      }

      const eventMarker = L.circleMarker(center, {
        radius: 5,
        color: '#ffffff',
        fillColor: '#6554c0',
        fillOpacity: 0.96,
        weight: 2,
      });
      const tooltip = document.createElement('span');
      tooltip.textContent = `${event.title} · rapprochement ${Math.round(event.correlationScore * 100)} %`;
      eventMarker.bindTooltip(tooltip, { direction: 'top', offset: [0, -5] });
      eventMarker.addTo(this.correlationLayer);
    }
  }

  private async loadHubEvents(): Promise<void> {
    try {
      const response = await this.hubApi.getEvents();
      this.hubEvents.set(response.items);
    } catch {
      this.hubEvents.set([]);
    }
  }

  private stopTimelinePlayback(): void {
    if (this.timelineTimer !== undefined) {
      window.clearInterval(this.timelineTimer);
      this.timelineTimer = undefined;
    }
    this.timelinePlaying.set(false);
  }
}
