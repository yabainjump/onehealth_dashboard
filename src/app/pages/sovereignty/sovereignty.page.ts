import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  LucideCircleAlert,
  LucideDatabase,
  LucideRefreshCw,
  LucideSearch,
  LucideShieldCheck,
} from '@lucide/angular';
import { DashboardAuthService } from '../../core/auth/dashboard-auth.service';
import { HubRole } from '../../core/auth/dashboard-user.model';
import {
  HubAggregationLevel,
  HubApiService,
  HubSharingLevel,
  HubSharingPolicyApi,
} from '../../core/data/hub-api.service';
import { CEEAC_COUNTRIES } from '../../core/data/mock/ceeac-reference';
import {
  AGGREGATION_LABELS,
  SHARING_LEVEL_LABELS,
  buildDemoSharingPolicies,
  normalizeSharingPolicy,
  sharingLevelTone,
  validateSharingPolicy,
} from './sharing-policy-presenter';

type SharingFilter = 'all' | HubSharingLevel;

@Component({
  selector: 'app-sovereignty-page',
  imports: [
    LucideCircleAlert,
    LucideDatabase,
    LucideRefreshCw,
    LucideSearch,
    LucideShieldCheck,
  ],
  templateUrl: './sovereignty.page.html',
  styleUrl: './sovereignty.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SovereigntyPage implements OnInit {
  private readonly api = inject(HubApiService);
  protected readonly auth = inject(DashboardAuthService);

  protected readonly countries = CEEAC_COUNTRIES;
  protected readonly sharingLabels = SHARING_LEVEL_LABELS;
  protected readonly aggregationLabels = AGGREGATION_LABELS;
  protected readonly levelTone = sharingLevelTone;
  protected readonly roleOptions: readonly { value: HubRole; label: string }[] = [
    { value: 'hub_viewer', label: 'Lecteur' },
    { value: 'hub_analyst', label: 'Analyste' },
    { value: 'hub_verifier', label: 'Vérificateur' },
    { value: 'hub_admin', label: 'Administrateur Hub' },
  ];
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly fallbackMode = signal(false);
  protected readonly error = signal('');
  protected readonly feedback = signal('');
  protected readonly policies = signal<readonly HubSharingPolicyApi[]>([]);
  protected readonly selectedPolicy = signal<HubSharingPolicyApi | null>(null);
  protected readonly searchTerm = signal('');
  protected readonly selectedLevel = signal<SharingFilter>('all');
  protected readonly draftLevel = signal<HubSharingLevel>('OWNER_ONLY');
  protected readonly draftAggregation = signal<HubAggregationLevel>('COUNTRY');
  protected readonly draftRetention = signal(365);
  protected readonly draftPersonalData = signal(false);
  protected readonly draftRoles = signal<readonly HubRole[]>([]);
  protected readonly draftCountries = signal<readonly string[]>([]);

  protected readonly canManage = computed(
    () => this.auth.canManageConnectors() && !this.fallbackMode(),
  );
  protected readonly filteredPolicies = computed(() => {
    const search = this.searchTerm().toLocaleLowerCase('fr');
    const level = this.selectedLevel();
    return this.policies().filter((policy) => {
      const country = this.countryName(policy.countryOwner).toLocaleLowerCase('fr');
      return (
        (level === 'all' || policy.sharingLevel === level) &&
        (!search ||
          policy.policyId.toLocaleLowerCase('fr').includes(search) ||
          country.includes(search))
      );
    });
  });
  protected readonly summary = computed(() => ({
    total: this.policies().length,
    regional: this.policies().filter((policy) => policy.sharingLevel === 'REGIONAL_AUTHORIZED')
      .length,
    restricted: this.policies().filter((policy) => policy.sharingLevel === 'OWNER_ONLY').length,
    personal: this.policies().filter((policy) => policy.containsPersonalData).length,
  }));
  protected readonly explicitCountrySelection = computed(
    () => this.draftLevel() === 'AUTHORIZED_COUNTRIES',
  );

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    this.feedback.set('');
    try {
      const response = await this.api.getSharingPolicies();
      this.fallbackMode.set(false);
      this.policies.set(response.items);
      this.selectPolicy(response.items[0] ?? null);
    } catch (error: unknown) {
      if (
        error instanceof HttpErrorResponse &&
        (error.status === 0 || error.status === 404 || error.status >= 500)
      ) {
        const demoPolicies = buildDemoSharingPolicies();
        this.fallbackMode.set(true);
        this.policies.set(demoPolicies);
        this.selectPolicy(demoPolicies[0] ?? null);
        this.feedback.set(
          'API du registre indisponible — politiques fictives affichées en lecture seule.',
        );
      } else {
        this.error.set('Le registre de souveraineté ne peut pas être chargé pour ce compte.');
        this.policies.set([]);
        this.selectPolicy(null);
      }
    } finally {
      this.loading.set(false);
    }
  }

  protected onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value.trim().slice(0, 80));
  }

  protected onLevelFilter(event: Event): void {
    this.selectedLevel.set((event.target as HTMLSelectElement).value as SharingFilter);
  }

  protected selectPolicy(policy: HubSharingPolicyApi | null): void {
    this.selectedPolicy.set(policy);
    if (policy) {
      this.draftLevel.set(policy.sharingLevel);
      this.draftAggregation.set(policy.aggregationLevel);
      this.draftRetention.set(policy.retentionPeriodDays);
      this.draftPersonalData.set(policy.containsPersonalData);
      this.draftRoles.set([...policy.allowedRoles]);
      this.draftCountries.set([...policy.allowedCountries]);
    }
    this.error.set('');
  }

  protected onDraftLevel(event: Event): void {
    const level = (event.target as HTMLSelectElement).value as HubSharingLevel;
    this.draftLevel.set(level);
    this.applyNormalization();
  }

  protected onDraftAggregation(event: Event): void {
    this.draftAggregation.set(
      (event.target as HTMLSelectElement).value as HubAggregationLevel,
    );
    this.applyNormalization();
  }

  protected onRetention(event: Event): void {
    this.draftRetention.set(Number((event.target as HTMLInputElement).value));
  }

  protected onPersonalData(event: Event): void {
    this.draftPersonalData.set((event.target as HTMLInputElement).checked);
    this.applyNormalization();
  }

  protected hasRole(role: HubRole): boolean {
    return this.draftRoles().includes(role);
  }

  protected toggleRole(role: HubRole, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.draftRoles.update((roles) =>
      checked ? [...new Set([...roles, role])] : roles.filter((item) => item !== role),
    );
    this.applyNormalization();
  }

  protected hasCountry(code: string): boolean {
    return this.draftCountries().includes(code);
  }

  protected toggleCountry(code: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.draftCountries.update((countries) =>
      checked ? [...new Set([...countries, code])] : countries.filter((item) => item !== code),
    );
  }

  protected async save(): Promise<void> {
    const policy = this.selectedPolicy();
    if (!policy || !this.canManage() || this.saving()) return;
    const input = this.currentDraft();
    const validationError = validateSharingPolicy(input);
    if (validationError) {
      this.error.set(validationError);
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.feedback.set('');
    try {
      const updated = await this.api.updateSharingPolicy(policy.policyId, input);
      this.policies.update((policies) =>
        policies.map((item) => (item.policyId === updated.policyId ? updated : item)),
      );
      this.selectPolicy(updated);
      this.feedback.set(`La politique de ${this.countryName(updated.countryOwner)} est enregistrée et auditée.`);
    } catch (error: unknown) {
      this.error.set(
        error instanceof HttpErrorResponse && error.status === 403
          ? 'Vous ne possédez pas le droit de modifier cette politique.'
          : 'La politique n’a pas pu être enregistrée.',
      );
    } finally {
      this.saving.set(false);
    }
  }

  protected countryName(code: string): string {
    return this.countries.find((country) => country.code === code)?.name ?? code;
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('fr', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  }

  private applyNormalization(): void {
    const normalized = this.currentDraft();
    this.draftAggregation.set(normalized.aggregationLevel);
    this.draftPersonalData.set(normalized.containsPersonalData);
    this.draftRoles.set(normalized.allowedRoles);
    this.draftCountries.set(normalized.allowedCountries);
  }

  private currentDraft() {
    return normalizeSharingPolicy({
      sharingLevel: this.draftLevel(),
      allowedRoles: this.draftRoles(),
      allowedCountries: this.draftCountries(),
      aggregationLevel: this.draftAggregation(),
      retentionPeriodDays: this.draftRetention(),
      containsPersonalData: this.draftPersonalData(),
    });
  }
}
