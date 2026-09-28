import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { BrandLoaderComponent } from '../../shared/components/brand-loader/brand-loader.component';
import {
  CeeacCountryCode,
  HubApiService,
  HubConnectorApi,
  HubConnectorSimulationApi,
  HubDataQualityIssuePageApi,
  HubImportBatchPageApi,
  HubImportDictionaryApi,
  HubImportPreviewApi,
} from '../../core/data/hub-api.service';

type SourceSystem = 'DHIS2' | 'ARIS 3' | 'CAPC-AC';
type ImportFormat = 'CSV' | 'JSON' | 'GEOJSON';
type SimulationScenario =
  'SUCCESS' | 'DUPLICATES' | 'INVALID_RECORDS' | 'PARTIAL_FAILURE' | 'AUTH_FAILURE' | 'TIMEOUT';

@Component({
  selector: 'app-data-quality-page',
  imports: [FormsModule, ButtonModule, SelectModule, TagModule, BrandLoaderComponent],
  templateUrl: './data-quality.page.html',
  styleUrl: './data-quality.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataQualityPage implements OnInit {
  private readonly api = inject(HubApiService);

  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly feedback = signal('');
  protected readonly dictionary = signal<HubImportDictionaryApi | null>(null);
  protected readonly batches = signal<HubImportBatchPageApi | null>(null);
  protected readonly issues = signal<HubDataQualityIssuePageApi | null>(null);
  protected readonly connectors = signal<readonly HubConnectorApi[]>([]);
  protected readonly preview = signal<HubImportPreviewApi | null>(null);
  protected readonly simulation = signal<HubConnectorSimulationApi | null>(null);
  protected readonly fileName = signal('');
  protected readonly fileContent = signal('');
  protected readonly sourceSystem = signal<SourceSystem>('DHIS2');
  protected readonly countryCode = signal('CM');
  protected readonly sourceInstance = signal('sandbox-minsante');
  protected readonly sharingPolicyId = signal('POLICY-DEMO-CM');
  protected readonly format = signal<ImportFormat>('JSON');
  protected readonly selectedConnectorId = signal('');
  protected readonly selectedScenario = signal<SimulationScenario>('SUCCESS');
  protected readonly mappings = signal<Record<string, string>>({});

  protected readonly openIssueCount = computed(
    () => this.issues()?.items.filter((issue) => issue.status === 'OPEN').length ?? 0,
  );
  protected readonly rejectedCount = computed(
    () => this.batches()?.items.reduce((total, batch) => total + batch.counts.rejected, 0) ?? 0,
  );
  protected readonly connectorOptions = computed(() =>
    this.connectors().map((connector) => ({
      label: `${connector.id} · ${connector.countryName}`,
      value: connector.id,
    })),
  );
  protected readonly sourceOptions = [
    { label: 'DHIS2 · Santé humaine', value: 'DHIS2' },
    { label: 'ARIS 3 · Santé animale', value: 'ARIS 3' },
    { label: 'CAPC-AC · Environnement', value: 'CAPC-AC' },
  ];
  protected readonly countryOptions = [
    ['AO', 'Angola'],
    ['BI', 'Burundi'],
    ['CM', 'Cameroun'],
    ['CF', 'RCA'],
    ['TD', 'Tchad'],
    ['CG', 'Congo'],
    ['CD', 'RDC'],
    ['GQ', 'Guinée équatoriale'],
    ['GA', 'Gabon'],
    ['RW', 'Rwanda'],
    ['ST', 'São Tomé-et-Príncipe'],
  ].map(([value, label]) => ({ value, label }));
  protected readonly scenarioOptions = [
    { label: 'Succès', value: 'SUCCESS' },
    { label: 'Doublons', value: 'DUPLICATES' },
    { label: 'Enregistrements invalides', value: 'INVALID_RECORDS' },
    { label: 'Échec partiel', value: 'PARTIAL_FAILURE' },
    { label: "Échec d'authentification", value: 'AUTH_FAILURE' },
    { label: 'Délai dépassé', value: 'TIMEOUT' },
  ];

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const [dictionary, batches, issues, connectors] = await Promise.all([
        this.api.getImportDictionary(),
        this.api.getImportBatches(),
        this.api.getDataQualityIssues(),
        this.api.getConnectors(),
      ]);
      this.dictionary.set(dictionary);
      this.batches.set(batches);
      this.issues.set(issues);
      this.connectors.set(connectors.items.filter((connector) => connector.simulated));
      this.selectedConnectorId.update((value) => value || connectors.items[0]?.id || '');
      this.mappings.set(
        Object.fromEntries(dictionary.fields.map((field) => [field.field, field.field])),
      );
    } catch (error: unknown) {
      this.error.set(this.errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  protected async onFileSelected(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    this.preview.set(null);
    this.feedback.set('');
    if (!file) return;
    const maxBytes = this.dictionary()?.maxFileBytes ?? 1_048_576;
    if (file.size > maxBytes) {
      this.error.set(`Le fichier dépasse la limite de ${maxBytes} octets.`);
      return;
    }
    const extension = file.name.split('.').pop()?.toLowerCase();
    const format =
      extension === 'csv'
        ? 'CSV'
        : extension === 'geojson'
          ? 'GEOJSON'
          : extension === 'json'
            ? 'JSON'
            : null;
    if (!format) {
      this.error.set('Format refusé. Utilisez CSV, JSON ou GeoJSON.');
      return;
    }
    this.error.set('');
    this.fileName.set(file.name);
    this.format.set(format);
    this.fileContent.set(await file.text());
  }

  protected onCountryChange(countryCode: string): void {
    this.countryCode.set(countryCode);
    this.sharingPolicyId.set(`POLICY-DEMO-${countryCode}`);
    this.preview.set(null);
  }

  protected updateMapping(targetField: string, event: Event): void {
    const sourceField = (event.target as HTMLInputElement).value.slice(0, 80);
    this.mappings.update((current) => ({ ...current, [targetField]: sourceField }));
    this.preview.set(null);
  }

  protected async previewImport(): Promise<void> {
    if (!this.fileContent() || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.feedback.set('');
    try {
      const mapping = Object.entries(this.mappings())
        .filter(([, sourceField]) => sourceField.trim())
        .map(([targetField, sourceField]) => ({ targetField, sourceField: sourceField.trim() }));
      this.preview.set(
        await this.api.previewImport({
          fileName: this.fileName(),
          format: this.format(),
          sourceSystem: this.sourceSystem(),
          sourceInstance: this.sourceInstance(),
          countryCode: this.countryCode() as CeeacCountryCode,
          sharingPolicyId: this.sharingPolicyId(),
          simulated: true,
          content: this.fileContent(),
          mapping,
        }),
      );
      this.feedback.set("Prévisualisation terminée : aucune observation n'a encore été créée.");
      await this.refreshRegisters();
    } catch (error: unknown) {
      this.error.set(this.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  protected async confirmImport(): Promise<void> {
    const batchId = this.preview()?.batchId;
    if (!batchId || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const result = await this.api.confirmImport(batchId);
      this.feedback.set(
        `${result.observationsCreated} observation(s) simulée(s) créée(s), ${result.duplicatesIgnored} doublon(s) ignoré(s).`,
      );
      this.preview.set(null);
      await this.refreshRegisters();
    } catch (error: unknown) {
      this.error.set(this.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  protected async simulateConnector(): Promise<void> {
    if (!this.selectedConnectorId() || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const result = await this.api.simulateConnector({
        connectorId: this.selectedConnectorId(),
        scenario: this.selectedScenario(),
      });
      this.simulation.set(result);
      this.feedback.set(result.message);
      const connectors = await this.api.getConnectors();
      this.connectors.set(connectors.items);
    } catch (error: unknown) {
      this.error.set(this.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  protected example(value: unknown): string {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : '—';
  }

  protected issueTone(severity: 'ERROR' | 'WARNING'): 'danger' | 'warn' {
    return severity === 'ERROR' ? 'danger' : 'warn';
  }

  private async refreshRegisters(): Promise<void> {
    const [batches, issues] = await Promise.all([
      this.api.getImportBatches(),
      this.api.getDataQualityIssues(),
    ]);
    this.batches.set(batches);
    this.issues.set(issues);
  }

  private errorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && typeof error.error?.message === 'string') {
      return error.error.message;
    }
    return 'Opération impossible. Vérifiez les données et la connexion au Hub.';
  }
}
