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
  LucideMail,
  LucidePawPrint,
  LucideRefreshCw,
  LucideSearch,
  LucideServerCog,
  LucideStethoscope,
  LucideTrees,
} from '@lucide/angular';
import { DashboardAuthService } from '../../core/auth/dashboard-auth.service';
import {
  HubApiService,
  HubConnectorApi,
  HubConnectorSectorSummaryApi,
  HubConnectorStatus,
  HubConnectorSummaryApi,
} from '../../core/data/hub-api.service';
import {
  connectorAvailabilityTone,
  connectorProtocolLabel,
  connectorSectorLabel,
  connectorStatusLabel,
  formatConnectorLastSync,
} from './connector-presenter';

type ConnectorSector = 'all' | 'human' | 'animal' | 'environment';
type ConnectorStatusFilter = 'all' | HubConnectorStatus;

@Component({
  selector: 'app-connectors-page',
  imports: [
    LucideChevronLeft,
    LucideChevronRight,
    LucideCircleAlert,
    LucideMail,
    LucidePawPrint,
    LucideRefreshCw,
    LucideSearch,
    LucideServerCog,
    LucideStethoscope,
    LucideTrees,
  ],
  templateUrl: './connectors.page.html',
  styleUrl: './connectors.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectorsPage implements OnInit {
  private readonly api = inject(HubApiService);
  protected readonly auth = inject(DashboardAuthService);
  private readonly pageSize = 8;

  protected readonly loading = signal(true);
  protected readonly synchronizing = signal(false);
  protected readonly error = signal('');
  protected readonly feedback = signal('');
  protected readonly connectors = signal<readonly HubConnectorApi[]>([]);
  protected readonly summary = signal<HubConnectorSummaryApi | null>(null);
  protected readonly searchTerm = signal('');
  protected readonly selectedSector = signal<ConnectorSector>('all');
  protected readonly selectedStatus = signal<ConnectorStatusFilter>('all');
  protected readonly currentPage = signal(1);
  protected readonly canManage = computed(() => this.auth.canManageConnectors());
  protected readonly statusLabel = connectorStatusLabel;
  protected readonly sectorLabel = connectorSectorLabel;
  protected readonly protocolLabel = connectorProtocolLabel;
  protected readonly formatLastSync = formatConnectorLastSync;
  protected readonly availabilityTone = connectorAvailabilityTone;

  protected readonly filteredConnectors = computed(() => {
    const search = this.searchTerm().toLocaleLowerCase('fr');
    const sector = this.selectedSector();
    const status = this.selectedStatus();
    return this.connectors().filter((connector) => {
      const matchesSearch =
        !search ||
        [
          connector.id,
          connector.countryName,
          connector.countryCode,
          connector.institution,
          connector.sourceSystem,
        ].some((value) => value.toLocaleLowerCase('fr').includes(search));
      return (
        matchesSearch &&
        (sector === 'all' || connector.sector === sector) &&
        (status === 'all' || connector.status === status)
      );
    });
  });

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredConnectors().length / this.pageSize)),
  );

  protected readonly pagedConnectors = computed(() => {
    const page = Math.min(this.currentPage(), this.totalPages());
    const offset = (page - 1) * this.pageSize;
    return this.filteredConnectors().slice(offset, offset + this.pageSize);
  });

  protected readonly resultRange = computed(() => {
    const total = this.filteredConnectors().length;
    if (!total) return 'Aucun connecteur';
    const page = Math.min(this.currentPage(), this.totalPages());
    const start = (page - 1) * this.pageSize + 1;
    const end = Math.min(page * this.pageSize, total);
    return `Affichage de ${start} à ${end} sur ${total} connecteurs`;
  });

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const [page, summary] = await Promise.all([
        this.api.getConnectors(),
        this.api.getConnectorSummary(),
      ]);
      this.connectors.set(page.items);
      this.summary.set(summary);
      this.currentPage.set(1);
    } catch {
      this.error.set(
        'La supervision des connecteurs est indisponible. Vérifiez que le jeu de démonstration a été chargé.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  protected async synchronize(): Promise<void> {
    if (!this.canManage() || this.synchronizing()) return;
    this.synchronizing.set(true);
    this.feedback.set('');
    this.error.set('');
    try {
      const result = await this.api.synchronizeConnectors();
      await this.load();
      this.feedback.set(
        `${result.synchronized} connecteurs relancés · ${result.observationsCreated} nouvelle observation · ${result.duplicatesIgnored} doublons ignorés.`,
      );
    } catch {
      this.error.set('La relance a échoué. Votre session ou vos droits ont peut-être expiré.');
    } finally {
      this.synchronizing.set(false);
    }
  }

  protected showContactHelp(): void {
    const institution = this.auth.currentUser()?.institution?.trim();
    this.feedback.set(
      institution
        ? `Point focal à confirmer auprès de votre institution : ${institution}.`
        : 'Les coordonnées du point focal doivent être configurées dans la future fiche État membre.',
    );
  }

  protected onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value.trim().slice(0, 100));
    this.currentPage.set(1);
  }

  protected onSectorChange(event: Event): void {
    this.selectedSector.set((event.target as HTMLSelectElement).value as ConnectorSector);
    this.currentPage.set(1);
  }

  protected onStatusChange(event: Event): void {
    this.selectedStatus.set((event.target as HTMLSelectElement).value as ConnectorStatusFilter);
    this.currentPage.set(1);
  }

  protected previousPage(): void {
    this.currentPage.update((page) => Math.max(1, page - 1));
  }

  protected nextPage(): void {
    this.currentPage.update((page) => Math.min(this.totalPages(), page + 1));
  }

  protected sectorSummary(sector: HubConnectorApi['sector']): HubConnectorSectorSummaryApi {
    return (
      this.summary()?.sectors.find((item) => item.sector === sector) ?? {
        sector,
        total: 0,
        availabilityPercent: 0,
        operational: 0,
        degraded: 0,
        error: 0,
        suspended: 0,
      }
    );
  }
}
