import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HubApiService, HubDatasetLimitError } from './hub-api.service';

import { DEMO_REFERENCE_DATE } from './mock/ceeac-reference';
import { MOCK_ONE_HEALTH_OBSERVATIONS } from './mock/mock-observations';
import {
  HealthSector,
  ObservationFilter,
  ObservationStage,
  ObservationSummary,
  OneHealthObservation,
  SourceSystem,
} from './models/one-health-observation.model';

export interface SourceSummary {
  readonly sourceSystem: SourceSystem;
  readonly sector: HealthSector;
  readonly records: number;
}

const PERIOD_IN_DAYS = {
  '7d': 7,
  '30d': 30,
  year: 366,
} as const;

@Injectable({ providedIn: 'root' })
export class OneHealthDataService {
  private readonly hubApi = inject(HubApiService);
  private loadPromise: Promise<void> | null = null;
  private loadedScopeKey = '';
  private generation = 0;
  private loadedAt = 0;
  private loadController?: AbortController;

  readonly dataMode = signal<'initial' | 'api' | 'fallback'>('initial');
  readonly revision = signal(0);
  readonly dataNotice = signal<string | null>(null);
  observations: readonly OneHealthObservation[] = MOCK_ONE_HEALTH_OBSERVATIONS;

  verifiedAlerts = this.observations.filter(
    (observation) => observation.stage === 'verified-alert',
  );

  signals = this.observations.filter((observation) => observation.stage === 'signal');

  summary: ObservationSummary = {
    total: this.observations.length,
    countries: new Set(this.observations.map((observation) => observation.countryCode)).size,
    bySector: this.countBySector(),
    byStage: this.countByStage(),
    completeness: this.calculateCompleteness(),
  };

  sourceSummaries: readonly SourceSummary[] = [
    {
      sourceSystem: 'DHIS2',
      sector: 'human',
      records: this.summary.bySector.human,
    },
    {
      sourceSystem: 'ARIS 3',
      sector: 'animal',
      records: this.summary.bySector.animal,
    },
    {
      sourceSystem: 'CAPC-AC',
      sector: 'environment',
      records: this.summary.bySector.environment,
    },
  ];

  loadFromHub(scopeKey: string): Promise<void> {
    if (this.loadedScopeKey !== scopeKey) {
      this.reset();
      this.loadedScopeKey = scopeKey;
    }
    if (this.dataMode() === 'api' && Date.now() - this.loadedAt < 60_000) {
      return Promise.resolve();
    }
    return this.loadCurrentScope();
  }

  reset(): void {
    this.generation += 1;
    this.loadController?.abort();
    this.loadController = undefined;
    this.loadPromise = null;
    this.loadedScopeKey = '';
    this.loadedAt = 0;
    this.replaceObservations([]);
    this.dataMode.set('initial');
    this.dataNotice.set(null);
  }

