import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  LucideActivity,
  LucideArrowLeft,
  LucideArrowRight,
  LucideCheck,
  LucideClock3,
  LucideDatabase,
  LucideDownload,
  LucideFileText,
  LucideListTree,
  LucideLockKeyhole,
  LucideMapPin,
  LucideMessageSquarePlus,
  LucidePawPrint,
  LucideShieldCheck,
  LucideSparkles,
  LucideStethoscope,
  LucideTrees,
  LucideTriangleAlert,
  LucideUserPlus,
  LucideUsers,
  LucideX,
} from '@lucide/angular';

import { OneHealthDataService } from '../../core/data/one-health-data.service';
import {
  HubAlertReportApi,
  HubAuditApi,
  HubApiService,
  HubEventApi,
  HubObservationDetailApi,
  HubReportStatus,
  HubSignalApi,
} from '../../core/data/hub-api.service';
import { DashboardAuthService } from '../../core/auth/dashboard-auth.service';
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
import { ConsolidatedEventCardComponent } from '../../shared/components/consolidated-event-card/consolidated-event-card.component';
import { HubAiApiService } from '../../core/data/hub-ai-api.service';
import { RudolfMarkdownPipe } from '../../shared/pipes/rudolf-markdown.pipe';
import { revealRudolfText } from '../../shared/utils/reveal-rudolf-text';

interface WorkflowStep {
  readonly title: string;
  readonly detail: string;
  readonly state: 'done' | 'active' | 'pending';
}

