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
  LucideListTree,
  LucideLockKeyhole,
  LucideMapPin,
  LucideMessageSquarePlus,
  LucidePawPrint,
  LucideShieldCheck,
  LucideStethoscope,
  LucideTrees,
  LucideTriangleAlert,
  LucideUserPlus,
  LucideUsers,
  LucideX,
} from '@lucide/angular';

import { OneHealthDataService } from '../../core/data/one-health-data.service';
import {
  HubApiService,
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

interface WorkflowStep {
  readonly title: string;
  readonly detail: string;
  readonly state: 'done' | 'active' | 'pending';
}

@Component({
  selector: 'app-alert-detail-page',
  imports: [
    RouterLink,
    LucideActivity,
    LucideArrowLeft,
    LucideArrowRight,
    LucideCheck,
    LucideClock3,
    LucideDatabase,
    LucideListTree,
    LucideLockKeyhole,
    LucideMapPin,
    LucideMessageSquarePlus,
    LucidePawPrint,
    LucideShieldCheck,
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
  protected readonly apiRelatedObservations = signal<readonly OneHealthObservation[] | null>(null);
  protected readonly actionInProgress = signal(false);
  protected readonly decisionNote = signal('');

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
      this.apiRelatedObservations.set(null);
      this.actionMessage.set(null);
      this.commentPanelOpen.set(false);
      this.commentDraft.set('');
      this.comments.set([]);
      this.decisionNote.set('');

      if (!observation || this.dataService.dataMode() !== 'api') return;
      try {
        const detail = await this.hubApi.getObservationDetail(observation.id);
        if (this.route.snapshot.paramMap.get('id') !== observation.id) return;
        this.observation.set(detail.observation);
        this.workflowStage.set(detail.observation.stage);
        this.apiSignal.set(detail.signal);
        this.apiRelatedObservations.set(detail.related);
        this.expertAssigned.set(
          detail.observation.stage === 'verified-alert' || !!detail.signal?.assignedTo,
        );
        this.decisionNote.set(detail.signal?.decisionNote ?? '');
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
        detail: stage === 'observation' ? 'Qualification du signal en attente' : 'Convergence examinée',
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
          const detail = await this.hubApi.decideSignal(
            signalCode,
            'VERIFIED',
            note,
          );
          this.observation.set(detail.observation);
          this.dataService.updateObservation(detail.observation);
          this.apiSignal.set(detail.signal);
          this.apiRelatedObservations.set(detail.related);
          this.workflowStage.set('verified-alert');
          this.actionMessage.set('Alerte vérifiée et décision enregistrée dans le journal d’audit.');
        } catch {
          this.actionMessage.set('La validation a été refusée. Rechargez le dossier avant de réessayer.');
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
      this.observation.set(detail.observation);
      this.dataService.updateObservation(detail.observation);
      this.apiSignal.set(detail.signal);
      this.apiRelatedObservations.set(detail.related);
      this.workflowStage.set('observation');
      this.expertAssigned.set(false);
      this.actionMessage.set('Signal rejeté avec justification et décision enregistrée dans l’audit.');
    } catch {
      this.actionMessage.set('Le rejet a été refusé. Rechargez le dossier avant de réessayer.');
    } finally {
      this.actionInProgress.set(false);
    }
  }

  protected closeMessage(): void {
    this.actionMessage.set(null);
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
}
