import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { switchMap, timer } from 'rxjs';
import { DashboardAuthService } from '../../core/auth/dashboard-auth.service';
import { HubApiService, HubObservationQuery, HubSummary } from '../../core/data/hub-api.service';
import { OneHealthObservation } from '../../core/data/models/one-health-observation.model';

/** Component-scoped: no data survives navigation or an identity change. */
@Injectable()
export class AlertRegistryStore {
  private readonly api = inject(HubApiService);
  private readonly auth = inject(DashboardAuthService);
  private readonly attempt = signal(0);
  readonly viewMode = signal<'all' | 'priority' | 'country'>('priority');
  readonly searchTerm = signal('');
  readonly selectedCountry = signal('all');
  readonly selectedSector = signal<'all' | OneHealthObservation['sector']>('all');
  readonly selectedStage = signal<'all' | OneHealthObservation['stage']>('all');
  readonly currentPage = signal(1);
  readonly items = signal<readonly OneHealthObservation[]>([]);
  readonly total = signal(0);
  readonly summary = signal<HubSummary | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly summaryError = signal('');
  readonly totalPages = computed(() => Math.max(1, Math.min(1000, Math.ceil(this.total() / 8))));
  readonly pageLimitReached = computed(() => this.total() > 8000);

  constructor() {
    effect((onCleanup) => {
      const owner = this.auth.currentUser();
      this.attempt();
      this.summary.set(null);
      this.summaryError.set('');
      if (!owner) return;
      const request = this.api.observationSummary().subscribe({
        next: (summary) => {
          if (this.auth.currentUser() === owner) this.summary.set(summary);
        },
        error: () => {
          if (this.auth.currentUser() === owner) this.summaryError.set('Compteurs indisponibles.');
        },
      });
      onCleanup(() => request.unsubscribe());
    });

    effect((onCleanup) => {
      const owner = this.auth.currentUser();
      this.attempt();
      const sector = this.selectedSector();
      const stage = this.selectedStage();
      const query: HubObservationQuery = {
        page: this.currentPage(), limit: 8, view: this.viewMode(),
        search: this.searchTerm(),
        countryCode: this.selectedCountry() === 'all' ? undefined : this.selectedCountry(),
        sector: sector === 'all' ? undefined : sector,
        stage: stage === 'all' ? undefined : stage,
      };
      this.items.set([]);
      this.total.set(0);
      this.error.set('');
      this.loading.set(!!owner);
      if (!owner) return;
      // Unsubscribing cancels both debounce and in-flight HTTP; no overlapping searches.
      const request = timer(250).pipe(switchMap(() => this.api.listObservations(query))).subscribe({
        next: (page) => {
          if (this.auth.currentUser() !== owner) return;
          const lastPage = Math.max(1, Math.min(page.pages, 1000));
          if (query.page > lastPage) {
            this.currentPage.set(lastPage);
            return;
          }
          this.items.set(page.items);
          this.total.set(page.total);
          this.loading.set(false);
        },
        error: () => {
          if (this.auth.currentUser() !== owner) return;
          this.error.set('Chargement impossible. Vérifiez votre connexion ou réessayez.');
          this.loading.set(false);
        },
      });
      onCleanup(() => request.unsubscribe());
    });
  }

  retry(): void { this.attempt.update((value) => value + 1); }
}
