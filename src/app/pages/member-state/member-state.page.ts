import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideActivity,
  LucideArrowRight,
  LucideBuilding2,
  LucideCheckCircle2,
  LucideClock3,
  LucideDatabase,
  LucideHeartPulse,
  LucideMapPin,
  LucidePawPrint,
  LucideTrees,
  LucideTriangleAlert,
} from '@lucide/angular';
import { DashboardAuthService } from '../../core/auth/dashboard-auth.service';
import { CEEAC_COUNTRIES } from '../../core/data/mock/ceeac-reference';
import {
  HealthSector,
  ObservationSeverity,
  OneHealthObservation,
} from '../../core/data/models/one-health-observation.model';
import { OneHealthDataService } from '../../core/data/one-health-data.service';

const SEVERITY_RANK: Readonly<Record<ObservationSeverity, number>> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

@Component({
  selector: 'app-member-state-page',
  imports: [
    RouterLink,
    LucideActivity,
    LucideArrowRight,
    LucideBuilding2,
    LucideCheckCircle2,
    LucideClock3,
    LucideDatabase,
    LucideHeartPulse,
    LucideMapPin,
    LucidePawPrint,
    LucideTrees,
    LucideTriangleAlert,
  ],
  templateUrl: './member-state.page.html',
  styleUrl: './member-state.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberStatePage {
  private readonly auth = inject(DashboardAuthService);
  private readonly dataService = inject(OneHealthDataService);

  protected readonly selectedCountryCode = signal(this.defaultCountryCode());

  protected readonly countries = computed(() => {
    this.dataService.revision();
    const represented = new Set(
      this.dataService.observations.map((observation) => observation.countryCode),
    );
    return CEEAC_COUNTRIES.filter((country) => represented.has(country.code));
  });

  protected readonly selectedCountry = computed(() => {
    const available = this.countries();
    return (
      available.find((country) => country.code === this.selectedCountryCode()) ?? available[0]
    );
  });

  protected readonly observations = computed(() => {
    this.dataService.revision();
    const code = this.selectedCountry()?.code;
    return code
      ? this.dataService.observations.filter((observation) => observation.countryCode === code)
      : [];
  });

  protected readonly summary = computed(() => {
    const observations = this.observations();
    const sources = new Set(observations.map((observation) => observation.sourceSystem));
    const territories = new Set(observations.map((observation) => observation.adminArea));
    const complete = observations.filter(
      (observation) =>
        observation.sourceRecordId &&
        observation.adminArea &&
        observation.observedAt &&
        Number.isFinite(observation.latitude) &&
        Number.isFinite(observation.longitude),
    ).length;

    return {
      total: observations.length,
      signals: observations.filter((observation) => observation.stage === 'signal').length,
      alerts: observations.filter((observation) => observation.stage === 'verified-alert').length,
      sources: sources.size,
      territories: territories.size,
      completeness: observations.length ? Math.round((complete / observations.length) * 100) : 0,
      latest: observations.reduce(
        (latest, observation) =>
          observation.observedAt > latest ? observation.observedAt : latest,
        '',
      ),
    };
  });

  protected readonly sectors = computed(() => {
    const observations = this.observations();
    const buildSector = (sector: HealthSector, label: string) => {
      const records = observations.filter((observation) => observation.sector === sector);
      return {
        sector,
        label,
        records: records.length,
        signals: records.filter((observation) => observation.stage !== 'observation').length,
        percent: observations.length ? Math.round((records.length / observations.length) * 100) : 0,
      };
    };
    return [
      buildSector('human', 'Santé humaine'),
      buildSector('animal', 'Santé animale'),
      buildSector('environment', 'Climat & environnement'),
    ] as const;
  });

  protected readonly priorityItems = computed(() =>
    [...this.observations()]
      .filter((observation) => observation.stage !== 'observation')
      .sort(
        (left, right) =>
          SEVERITY_RANK[right.severity] - SEVERITY_RANK[left.severity] ||
          right.observedAt.localeCompare(left.observedAt),
      )
      .slice(0, 5),
  );

  protected selectCountry(event: Event): void {
    this.selectedCountryCode.set((event.target as HTMLSelectElement).value);
  }

  protected formatDate(value: string): string {
    if (!value) return 'Aucune donnée reçue';
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }

  protected stageLabel(observation: OneHealthObservation): string {
    return observation.stage === 'verified-alert' ? 'Alerte vérifiée' : 'Signal à vérifier';
  }

  private defaultCountryCode(): string {
    const user = this.auth.currentUser();
    const represented = new Set(
      this.dataService.observations.map((observation) => observation.countryCode),
    );
    const scopedCountry = user?.hubCountryCodes.find((code) => represented.has(code));
    return scopedCountry ?? CEEAC_COUNTRIES.find((country) => represented.has(country.code))?.code ?? '';
  }
}
