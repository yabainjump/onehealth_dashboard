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
  LucideDownload,
  LucideFileText,
  LucideFilter,
  LucideInfo,
  LucidePrinter,
  LucideSearch,
  LucideShieldCheck,
  LucideSparkles,
} from '@lucide/angular';
import { OneHealthDataService } from '../../core/data/one-health-data.service';
import { HubApiService, HubScenarioApi } from '../../core/data/hub-api.service';
import { HubAiApiService } from '../../core/data/hub-ai-api.service';
import { DashboardAuthService } from '../../core/auth/dashboard-auth.service';
import { RudolfMarkdownPipe } from '../../shared/pipes/rudolf-markdown.pipe';
import { revealRudolfText } from '../../shared/utils/reveal-rudolf-text';
import {
  HubReport,
  REPORT_RISK_LABELS,
  REPORT_SCOPE_LABELS,
  REPORT_SECTOR_LABELS,
  ReportScope,
  buildReportLibrary,
  renderReportHtml,
  reportFilename,
} from './report-presenter';

type ReportScopeFilter = 'all' | ReportScope;

@Component({
  selector: 'app-reports-page',
  imports: [
    RouterLink,
    LucideDownload,
    LucideFileText,
    LucideFilter,
    LucideInfo,
    LucidePrinter,
    LucideSearch,
    LucideShieldCheck,
    LucideSparkles,
    RudolfMarkdownPipe,
  ],
  templateUrl: './reports.page.html',
  styleUrl: './reports.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsPage implements OnInit {
  private readonly dataService = inject(OneHealthDataService);
  private readonly hubApi = inject(HubApiService);
  private readonly hubAi = inject(HubAiApiService);
  protected readonly auth = inject(DashboardAuthService);

  protected readonly scopeLabel = REPORT_SCOPE_LABELS;
  protected readonly riskLabel = REPORT_RISK_LABELS;
  protected readonly sectorLabel = REPORT_SECTOR_LABELS;
  protected readonly reports = buildReportLibrary(this.dataService.observations);
  protected readonly searchTerm = signal('');
  protected readonly selectedScope = signal<ReportScopeFilter>('all');
  protected readonly selectedCountry = signal('all');
  protected readonly selectedReport = signal<HubReport | null>(this.reports[0] ?? null);
  protected readonly feedback = signal('');
  protected readonly aiBusy = signal(false);
  protected readonly aiDraft = signal('');
  protected readonly aiError = signal('');
  protected readonly scenario = signal<HubScenarioApi | null>(null);

  async ngOnInit(): Promise<void> {
    if (!this.auth.canManageConnectors()) return;
    try {
      this.scenario.set(await this.hubApi.getScenario());
    } catch {
      this.scenario.set(null);
    }
  }

  protected async prepareRudolfDraft(): Promise<void> {
    const report = this.selectedReport();
    if (!report || this.aiBusy()) return;
    this.aiBusy.set(true);
    this.aiError.set('');
    this.aiDraft.set('');
    try {
      const response = await this.hubAi.reportDraft({
        ...(report.countryCode ? { countryCode: report.countryCode } : {}),
        ...(report.sector ? { sector: report.sector } : {}),
        periodDays: report.periodDays,
      });
      await revealRudolfText(response.content, (text) => this.aiDraft.set(text));
    } catch {
      this.aiError.set('Rudolf n’a pas pu préparer ce projet de rapport.');
    } finally {
      this.aiBusy.set(false);
    }
  }

  protected readonly countries = [
    ...new Map(
      this.reports
        .filter((report) => report.countryCode)
        .map((report) => [report.countryCode ?? '', report.countryName]),
    ).entries(),
  ]
    .map(([code, name]) => ({ code, name }))
    .sort((left, right) => left.name.localeCompare(right.name, 'fr'));

  protected readonly filteredReports = computed(() => {
    const query = this.searchTerm().toLocaleLowerCase('fr');
    const scope = this.selectedScope();
    const country = this.selectedCountry();
    return this.reports.filter(
      (report) =>
        (scope === 'all' || report.scope === scope) &&
        (country === 'all' || report.countryCode === country) &&
        (!query ||
          [report.title, report.description, report.countryName, report.periodLabel].some((value) =>
            value.toLocaleLowerCase('fr').includes(query),
          )),
    );
  });

  protected readonly summary = computed(() => ({
    total: this.reports.length,
    countries: new Set(this.reports.map((report) => report.countryCode).filter(Boolean)).size,
    priority: this.reports.filter((report) => report.risk === 'priority').length,
    verifiedAlerts: Math.max(...this.reports.map((report) => report.verifiedAlertCount), 0),
  }));

  protected readonly dataModeLabel = computed(() => {
    const mode = this.dataService.dataMode();
    if (mode === 'api') return 'Données issues de l’API Hub';
    if (mode === 'fallback') return 'Données fictives de démonstration';
    return 'Données en cours de qualification';
  });

  protected onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value.trim().slice(0, 120));
  }

  protected onScopeChange(event: Event): void {
    this.selectedScope.set((event.target as HTMLSelectElement).value as ReportScopeFilter);
    this.selectFirstFiltered();
  }

  protected onCountryChange(event: Event): void {
    this.selectedCountry.set((event.target as HTMLSelectElement).value);
    this.selectFirstFiltered();
  }

  protected resetFilters(): void {
    this.searchTerm.set('');
    this.selectedScope.set('all');
    this.selectedCountry.set('all');
    this.selectedReport.set(this.reports[0] ?? null);
  }

  protected selectReport(report: HubReport): void {
    this.selectedReport.set(report);
    this.feedback.set('');
    this.aiDraft.set('');
    this.aiError.set('');
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('fr', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  }

  protected downloadReport(): void {
    const report = this.selectedReport();
    if (!report) return;
    this.downloadBlob(
      renderReportHtml(report, this.dataModeLabel()),
      `${reportFilename(report)}.html`,
      'text/html;charset=utf-8',
    );
    this.feedback.set('Le rapport HTML a été téléchargé. Il peut être imprimé ou converti en PDF.');
  }

  protected printReport(): void {
    const report = this.selectedReport();
    if (!report) return;
    const printWindow = window.open('', '_blank', 'popup,width=980,height=760');
    if (!printWindow) {
      this.feedback.set('La fenêtre d’impression a été bloquée par le navigateur.');
      return;
    }
    printWindow.opener = null;
    printWindow.document.open();
    printWindow.document.write(renderReportHtml(report, this.dataModeLabel()));
    printWindow.document.close();
    printWindow.focus();
    printWindow.setTimeout(() => printWindow.print(), 250);
  }

  protected exportCatalogue(): void {
    const headers = [
      'Identifiant',
      'Titre',
      'Type',
      'Périmètre',
      'Période',
      'Observations',
      'Signaux',
      'Alertes vérifiées',
      'Niveau',
    ];
    const rows = this.filteredReports().map((report) => [
      report.id,
      report.title,
      REPORT_SCOPE_LABELS[report.scope],
      report.countryName,
      report.periodLabel,
      String(report.observationCount),
      String(report.signalCount),
      String(report.verifiedAlertCount),
      REPORT_RISK_LABELS[report.risk],
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((value) => this.escapeCsvCell(value)).join(','))
      .join('\r\n');
    this.downloadBlob(
      `\uFEFF${csv}`,
      'catalogue-rapports-one-health-ceeac.csv',
      'text/csv;charset=utf-8',
    );
  }

  private selectFirstFiltered(): void {
    queueMicrotask(() => this.selectedReport.set(this.filteredReports()[0] ?? null));
  }

  private downloadBlob(content: string, filename: string, type: string): void {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
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
