import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
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
import { DashboardAuthService } from '../../core/auth/dashboard-auth.service';
import { HubApiService, HubDecisionApi, HubScenarioApi } from '../../core/data/hub-api.service';

interface PriorityAlert {
  readonly id: string;
  readonly title: string;
  readonly location: string;
  readonly summary: string;
  readonly sector: 'Humain' | 'Animal' | 'Environnement';
  readonly age: string;
  readonly tone: 'critical' | 'high' | 'observation';
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
export class DashboardPage implements OnInit {
  private readonly dataService = inject(OneHealthDataService);
  private readonly hubApi = inject(HubApiService);
  protected readonly auth = inject(DashboardAuthService);

  protected readonly selectedPeriod = signal<MapPeriod>('year');
  protected readonly dataSummary = computed(() => {
    this.dataService.revision();
    return this.dataService.summary;
  });
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
  protected readonly decisions = signal<readonly HubDecisionApi[]>([]);
  protected readonly scenario = signal<HubScenarioApi | null>(null);
  protected readonly scenarioBusy = signal(false);
  protected readonly scenarioMessage = signal<string | null>(null);

  protected readonly priorityAlerts = computed<readonly PriorityAlert[]>(() => {
    this.dataService.revision();
    return this.dataService.verifiedAlerts.map((observation) => ({
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
    }));
  });

  async ngOnInit(): Promise<void> {
    await this.loadDecisions();
    if (this.auth.canManageConnectors()) {
      try {
        this.scenario.set(await this.hubApi.getScenario());
      } catch {
        this.scenarioMessage.set("Le moteur de scénario n'est pas disponible pour le moment.");
      }
    }
  }

  protected async runScenario(): Promise<void> {
    if (this.scenarioBusy()) return;
    this.scenarioBusy.set(true);
    this.scenarioMessage.set(null);
    try {
      this.scenario.set(await this.hubApi.runScenario());
      await this.dataService.refreshFromHub();
      await this.loadDecisions();
      this.scenarioMessage.set(
        'Scénario terminé : quatre observations et un signal décisionnel sont disponibles.',
      );
    } catch {
      this.scenarioMessage.set("L'exécution du scénario a échoué. Vérifiez la connexion au Hub.");
    } finally {
      this.scenarioBusy.set(false);
    }
  }

  protected exportData(): void {
    this.dataService.revision();
    const observations = this.dataService.filter({
      period: this.selectedPeriod(),
      sectors: new Set(['human', 'animal', 'environment']),
    });
    const rows = [
      ['Identifiant', 'Source', 'Secteur', 'Pays', 'Zone', 'Date', 'Stade', 'Risque', 'Titre'],
      ...observations.map((item) => [
        item.id,
        item.sourceSystem,
        item.sector,
        item.countryName,
        item.adminArea,
        item.observedAt,
        item.stage,
        item.severity,
        item.title,
      ]),
    ];
    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(';'))
      .join('\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `one-health-ceeac-${this.selectedPeriod()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  protected selectPeriod(period: MapPeriod): void {
    this.selectedPeriod.set(period);
  }

  protected sectorShort(sector: HealthSector): string {
    return { human: 'H', animal: 'A', environment: 'E' }[sector];
  }

  protected priorityLabel(priority: HubDecisionApi['priority']): string {
    return { critical: 'Critique', high: 'Haute', medium: 'Normale', low: 'Faible' }[priority];
  }

  protected deadlineLabel(value: string): string {
    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(
      new Date(value),
    );
  }

  private async loadDecisions(): Promise<void> {
    try {
      this.decisions.set((await this.hubApi.getDecisions()).items);
    } catch {
      this.decisions.set(
        this.dataService.signals.map((item) => ({
          signalCode: `SIG-${item.sourceRecordId}`,
          observationId: item.id,
          title: item.title,
          countryCode: item.countryCode,
          countryName: item.countryName,
          adminArea: item.adminArea,
          sector: item.sector,
          priority: item.severity,
          confidenceScore: 0,
          status: 'SIGNAL_DETECTED',
          assignedTo: null,
          detectedAt: item.observedAt,
          dueAt: item.observedAt,
          simulated: true,
        })),
      );
    }
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
