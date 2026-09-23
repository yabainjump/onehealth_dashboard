import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  LucideArrowLeft,
  LucideCheckCircle2,
  LucideDatabase,
  LucideDownload,
  LucideFileText,
  LucideMapPin,
  LucideNetwork,
  LucidePrinter,
  LucideRefreshCw,
  LucideShieldCheck,
  LucideTriangleAlert,
} from '@lucide/angular';
import {
  HubApiService,
  HubScenarioReportApi,
} from '../../core/data/hub-api.service';
import { BrandLoaderComponent } from '../../shared/components/brand-loader/brand-loader.component';
import {
  renderScenarioReportHtml,
  scenarioReportFilename,
} from './scenario-report-presenter';

@Component({
  selector: 'app-scenario-report-page',
  imports: [
    RouterLink,
    BrandLoaderComponent,
    LucideArrowLeft,
    LucideCheckCircle2,
    LucideDatabase,
    LucideDownload,
    LucideFileText,
    LucideMapPin,
    LucideNetwork,
    LucidePrinter,
    LucideRefreshCw,
    LucideShieldCheck,
    LucideTriangleAlert,
  ],
  templateUrl: './scenario-report.page.html',
  styleUrl: './scenario-report.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScenarioReportPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly hubApi = inject(HubApiService);

  protected readonly report = signal<HubScenarioReportApi | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly feedback = signal('');
  protected readonly sectorLabels: Readonly<
    Record<HubScenarioReportApi['sectors'][number], string>
  > = {
    human: 'Santé humaine',
    animal: 'Santé animale',
    environment: 'Climat et environnement',
  };

  ngOnInit(): void {
    void this.loadReport();
  }

  protected async loadReport(): Promise<void> {
    const scenarioCode = this.route.snapshot.paramMap.get('scenarioCode');
    if (!scenarioCode) {
      this.loading.set(false);
      this.error.set('Le scénario demandé est introuvable.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    try {
      this.report.set(await this.hubApi.getScenarioReport(scenarioCode));
    } catch {
      this.report.set(null);
      this.error.set(
        'Le rapport n’est pas encore disponible. Terminez le scénario puis réessayez.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  protected confidencePercent(report: HubScenarioReportApi): number {
    return Math.round(report.confidenceScore * 100);
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  protected formatPeriodDate(value: string): string {
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'long',
      timeZone: 'UTC',
    }).format(new Date(`${value}T00:00:00.000Z`));
  }

  protected printReport(): void {
    window.print();
  }

  protected downloadReport(): void {
    const report = this.report();
    if (!report) return;
    const url = URL.createObjectURL(
      new Blob([renderScenarioReportHtml(report)], { type: 'text/html;charset=utf-8' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${scenarioReportFilename(report)}.html`;
    anchor.style.display = 'none';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    this.feedback.set('Le rapport HTML a été téléchargé.');
  }
}
