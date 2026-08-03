import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideActivity,
  LucideChevronRight,
  LucideCloudRain,
  LucideDownload,
  LucideFilter,
  LucideInfo,
  LucidePawPrint,
  LucideShieldCheck,
  LucideStethoscope,
  LucideTrees,
} from '@lucide/angular';
import { OneHealthDataService } from '../../core/data/one-health-data.service';
import {
  HealthSector,
  ObservationSeverity,
  OneHealthObservation,
} from '../../core/data/models/one-health-observation.model';
import {
  SECTOR_LABELS,
  SEVERITY_LABELS,
  STAGE_LABELS,
  formatObservationDate,
} from '../../core/data/observation-presenter';
import {
  AnalysisPeriod,
  AnalysisSector,
  buildAnalysisChart,
  buildCountryQualityScores,
  filterAnalysisObservations,
} from './analysis-presenter';

const SEVERITY_ORDER: Readonly<Record<ObservationSeverity, number>> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

@Component({
  selector: 'app-analyses-page',
  imports: [
    RouterLink,
    LucideActivity,
    LucideChevronRight,
    LucideCloudRain,
    LucideDownload,
    LucideFilter,
    LucideInfo,
    LucidePawPrint,
    LucideShieldCheck,
    LucideStethoscope,
    LucideTrees,
  ],
  templateUrl: './analyses.page.html',
  styleUrl: './analyses.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalysesPage {
  private readonly dataService = inject(OneHealthDataService);

  protected readonly selectedCountry = signal('all');
  protected readonly selectedSector = signal<AnalysisSector>('all');
  protected readonly selectedPeriod = signal<AnalysisPeriod>(30);
  protected readonly availableCountries = [
    ...new Map(
      this.dataService.observations.map((item) => [item.countryCode, item.countryName]),
    ).entries(),
  ]
    .map(([code, name]) => ({ code, name }))
    .sort((left, right) => left.name.localeCompare(right.name, 'fr'));

  protected readonly filteredObservations = computed(() =>
    filterAnalysisObservations(
      this.dataService.observations,
      this.selectedCountry(),
      this.selectedSector(),
      this.selectedPeriod(),
    ),
  );

  protected readonly multisectorObservations = computed(() =>
    filterAnalysisObservations(
      this.dataService.observations,
      this.selectedCountry(),
      'all',
      this.selectedPeriod(),
    ),
  );

  protected readonly chart = computed(() =>
    buildAnalysisChart(this.filteredObservations(), this.selectedPeriod(), this.selectedSector()),
  );

  protected readonly qualityScores = computed(() =>
    buildCountryQualityScores(this.multisectorObservations()).slice(0, 5),
  );

  protected readonly activeSources = computed(() => {
    const observations = this.filteredObservations();
    return [
      {
        source: 'DHIS2',
        label: 'Santé humaine',
        sector: 'human' as const,
        count: observations.filter((item) => item.sourceSystem === 'DHIS2').length,
      },
      {
        source: 'ARIS 3',
        label: 'Santé animale',
        sector: 'animal' as const,
        count: observations.filter((item) => item.sourceSystem === 'ARIS 3').length,
      },
      {
        source: 'CAPC-AC',
        label: 'Climat et environnement',
        sector: 'environment' as const,
        count: observations.filter((item) => item.sourceSystem === 'CAPC-AC').length,
      },
    ];
  });

  protected readonly prioritySignals = computed(() =>
    this.filteredObservations()
      .filter((item) => item.stage !== 'observation')
      .sort(
        (left, right) =>
          SEVERITY_ORDER[right.severity] - SEVERITY_ORDER[left.severity] ||
          right.observedAt.localeCompare(left.observedAt),
      )
      .slice(0, 8),
  );

  protected readonly averageQuality = computed(() => {
    const scores = this.qualityScores();
    return scores.length
      ? Math.round(scores.reduce((total, item) => total + item.score, 0) / scores.length)
      : 0;
  });

  protected onCountryChange(event: Event): void {
    this.selectedCountry.set((event.target as HTMLSelectElement).value);
  }

  protected onSectorChange(event: Event): void {
    this.selectedSector.set((event.target as HTMLSelectElement).value as AnalysisSector);
  }

  protected onPeriodChange(event: Event): void {
    this.selectedPeriod.set(Number((event.target as HTMLSelectElement).value) as AnalysisPeriod);
  }

  protected resetFilters(): void {
    this.selectedCountry.set('all');
    this.selectedSector.set('all');
    this.selectedPeriod.set(30);
  }

  protected formatDate(value: string): string {
    return formatObservationDate(value);
  }

  protected severityLabel(item: OneHealthObservation): string {
    return SEVERITY_LABELS[item.severity];
  }

  protected stageLabel(item: OneHealthObservation): string {
    return STAGE_LABELS[item.stage];
  }

  protected sectorLabel(sector: HealthSector): string {
    return SECTOR_LABELS[sector];
  }

  protected relatedSectors(item: OneHealthObservation): readonly HealthSector[] {
    const referenceTime = new Date(item.observedAt).getTime();
    return [
      ...new Set(
        this.multisectorObservations()
          .filter(
            (candidate) =>
              candidate.countryCode === item.countryCode &&
              Math.abs(new Date(candidate.observedAt).getTime() - referenceTime) <=
                7 * 24 * 60 * 60 * 1000,
          )
          .map((candidate) => candidate.sector),
      ),
    ];
  }

  protected qualityTone(score: number): 'good' | 'warning' | 'danger' {
    if (score >= 90) return 'good';
    if (score >= 75) return 'warning';
    return 'danger';
  }

  protected correlationLabel(value: number | null): string {
    if (value === null) return 'Vue sectorielle';
    const magnitude = Math.abs(value);
    if (magnitude >= 0.7) return 'Convergence forte';
    if (magnitude >= 0.4) return 'Convergence modérée';
    return 'Convergence faible';
  }

  protected exportCsv(): void {
    const headers = [
      'Identifiant',
      'Date',
      'Pays',
      'Zone',
      'Signalement',
      'Secteur',
      'Source',
      'Qualification',
      'Gravité',
    ];
    const rows = this.filteredObservations().map((item) => [
      item.id,
      item.observedAt,
      item.countryName,
      item.adminArea,
      item.title,
      this.sectorLabel(item.sector),
      item.sourceSystem,
      this.stageLabel(item),
      this.severityLabel(item),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((value) => this.escapeCsvCell(value)).join(','))
      .join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'analyse-one-health-ceeac.csv';
    anchor.style.display = 'none';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  private escapeCsvCell(value: string): string {
    const safeValue = /^[=+\-@]/.test(value) ? `'${value}` : value;
    return `"${safeValue.replaceAll('"', '""')}"`;
  }
}