  private loadCurrentScope(): Promise<void> {
    if (!this.loadPromise) {
      const generation = this.generation;
      this.loadController = new AbortController();
      const isCurrent = () => generation === this.generation;
      this.loadPromise = this.hubApi
        .getAllObservations(this.loadController.signal)
        .then((observations) => {
          if (!isCurrent()) throw new Error('Chargement remplacé par une nouvelle session.');
          this.replaceObservations(observations);
          this.loadedAt = Date.now();
          this.dataMode.set('api');
          this.dataNotice.set(null);
        })
        .catch((error: unknown) => {
          if (!isCurrent()) throw error;
          if (
            error instanceof HubDatasetLimitError ||
            (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403))
          ) {
            this.reset();
            throw error;
          }
          if (!environment.allowDemoFallback) {
            throw error;
          }
          this.replaceObservations(MOCK_ONE_HEALTH_OBSERVATIONS);
          this.dataMode.set('fallback');
          this.dataNotice.set('API Hub indisponible — jeu local fictif utilisé temporairement.');
        })
        .finally(() => {
          if (isCurrent()) {
            this.loadController?.abort();
            this.loadController = undefined;
            this.loadPromise = null;
          }
        });
    }
    return this.loadPromise;
  }

  updateObservation(updated: OneHealthObservation): void {
    this.replaceObservations(
      this.observations.map((observation) =>
        observation.id === updated.id ? updated : observation,
      ),
    );
  }

  async refreshFromHub(): Promise<void> {
    if (!this.loadedScopeKey) throw new Error('Aucun périmètre Hub chargé.');
    await this.loadCurrentScope();
  }

  filter(filter: ObservationFilter): readonly OneHealthObservation[] {
    const maximumAge = PERIOD_IN_DAYS[filter.period] * 24 * 60 * 60 * 1000;

    return this.observations.filter((observation) => {
      const age = DEMO_REFERENCE_DATE.getTime() - new Date(observation.observedAt).getTime();
      const stageMatches = !filter.stages || filter.stages.has(observation.stage);

      return age <= maximumAge && filter.sectors.has(observation.sector) && stageMatches;
    });
  }

  findById(id: string | null): OneHealthObservation | undefined {
    if (!id) {
      return undefined;
    }

    return this.observations.find((observation) => observation.id === id);
  }

  relatedTo(observationId: string, limit = 4): readonly OneHealthObservation[] {
    const reference = this.findById(observationId);

    if (!reference) {
      return [];
    }

    return this.observations
      .filter(
        (observation) =>
          observation.id !== reference.id && observation.countryCode === reference.countryCode,
      )
      .sort((left, right) => {
        const sectorPriority =
          Number(left.sector === reference.sector) - Number(right.sector === reference.sector);
        return sectorPriority || right.observedAt.localeCompare(left.observedAt);
      })
      .slice(0, Math.max(0, limit));
  }

  private countBySector(): Readonly<Record<HealthSector, number>> {
    return this.observations.reduce<Record<HealthSector, number>>(
      (counts, observation) => {
        counts[observation.sector] += 1;
        return counts;
      },
      { human: 0, animal: 0, environment: 0 },
    );
  }

  private countByStage(): Readonly<Record<ObservationStage, number>> {
    return this.observations.reduce<Record<ObservationStage, number>>(
      (counts, observation) => {
        counts[observation.stage] += 1;
        return counts;
      },
      { observation: 0, signal: 0, 'verified-alert': 0 },
    );
  }

  private calculateCompleteness(): number {
    if (!this.observations.length) return 0;
    const completeRecords = this.observations.filter(
      (observation) =>
        Boolean(
          observation.sourceRecordId &&
          observation.countryCode &&
          observation.adminArea &&
          observation.observedAt &&
          observation.title,
        ) &&
        Number.isFinite(observation.latitude) &&
        Number.isFinite(observation.longitude),
    ).length;

    return Math.round((completeRecords / this.observations.length) * 100);
  }

  private replaceObservations(observations: readonly OneHealthObservation[]): void {
    this.observations = [...observations].sort((left, right) =>
      right.observedAt.localeCompare(left.observedAt),
    );
    this.verifiedAlerts = this.observations.filter(
      (observation) => observation.stage === 'verified-alert',
    );
    this.signals = this.observations.filter((observation) => observation.stage === 'signal');
    this.summary = {
      total: this.observations.length,
      countries: new Set(this.observations.map((observation) => observation.countryCode)).size,
      bySector: this.countBySector(),
      byStage: this.countByStage(),
      completeness: this.calculateCompleteness(),
    };
    this.sourceSummaries = [
      { sourceSystem: 'DHIS2', sector: 'human', records: this.summary.bySector.human },
      { sourceSystem: 'ARIS 3', sector: 'animal', records: this.summary.bySector.animal },
      {
        sourceSystem: 'CAPC-AC',
        sector: 'environment',
        records: this.summary.bySector.environment,
      },
    ];
    this.revision.update((value) => value + 1);
  }
}
