import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  LucideChevronLeft,
  LucideChevronRight,
  LucideCircleAlert,
  LucideCircleUserRound,
  LucideRefreshCw,
  LucideSearch,
  LucideShieldCheck,
} from '@lucide/angular';
import { HubRole } from '../../core/auth/dashboard-user.model';
import { HubAdminApiService, HubManagedUser } from '../../core/data/hub-admin-api.service';
import { CEEAC_COUNTRIES } from '../../core/data/mock/ceeac-reference';
import { BrandLoaderComponent } from '../../shared/components/brand-loader/brand-loader.component';
import { normalizeHubAccess, validateHubAccess } from './hub-access-presenter';

interface RoleOption {
  readonly value: HubRole;
  readonly label: string;
  readonly description: string;
}

@Component({
  selector: 'app-administration-page',
  imports: [
    BrandLoaderComponent,
    LucideChevronLeft,
    LucideChevronRight,
    LucideCircleAlert,
    LucideCircleUserRound,
    LucideRefreshCw,
    LucideSearch,
    LucideShieldCheck,
  ],
  templateUrl: './administration.page.html',
  styleUrl: './administration.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdministrationPage implements OnInit {
  private readonly api = inject(HubAdminApiService);
  private readonly pageSize = 20;

  protected readonly countries = CEEAC_COUNTRIES;
  protected readonly roleOptions: readonly RoleOption[] = [
    {
      value: 'hub_viewer',
      label: 'Lecteur',
      description: 'Consulter les données et rapports des pays attribués.',
    },
    {
      value: 'hub_analyst',
      label: 'Analyste',
      description: 'Accéder aux analyses multisectorielles et aux rapports.',
    },
    {
      value: 'hub_verifier',
      label: 'Vérificateur',
      description: 'Prendre en charge, vérifier ou rejeter les signaux.',
    },
    {
      value: 'hub_admin',
      label: 'Administrateur Hub',
      description: 'Accès régional sans restriction et pilotage des connecteurs.',
    },
  ];
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly feedback = signal('');
  protected readonly users = signal<readonly HubManagedUser[]>([]);
  protected readonly total = signal(0);
  protected readonly currentPage = signal(1);
  protected readonly searchDraft = signal('');
  protected readonly activeSearch = signal('');
  protected readonly selectedUser = signal<HubManagedUser | null>(null);
  protected readonly draftRoles = signal<readonly HubRole[]>([]);
  protected readonly draftCountries = signal<readonly string[]>([]);

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize)),
  );
  protected readonly pageSummary = computed(() => ({
    assigned: this.users().filter((user) => user.hubRoles.length > 0).length,
    admins: this.users().filter(
      (user) => user.role === 'admin' || user.hubRoles.includes('hub_admin'),
    ).length,
    countries: new Set(this.users().flatMap((user) => user.hubCountryCodes)).size,
  }));
  protected readonly isGlobalDraft = computed(() => this.draftRoles().includes('hub_admin'));
  protected readonly resultRange = computed(() => {
    if (!this.total()) return 'Aucun utilisateur';
    const start = (this.currentPage() - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage() * this.pageSize, this.total());
    return `${start}–${end} sur ${this.total()} utilisateurs`;
  });

  ngOnInit(): void {
    void this.loadUsers();
  }

  protected async loadUsers(preserveSelection = false): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const response = await this.api.listUsers(
        this.activeSearch(),
        this.currentPage(),
        this.pageSize,
      );
      this.users.set(response.items);
      this.total.set(response.total);
      if (preserveSelection && this.selectedUser()) {
        const refreshed = response.items.find((user) => user.id === this.selectedUser()?.id);
        if (refreshed) this.selectUser(refreshed);
        else this.selectUser(response.items[0] ?? null);
      } else {
        this.selectUser(response.items[0] ?? null);
      }
    } catch (error: unknown) {
      this.error.set(this.errorMessage(error, 'Impossible de charger les utilisateurs.'));
      this.users.set([]);
      this.total.set(0);
      this.selectUser(null);
    } finally {
      this.loading.set(false);
    }
  }

  protected onSearchInput(event: Event): void {
    this.searchDraft.set((event.target as HTMLInputElement).value.slice(0, 100));
  }

  protected search(event: Event): void {
    event.preventDefault();
    this.activeSearch.set(this.searchDraft().trim());
    this.currentPage.set(1);
    void this.loadUsers();
  }

  protected clearSearch(): void {
    this.searchDraft.set('');
    this.activeSearch.set('');
    this.currentPage.set(1);
    void this.loadUsers();
  }

  protected selectUser(user: HubManagedUser | null): void {
    this.selectedUser.set(user);
    this.draftRoles.set(user ? [...user.hubRoles] : []);
    this.draftCountries.set(user ? [...user.hubCountryCodes] : []);
    this.feedback.set('');
  }

  protected hasRole(role: HubRole): boolean {
    return this.draftRoles().includes(role);
  }

  protected toggleRole(role: HubRole, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const roles = checked
      ? [...this.draftRoles(), role]
      : this.draftRoles().filter((candidate) => candidate !== role);
    const normalized = normalizeHubAccess(roles, this.draftCountries());
    this.draftRoles.set(normalized.roles);
    this.draftCountries.set(normalized.countryCodes);
    this.feedback.set('');
  }

  protected hasCountry(code: string): boolean {
    return this.draftCountries().includes(code);
  }

  protected toggleCountry(code: string, event: Event): void {
    if (this.isGlobalDraft()) return;
    const checked = (event.target as HTMLInputElement).checked;
    this.draftCountries.update((countries) =>
      checked ? [...new Set([...countries, code])] : countries.filter((item) => item !== code),
    );
    this.feedback.set('');
  }

  protected selectAllCountries(): void {
    if (!this.isGlobalDraft()) {
      this.draftCountries.set(this.countries.map((country) => country.code));
    }
  }

  protected clearCountries(): void {
    if (!this.isGlobalDraft()) this.draftCountries.set([]);
  }

  protected async saveAccess(): Promise<void> {
    const user = this.selectedUser();
    if (!user || this.saving()) return;
    const access = normalizeHubAccess(this.draftRoles(), this.draftCountries());
    const validationError = validateHubAccess(access);
    if (validationError) {
      this.error.set(validationError);
      return;
    }

    this.saving.set(true);
    this.error.set('');
    this.feedback.set('');
    try {
      const updated = await this.api.setHubAccess(user.id, access.roles, access.countryCodes);
      this.users.update((users) =>
        users.map((candidate) => (candidate.id === updated.id ? updated : candidate)),
      );
      this.selectUser(updated);
      this.feedback.set(
        `Les autorisations de ${updated.firstName} ${updated.lastName} sont enregistrées.`,
      );
    } catch (error: unknown) {
      this.error.set(this.errorMessage(error, 'La mise à jour des autorisations a échoué.'));
    } finally {
      this.saving.set(false);
    }
  }

  protected previousPage(): void {
    if (this.currentPage() <= 1 || this.loading()) return;
    this.currentPage.update((page) => page - 1);
    void this.loadUsers();
  }

  protected nextPage(): void {
    if (this.currentPage() >= this.totalPages() || this.loading()) return;
    this.currentPage.update((page) => page + 1);
    void this.loadUsers();
  }

  protected displayName(user: HubManagedUser): string {
    return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.username;
  }

  protected initials(user: HubManagedUser): string {
    return `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || 'OH';
  }

  protected roleSummary(user: HubManagedUser): string {
    if (user.role === 'admin') return 'Administrateur global';
    if (user.hubRoles.includes('hub_admin')) return 'Administrateur Hub';
    if (!user.hubRoles.length) return 'Aucun accès Hub';
    return `${user.hubRoles.length} rôle(s) · ${user.hubCountryCodes.length} pays`;
  }

  private errorMessage(error: unknown, fallback: string): string {
    if (!(error instanceof HttpErrorResponse)) return fallback;
    if (error.status === 403) return 'Votre compte ne possède pas le droit d’administrer le Hub.';
    if (error.status === 404) {
      return 'La route d’administration Hub n’est pas encore déployée sur le backend.';
    }
    if (error.status === 0) return 'Le backend One Health est inaccessible.';
    return fallback;
  }
}
