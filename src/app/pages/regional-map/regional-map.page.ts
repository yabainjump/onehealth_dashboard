import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  computed,
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
  LucidePawPrint,
  LucideRotateCcw,
  LucideShieldCheck,
  LucideStethoscope,
  LucideTrees,
  LucideX,
} from '@lucide/angular';
import * as L from 'leaflet';

import { OneHealthDataService } from '../../core/data/one-health-data.service';
import {
  HealthSector,
  MapPeriod,
  ObservationStage,
  OneHealthObservation,
} from '../../core/data/models/one-health-observation.model';

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
    LucidePawPrint,
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
  private readonly zone = inject(NgZone);
  private map?: L.Map;
  private markersLayer?: L.LayerGroup;

  protected readonly period = signal<MapPeriod>('30d');
  protected readonly activeSectors = signal<ReadonlySet<HealthSector>>(
    new Set(['human', 'animal', 'environment']),
  );
  protected readonly activeStages = signal<ReadonlySet<ObservationStage>>(
    new Set(['observation', 'signal', 'verified-alert']),
  );
  protected readonly filtersOpen = signal(false);
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

  protected readonly filteredObservations = computed(() =>
    this.dataService.filter({
      period: this.period(),
      sectors: this.activeSectors(),
      stages: this.activeStages(),
    }),
  );

  protected readonly filteredStageCounts = computed(() => {
    const counts: Record<ObservationStage, number> = {
      observation: 0,
      signal: 0,
      'verified-alert': 0,
    };
    const observations = this.dataService.filter({
      period: this.period(),
      sectors: this.activeSectors(),
    });

    for (const observation of observations) {
      counts[observation.stage] += 1;
    }

    return counts;
  });

  protected readonly totalObservations = this.dataService.summary.total;
  protected readonly sourceSummaries = this.dataService.sourceSummaries;

  ngAfterViewInit(): void {
    this.initializeMap();
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  protected selectPeriod(period: MapPeriod): void {
    this.period.set(period);
    this.refreshMarkers();
  }

  protected toggleSector(sector: HealthSector): void {
    const nextSectors = new Set(this.activeSectors());

    if (nextSectors.has(sector)) {
      nextSectors.delete(sector);
    } else {
      nextSectors.add(sector);
    }

    this.activeSectors.set(nextSectors);
    this.refreshMarkers();
  }

  protected toggleStage(stage: ObservationStage): void {
    const nextStages = new Set(this.activeStages());

    if (nextStages.has(stage)) {
      nextStages.delete(stage);
    } else {
      nextStages.add(stage);
    }

    this.activeStages.set(nextStages);
    this.refreshMarkers();
  }

  protected resetFilters(): void {
    this.period.set('30d');
    this.activeSectors.set(new Set(['human', 'animal', 'environment']));
    this.activeStages.set(new Set(['observation', 'signal', 'verified-alert']));
    this.selectedObservation.set(null);
    this.refreshMarkers();
    this.fitCeeac();
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

  private initializeMap(): void {
    this.map = L.map(this.mapContainer.nativeElement, {
      zoomControl: false,
      minZoom: 3,
      maxZoom: 13,
      zoomSnap: 0.25,
      preferCanvas: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    L.control.zoom({ position: 'topright' }).addTo(this.map);
    this.markersLayer = L.layerGroup().addTo(this.map);
    this.fitCeeac();
    this.renderMarkers();
  }

  private refreshMarkers(): void {
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
        observation.stage === 'verified-alert' ? 9 : observation.stage === 'signal' ? 7 : 5;
      const marker = L.circleMarker([observation.latitude, observation.longitude], {
        radius,
        color: '#ffffff',
        weight: observation.stage === 'verified-alert' ? 3 : 2,
        fillColor: SECTOR_COLORS[observation.sector],
        fillOpacity: observation.stage === 'observation' ? 0.68 : 0.94,
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
}
