import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideActivity,
  LucideArrowRight,
  LucideChevronLeft,
  LucideChevronRight,
  LucideDownload,
  LucideMap,
  LucideMapPin,
  LucidePawPrint,
  LucideSearch,
  LucideShieldCheck,
  LucideStethoscope,
  LucideTrees,
  LucideTriangleAlert,
} from '@lucide/angular';

import { AlertRegistryStore } from './alert-registry.store';
import { BrandLoaderComponent } from '../../shared/components/brand-loader/brand-loader.component';
import { CEEAC_COUNTRIES } from '../../core/data/mock/ceeac-reference';
import {
  SECTOR_LABELS,
  SEVERITY_LABELS,
  STAGE_LABELS,
  formatObservationDate,
} from '../../core/data/observation-presenter';
import {
  HealthSector,
  ObservationStage,
  OneHealthObservation,
} from '../../core/data/models/one-health-observation.model';

type AlertViewMode = 'all' | 'priority' | 'country';
type SectorFilter = 'all' | HealthSector;
type StageFilter = 'all' | ObservationStage;

@Component({
  selector: 'app-alert-list-page',
  imports: [
    RouterLink,
    BrandLoaderComponent,
    LucideActivity,
    LucideArrowRight,
    LucideChevronLeft,
    LucideChevronRight,
    LucideDownload,
    LucideMap,
    LucideMapPin,
    LucidePawPrint,
    LucideSearch,
    LucideShieldCheck,
    LucideStethoscope,
    LucideTrees,
    LucideTriangleAlert,
  ],
  providers: [AlertRegistryStore],
  templateUrl: './alert-list.page.html',
  styleUrl: './alert-list.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertListPage {
  protected readonly registry = inject(AlertRegistryStore);
  private readonly pageSize = 8;
  protected readonly summary = this.registry.summary;
  protected readonly countries = CEEAC_COUNTRIES;
  protected readonly viewMode = this.registry.viewMode;
  protected readonly searchTerm = this.registry.searchTerm;
  protected readonly selectedCountry = this.registry.selectedCountry;
  protected readonly selectedSector = this.registry.selectedSector;
  protected readonly selectedStage = this.registry.selectedStage;
  protected readonly currentPage = this.registry.currentPage;
  protected readonly totalPages = this.registry.totalPages;
  protected readonly pagedObservations = this.registry.items;

  protected readonly resultRange = computed(() => {
    const total = this.registry.total();
    if (this.registry.loading()) return 'Chargement…';
    if (this.registry.error()) return 'Résultats indisponibles';
    if (!total) {
      return 'Aucun résultat';
    }

    const page = Math.min(this.currentPage(), this.totalPages());
    const start = (page - 1) * this.pageSize + 1;
    const end = Math.min(page * this.pageSize, total);
    return `${start}–${end} sur ${total}`;
  });

  protected setViewMode(mode: AlertViewMode): void {
    this.viewMode.set(mode);
    this.currentPage.set(1);
  }

  protected onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value.trim().slice(0, 100);
    this.searchTerm.set(value);
    this.currentPage.set(1);
  }

  protected onCountryChange(event: Event): void {
    this.selectedCountry.set((event.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  protected onSectorChange(event: Event): void {
    this.selectedSector.set((event.target as HTMLSelectElement).value as SectorFilter);
    this.currentPage.set(1);
  }

  protected onStageChange(event: Event): void {
    this.selectedStage.set((event.target as HTMLSelectElement).value as StageFilter);
    this.currentPage.set(1);
  }

  protected previousPage(): void {
    this.currentPage.update((page) => Math.max(1, page - 1));
  }

  protected nextPage(): void {
    this.currentPage.update((page) => Math.min(this.totalPages(), page + 1));
  }

  protected sectorLabel(sector: HealthSector): string {
    return SECTOR_LABELS[sector];
  }

  protected stageLabel(stage: ObservationStage): string {
    return STAGE_LABELS[stage];
  }

  protected severityLabel(observation: OneHealthObservation): string {
    return SEVERITY_LABELS[observation.severity];
  }

  protected formatDate(isoDate: string): string {
    return formatObservationDate(isoDate);
  }

  protected exportCsv(): void {
    if (this.registry.loading() || this.registry.error() || !this.pagedObservations().length) return;
    const headers = [
      'Identifiant Hub',
      'Identifiant source',
      'Source',
      'Titre',
      'Pays',
      'Zone',
      'Secteur',
      'Qualification',
      'Sévérité',
      'Date',
    ];
    const rows = this.pagedObservations().map((observation) => [
      observation.id,
      observation.sourceRecordId,
      observation.sourceSystem,
      observation.title,
      observation.countryName,
      observation.adminArea,
      this.sectorLabel(observation.sector),
      this.stageLabel(observation.stage),
      this.severityLabel(observation),
      observation.observedAt,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => this.escapeCsvCell(cell)).join(','))
      .join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `one-health-ceeac-signaux-page-${this.currentPage()}.csv`;
    anchor.style.display = 'none';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  private escapeCsvCell(value: string): string {
    let safeValue = value;
    if (/^[=+\-@]/.test(safeValue)) {
      safeValue = `'${safeValue}`;
    }

    return `"${safeValue.replaceAll('"', '""')}"`;
  }
}