@Component({
  selector: 'app-alert-detail-page',
  imports: [
    RouterLink,
    ConsolidatedEventCardComponent,
    LucideActivity,
    LucideArrowLeft,
    LucideArrowRight,
    LucideCheck,
    LucideClock3,
    LucideDatabase,
    LucideDownload,
    LucideFileText,
    LucideListTree,
    LucideLockKeyhole,
    LucideMapPin,
    LucideMessageSquarePlus,
    LucidePawPrint,
    LucideShieldCheck,
    LucideSparkles,
    RudolfMarkdownPipe,
    LucideStethoscope,
    LucideTrees,
    LucideTriangleAlert,
    LucideUserPlus,
    LucideUsers,
    LucideX,
  ],
  templateUrl: './alert-detail.page.html',
  styleUrl: './alert-detail.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertDetailPage {
  protected readonly dataService = inject(OneHealthDataService);
  private readonly hubApi = inject(HubApiService);
  private readonly hubAi = inject(HubAiApiService);
  protected readonly auth = inject(DashboardAuthService);
  private readonly route = inject(ActivatedRoute);

  protected readonly observation = signal<OneHealthObservation | undefined>(undefined);
  protected readonly relatedObservations = computed(() => {
    const apiRelated = this.apiRelatedObservations();
    if (apiRelated) return apiRelated;
    const observation = this.observation();
    return observation ? this.dataService.relatedTo(observation.id, 6) : [];
  });
  protected readonly sectorContext = computed(() =>
    this.buildSectorContext(this.observation(), this.relatedObservations()),
  );
  protected readonly workflowStage = signal<ObservationStage>('observation');
  protected readonly expertAssigned = signal(false);
  protected readonly actionMessage = signal<string | null>(null);
  protected readonly commentPanelOpen = signal(false);
  protected readonly commentDraft = signal('');
  protected readonly comments = signal<readonly string[]>([]);
  protected readonly apiSignal = signal<HubSignalApi | null>(null);
  protected readonly consolidatedEvent = signal<HubEventApi | null>(null);
  protected readonly apiRelatedObservations = signal<readonly OneHealthObservation[] | null>(null);
  protected readonly actionInProgress = signal(false);
  protected readonly decisionNote = signal('');
  protected readonly auditTrail = signal<readonly HubAuditApi[]>([]);
  protected readonly reports = signal<readonly HubAlertReportApi[]>([]);
  protected readonly reportBusy = signal(false);
  protected readonly latestReport = computed(() => this.reports()[0] ?? null);
  protected readonly aiBusy = signal(false);
  protected readonly aiDraft = signal('');
  protected readonly aiError = signal('');

  protected async generateRudolfSummary(): Promise<void> {
    const observation = this.observation();
    if (!observation || this.aiBusy()) return;
    this.aiBusy.set(true);
    this.aiError.set('');
    this.aiDraft.set('');
    try {
      const response = await this.hubAi.alertSummary(observation.id);
      await revealRudolfText(response.content, (text) => this.aiDraft.set(text));
    } catch {
      this.aiError.set('La synthèse Rudolf n’a pas pu être générée. Vérifiez Groq et votre accès Hub.');
    } finally {
      this.aiBusy.set(false);
    }
  }

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      void this.loadObservation(params.get('id'));
    });
  }

  private async loadObservation(id: string | null): Promise<void> {
    const observation = this.dataService.findById(id);
    this.observation.set(observation);
    this.workflowStage.set(observation?.stage ?? 'observation');
    this.expertAssigned.set(observation?.stage === 'verified-alert');
    this.apiSignal.set(null);
    this.consolidatedEvent.set(null);
    this.apiRelatedObservations.set(null);
    this.actionMessage.set(null);
    this.commentPanelOpen.set(false);
    this.commentDraft.set('');
    this.comments.set([]);
    this.decisionNote.set('');
    this.auditTrail.set([]);
    this.reports.set([]);

    if (!observation || this.dataService.dataMode() !== 'api') return;
    try {
      const detail = await this.hubApi.getObservationDetail(observation.id);
      if (this.route.snapshot.paramMap.get('id') !== observation.id) return;
      this.applyDetail(detail);
      await this.loadReports(detail.observation.id);
    } catch {
      this.actionMessage.set('Le dossier détaillé du Hub n’a pas pu être chargé.');
    }
  }

  protected readonly workflow = computed<readonly WorkflowStep[]>(() => {
    const observation = this.observation();
    if (!observation) {
      return [];
    }

    const stage = this.workflowStage();
    return [
      {
        title: 'Observation reçue',
        detail: `${observation.sourceSystem} · ${this.formatDate(observation.observedAt, true)}`,
        state: 'done',
      },
      {
        title: 'Contrôle qualité',
        detail: `Normalisation terminée · ${this.formatDate(observation.receivedAt, true)}`,
        state: 'done',
      },
      {
        title: 'Analyse intersectorielle',
        detail:
          stage === 'observation' ? 'Qualification du signal en attente' : 'Convergence examinée',
        state: stage === 'observation' ? 'active' : 'done',
      },
      {
        title: 'Validation humaine finale',
        detail:
          stage === 'verified-alert'
            ? 'Validation enregistrée dans cette session de démonstration'
            : 'Réservée à un expert autorisé',
        state: stage === 'verified-alert' ? 'done' : stage === 'signal' ? 'active' : 'pending',
      },
    ];
  });

  protected readonly primaryActionLabel = computed(() => {
    if (this.workflowStage() === 'observation') {
      return this.dataService.dataMode() === 'api'
        ? 'En attente d’un signal'
        : 'Qualifier comme signal';
    }

    if (this.workflowStage() === 'signal') {
      return "Valider l'alerte";
    }

    return 'Alerte vérifiée';
  });

  protected readonly primaryActionDisabled = computed(
    () =>
      this.actionInProgress() ||
      this.workflowStage() === 'verified-alert' ||
      (this.dataService.dataMode() === 'api' && this.workflowStage() === 'observation') ||
      (this.workflowStage() === 'signal' &&
        (!this.expertAssigned() ||
          (this.dataService.dataMode() === 'api' && this.decisionNote().trim().length < 10))),
  );

  protected async assignExpert(): Promise<void> {
    if (this.actionInProgress()) return;
    if (!this.auth.canVerify()) {
      this.actionMessage.set('Votre rôle ne permet pas d’affecter ou de vérifier un signal.');
      return;
    }
    if (this.dataService.dataMode() === 'api') {
      const signalCode = this.apiSignal()?.signalCode;
      if (!signalCode) {
        this.actionMessage.set('Aucun signal vérifiable n’est associé à cette observation.');
        return;
      }
      this.actionInProgress.set(true);
      try {
        const response = await this.hubApi.assignSignal(signalCode);
        if ('signal' in response) this.apiSignal.set(response.signal);
        this.expertAssigned.set(true);
        this.actionMessage.set('Signal affecté à votre compte et vérification démarrée.');
        await this.reloadDossier();
      } catch {
        this.actionMessage.set('L’affectation a été refusée ou le signal est déjà pris en charge.');
      } finally {
        this.actionInProgress.set(false);
      }
      return;
    }
    this.expertAssigned.set(true);
    this.actionMessage.set('Expert régional fictif affecté pour cette session.');
  }

  protected async runPrimaryAction(): Promise<void> {
    if (this.workflowStage() === 'observation') {
      if (this.dataService.dataMode() === 'api') {
        this.actionMessage.set('Cette observation n’a pas encore déclenché de signal côté Hub.');
        return;
      }
      this.workflowStage.set('signal');
      this.actionMessage.set('Observation qualifiée comme signal à examiner.');
      return;
    }

    if (this.workflowStage() === 'signal' && this.expertAssigned()) {
      if (this.dataService.dataMode() === 'api') {
        const signalCode = this.apiSignal()?.signalCode;
        const note = this.decisionNote().trim();
        if (!signalCode || note.length < 10 || this.actionInProgress()) return;
        this.actionInProgress.set(true);
        try {
          const detail = await this.hubApi.decideSignal(signalCode, 'VERIFIED', note);
          this.applyDetail(detail);
          this.dataService.updateObservation(detail.observation);
          await this.loadReports(detail.observation.id);
          this.actionMessage.set(
            'Alerte vérifiée et décision enregistrée dans le journal d’audit.',
          );
        } catch {
          this.actionMessage.set(
            'La validation a été refusée. Rechargez le dossier avant de réessayer.',
          );
        } finally {
          this.actionInProgress.set(false);
        }
        return;
      }
      this.workflowStage.set('verified-alert');
      this.actionMessage.set('Validation humaine simulée enregistrée dans cette session.');
    }
  }

  protected onDecisionNoteInput(event: Event): void {
    this.decisionNote.set((event.target as HTMLTextAreaElement).value.slice(0, 1000));
  }

  protected async rejectSignal(): Promise<void> {
    const signalCode = this.apiSignal()?.signalCode;
    const note = this.decisionNote().trim();
    if (
      this.dataService.dataMode() !== 'api' ||
      !signalCode ||
      !this.expertAssigned() ||
      note.length < 10 ||
      this.actionInProgress()
    ) {
      return;
    }

    this.actionInProgress.set(true);
    try {
      const detail = await this.hubApi.decideSignal(signalCode, 'REJECTED', note);
      this.applyDetail(detail);
      this.dataService.updateObservation(detail.observation);
      this.expertAssigned.set(false);
      this.actionMessage.set(
        'Signal rejeté avec justification et décision enregistrée dans l’audit.',
      );
    } catch {
      this.actionMessage.set('Le rejet a été refusé. Rechargez le dossier avant de réessayer.');
    } finally {
      this.actionInProgress.set(false);
    }
  }

  protected closeMessage(): void {
    this.actionMessage.set(null);
  }

  protected async generateReport(): Promise<void> {
    const observation = this.observation();
    if (!observation || !this.auth.canAnalyze() || this.reportBusy()) return;
    this.reportBusy.set(true);
    try {
      await this.hubApi.generateAlertReport(observation.id);
      await Promise.all([this.loadReports(observation.id), this.reloadDossier()]);
      this.actionMessage.set(
        'Nouvelle version du rapport générée et inscrite dans la piste d’audit.',
      );
    } catch {
      this.actionMessage.set(
        'Le rapport nécessite une alerte vérifiée et un rôle analyste autorisé.',
      );
    } finally {
      this.reportBusy.set(false);
    }
  }

  protected canTransitionReport(report: HubAlertReportApi): boolean {
    if (report.status === 'DRAFT') return this.auth.canAnalyze();
    if (report.status === 'IN_REVIEW') return this.auth.canVerify();
    if (report.status === 'VALIDATED') return this.auth.canPublish();
    return false;
  }

  protected nextReportStatus(status: HubReportStatus): Exclude<HubReportStatus, 'DRAFT'> | null {
    return { DRAFT: 'IN_REVIEW', IN_REVIEW: 'VALIDATED', VALIDATED: 'PUBLISHED', PUBLISHED: null }[
      status
    ] as Exclude<HubReportStatus, 'DRAFT'> | null;
  }

  protected reportActionLabel(status: HubReportStatus): string {
    return {
      DRAFT: 'Soumettre en revue',
      IN_REVIEW: 'Valider le rapport',
      VALIDATED: 'Publier',
      PUBLISHED: 'Publié',
    }[status];
  }

  protected reportStatusLabel(status: HubReportStatus): string {
    return { DRAFT: 'Brouillon', IN_REVIEW: 'En revue', VALIDATED: 'Validé', PUBLISHED: 'Publié' }[
      status
    ];
  }

  protected async transitionReport(report: HubAlertReportApi): Promise<void> {
    const target = this.nextReportStatus(report.status);
    const observation = this.observation();
    if (!target || !observation || !this.canTransitionReport(report) || this.reportBusy()) return;
    this.reportBusy.set(true);
    try {
      await this.hubApi.updateReportStatus(report.reportId, target);
      await Promise.all([this.loadReports(observation.id), this.reloadDossier()]);
      this.actionMessage.set(
        `Rapport ${this.reportStatusLabel(target).toLowerCase()} et audit mis à jour.`,
      );
    } catch {
      this.actionMessage.set('La transition du rapport a été refusée. Rechargez le dossier.');
    } finally {
      this.reportBusy.set(false);
    }
  }

  protected printReport(report: HubAlertReportApi): void {
    const popup = window.open('', '_blank', 'width=900,height=700');
    if (!popup) {
      this.actionMessage.set(
        'Autorisez les fenêtres contextuelles pour exporter le rapport en PDF.',
      );
      return;
    }
    popup.opener = null;
    const list = (items: readonly string[]) =>
      `<ul>${items.map((item) => `<li>${this.escapeHtml(item)}</li>`).join('')}</ul>`;
    popup.document.write(
      `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${this.escapeHtml(report.title)}</title><style>body{font:14px/1.55 Arial,sans-serif;color:#172033;max-width:850px;margin:40px auto;padding:0 28px}h1{font-size:25px}h2{font-size:17px;margin-top:28px}.meta{color:#5d6b7d;border-bottom:1px solid #ddd;padding-bottom:16px}li{margin:7px 0}@media print{body{margin:0}}</style></head><body><h1>${this.escapeHtml(report.title)}</h1><p class="meta">${this.escapeHtml(report.reportId)} · Version ${report.version} · ${this.escapeHtml(this.reportStatusLabel(report.status))}</p><h2>Synthèse exécutive</h2><p>${this.escapeHtml(report.executiveSummary)}</p><h2>Constats</h2>${list(report.findings)}<h2>Recommandations</h2>${list(report.recommendations)}<p class="meta">Sources : ${this.escapeHtml(report.sources.join(', '))}</p></body></html>`,
    );
    popup.document.close();
    popup.focus();
    window.setTimeout(() => popup.print(), 250);
  }

  protected auditActionLabel(action: string): string {
    const labels: Record<string, string> = {
      SIGNAL_CREATED_BY_SCENARIO: 'Signal créé par le moteur de scénario',
      SIGNAL_ASSIGNED: 'Signal affecté à un expert',
      SIGNAL_VERIFIED: 'Signal vérifié par un expert',
      SIGNAL_REJECTED: 'Signal rejeté par un expert',
      REPORT_VERSION_GENERATED: 'Version de rapport générée',
      REPORT_IN_REVIEW: 'Rapport soumis en revue',
      REPORT_VALIDATED: 'Rapport validé',
      REPORT_PUBLISHED: 'Rapport publié',
      SCENARIO_COMPLETED: 'Scénario dynamique terminé',
      OBSERVATIONS_CONSOLIDATED: 'Observations regroupées dans un événement',
    };
    return labels[action] ?? action.replaceAll('_', ' ').toLowerCase();
  }

  protected toggleCommentPanel(): void {
    this.commentPanelOpen.update((open) => !open);
  }

  protected onCommentInput(event: Event): void {
    this.commentDraft.set((event.target as HTMLTextAreaElement).value.slice(0, 500));
  }

  protected addComment(): void {
    const comment = this.commentDraft().trim();
    if (!comment) {
      return;
    }

    this.comments.update((comments) => [...comments, comment]);
    this.commentDraft.set('');
    this.commentPanelOpen.set(false);
    this.actionMessage.set('Commentaire ajouté localement à la démonstration.');
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

  protected formatDate(isoDate: string, includeTime = false): string {
    return formatObservationDate(isoDate, includeTime);
  }

  private buildSectorContext(
    observation: OneHealthObservation | undefined,
    relatedObservations: readonly OneHealthObservation[],
  ): readonly OneHealthObservation[] {
    if (!observation) {
      return [];
    }

    const observations = [observation, ...relatedObservations];
    const sectors = new Set<HealthSector>();

    return observations.filter((observation) => {
      if (sectors.has(observation.sector)) {
        return false;
      }

      sectors.add(observation.sector);
      return true;
    });
  }

  private applyDetail(detail: HubObservationDetailApi): void {
    this.observation.set(detail.observation);
    this.workflowStage.set(detail.observation.stage);
    this.apiSignal.set(detail.signal);
    this.apiRelatedObservations.set(detail.related);
    this.auditTrail.set(detail.audit);
    this.consolidatedEvent.set(detail.event);
    this.expertAssigned.set(
      detail.observation.stage === 'verified-alert' || !!detail.signal?.assignedTo,
    );
    this.decisionNote.set(detail.signal?.decisionNote ?? '');
  }

  private async reloadDossier(): Promise<void> {
    const observation = this.observation();
    if (!observation || this.dataService.dataMode() !== 'api') return;
    this.applyDetail(await this.hubApi.getObservationDetail(observation.id));
  }

  private async loadReports(observationId: string): Promise<void> {
    try {
      this.reports.set((await this.hubApi.getAlertReports(observationId)).items);
    } catch {
      this.reports.set([]);
    }
  }

  private escapeHtml(value: string): string {
    return value.replace(
      /[&<>"']/g,
      (character) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]!,
    );
  }
}
