import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideCheckCircle2,
  LucideClipboardCheck,
  LucideDownload,
  LucideExternalLink,
  LucideFileChartColumn,
  LucideGlobe2,
  LucidePawPrint,
  LucideShieldCheck,
  LucideSparkles,
  LucideStethoscope,
  LucideTrees,
  LucideTriangleAlert,
} from '@lucide/angular';

import { OneHealthDataService } from '../../core/data/one-health-data.service';
import { DEMO_REFERENCE_DATE } from '../../core/data/mock/ceeac-reference';
import { HealthSector, MapPeriod } from '../../core/data/models/one-health-observation.model';
import { RegionalMapPreviewComponent } from '../../shared/components/regional-map-preview/regional-map-preview.component';

interface PriorityAlert {
  readonly id: string;
  readonly title: string;
  readonly location: string;
  readonly summary: string;
  readonly sector: 'Humain' | 'Animal' | 'Environnement';
  readonly age: string;
  readonly tone: 'critical' | 'high' | 'observation';
}

interface DecisionItem {
  readonly label: string;
  readonly sectors: readonly string[];
  readonly priority: 'Haute' | 'Normale';
  readonly deadline: string;
}

@Component({
  selector: 'app-dashboard-page',
  imports: [
    RouterLink,
    RegionalMapPreviewComponent,
    LucideArrowRight,
    LucideCheckCircle2,
    LucideClipboardCheck,
    LucideDownload,
    LucideExternalLink,
    LucideFileChartColumn,
    LucideGlobe2,
    LucidePawPrint,
    LucideShieldCheck,
    LucideSparkles,
    LucideStethoscope,
    LucideTrees,
    LucideTriangleAlert,
  ],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly dataService = inject(OneHealthDataService);

  protected readonly selectedPeriod = signal<MapPeriod>('year');
  protected readonly dataSummary = this.dataService.summary;
  protected readonly displayedSummary = computed(() => {
    const observations = this.dataService.filter({
      period: this.selectedPeriod(),
      sectors: new Set(['human', 'animal', 'environment']),
    });

    return {
      total: observations.length,
      countries: new Set(observations.map((observation) => observation.countryCode)).size,
      alerts: observations.filter((observation) => observation.stage === 'verified-alert').length,
      signals: observations.filter((observation) => observation.stage === 'signal').length,
    };
  });
  protected readonly mapDataLabel = computed(() =>
    this.dataService.dataMode() === 'api' ? 'Données API Hub' : 'Données de démonstration',
  );

  protected readonly priorityAlerts: readonly PriorityAlert[] = this.dataService.verifiedAlerts.map(
    (observation) => ({
      id: observation.id,
      title: observation.title,
      location: `${observation.countryName} · ${observation.adminArea}`,
      summary: observation.summary,
      sector: this.sectorLabel(observation.sector),
      age: this.ageLabel(observation.observedAt),
      tone: {
        human: 'critical',
        animal: 'high',
        environment: 'observation',
      }[observation.sector] as PriorityAlert['tone'],
    }),
  );

  protected readonly decisions: readonly DecisionItem[] = [
    {
      label: 'Qualification du signal transfrontalier Cameroun–Tchad',
      sectors: ['Humain', 'Environnement'],
      priority: 'Haute',
      deadline: 'Aujourd’hui, 18:00',
    },
    {
      label: 'Validation de la synthèse mensuelle des zoonoses',
      sectors: ['Humain', 'Animal'],
      priority: 'Normale',
      deadline: '5 août 2026',
    },
  ];

  protected selectPeriod(period: MapPeriod): void {
    this.selectedPeriod.set(period);
  }

  private sectorLabel(sector: HealthSector): PriorityAlert['sector'] {
    return {
      human: 'Humain',
      animal: 'Animal',
      environment: 'Environnement',
    }[sector] as PriorityAlert['sector'];
  }

  private ageLabel(observedAt: string): string {
    const days = Math.floor(
      (DEMO_REFERENCE_DATE.getTime() - new Date(observedAt).getTime()) / (24 * 60 * 60 * 1000),
    );

    if (days <= 0) {
      return "Aujourd'hui";
    }

    if (days === 1) {
      return 'Hier';
    }

    return `Il y a ${days} j`;
  }
}
