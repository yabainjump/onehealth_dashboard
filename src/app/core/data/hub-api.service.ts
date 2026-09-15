import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, fromEvent, NEVER, Observable, takeUntil, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OneHealthObservation } from './models/one-health-observation.model';

export interface HubSignalApi {
  readonly signalCode: string;
  readonly observationId: string;
  readonly status: 'SIGNAL_DETECTED' | 'UNDER_VERIFICATION' | 'VERIFIED' | 'REJECTED' | 'CLOSED';
  readonly assignedTo: string | null;
  readonly decisionNote: string;
}

export interface HubObservationDetailApi {
  readonly observation: OneHealthObservation;
  readonly related: readonly OneHealthObservation[];
  readonly signal: HubSignalApi | null;
  readonly alert: {
    readonly alertCode: string;
    readonly status: 'VERIFIED' | 'CLOSED';
    readonly verifiedBy: string;
    readonly verifiedAt: string;
    readonly verificationNote: string;
  } | null;
  readonly audit: readonly HubAuditApi[];
  readonly event: HubEventApi | null;
  readonly simulated: true;
}

export interface HubAuditApi {
  readonly entityType: 'observation' | 'signal' | 'alert' | 'scenario' | 'report' | string;
  readonly entityId: string;
  readonly action: string;
  readonly actorId: string;
  readonly actorType: 'USER' | 'SYSTEM';
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly countryCode: string;
  readonly createdAt: string;
}

export interface HubDecisionApi {
  readonly signalCode: string;
  readonly observationId: string;
  readonly title: string;
  readonly countryCode: string;
  readonly countryName: string;
  readonly adminArea: string;
  readonly sector: 'human' | 'animal' | 'environment';
  readonly priority: 'low' | 'medium' | 'high' | 'critical';
  readonly confidenceScore: number;
  readonly status: 'SIGNAL_DETECTED' | 'UNDER_VERIFICATION';
  readonly assignedTo: string | null;
  readonly detectedAt: string;
  readonly dueAt: string;
  readonly simulated: boolean;
}

export interface HubScenarioApi {
  readonly scenarioCode: string;
  readonly title: string;
  readonly description: string;
  readonly status: 'READY' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  readonly steps: readonly {
    readonly code: string;
    readonly label: string;
    readonly status: 'PENDING' | 'COMPLETED' | 'FAILED';
    readonly completedAt: string | null;
  }[];
  readonly observationIds: readonly string[];
  readonly signalCode: string | null;
  readonly eventCode: string | null;
  readonly initiatedBy: string | null;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
  readonly simulated: true;
}

export interface HubEventObservationApi {
  readonly id: string;
  readonly title: string;
  readonly sector: 'human' | 'animal' | 'environment';
  readonly sourceSystem: 'DHIS2' | 'ARIS 3' | 'CAPC-AC';
  readonly countryCode: string;
  readonly countryName: string;
  readonly adminArea: string;
  readonly observedAt: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly simulated: boolean;
}

export interface HubEventApi {
  readonly eventCode: string;
  readonly title: string;
  readonly status: 'CONSOLIDATED' | 'UNDER_REVIEW' | 'CLOSED';
  readonly observationIds: readonly string[];
  readonly countryCodes: readonly string[];
  readonly sectors: readonly ('human' | 'animal' | 'environment')[];
  readonly longitude: number;
  readonly latitude: number;
  readonly maxDistanceKm: number;
  readonly timeWindowHours: number;
  readonly correlationScore: number;
  readonly correlationReasons: readonly string[];
  readonly ruleVersion: string;
  readonly scenarioId: string;
  readonly firstObservedAt: string;
  readonly lastObservedAt: string;
  readonly consolidatedBy: string;
  readonly consolidatedAt: string;
  readonly simulated: boolean;
  readonly observations?: readonly HubEventObservationApi[];
}

export type HubReportStatus = 'DRAFT' | 'IN_REVIEW' | 'VALIDATED' | 'PUBLISHED';
export interface HubAlertReportApi {
  readonly reportId: string;
  readonly alertCode: string;
  readonly observationId: string;
  readonly countryCode: string;
  readonly version: number;
  readonly status: HubReportStatus;
  readonly title: string;
  readonly executiveSummary: string;
  readonly findings: readonly string[];
  readonly recommendations: readonly string[];
  readonly sources: readonly string[];
  readonly sectors: readonly ('human' | 'animal' | 'environment')[];
  readonly generatedBy: string;
  readonly generatedAt: string;
  readonly validatedBy: string | null;
  readonly validatedAt: string | null;
  readonly publishedBy: string | null;
  readonly publishedAt: string | null;
  readonly simulated: boolean;
}

export type HubConnectorStatus = 'operational' | 'degraded' | 'error' | 'suspended';

export interface HubConnectorApi {
  readonly id: string;
  readonly countryCode: string;
  readonly countryName: string;
  readonly institution: string;
  readonly sector: 'human' | 'animal' | 'environment';
  readonly sourceSystem: 'DHIS2' | 'ARIS 3' | 'CAPC-AC';
  readonly protocol: 'API_REST' | 'SYNC' | 'PUSH_SFTP' | 'GEOJSON';
  readonly endpointAlias: string;
  readonly status: HubConnectorStatus;
  readonly availabilityPercent: number;
  readonly lastSyncAt: string | null;
  readonly lastSuccessAt: string | null;
  readonly nextSyncAt: string | null;
  readonly volume: {
    readonly received: number;
    readonly accepted: number;
    readonly rejected: number;
    readonly duplicates: number;
  };
  readonly lastDurationMs: number;
  readonly error: { readonly code: string; readonly message: string } | null;
  readonly enabled: boolean;
  readonly simulated: true;
}

export interface HubConnectorPageApi {
  readonly items: readonly HubConnectorApi[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly pages: number;
  readonly simulated: true;
}

export interface HubConnectorSectorSummaryApi {
  readonly sector: 'human' | 'animal' | 'environment';
  readonly total: number;
  readonly availabilityPercent: number;
  readonly operational: number;
  readonly degraded: number;
  readonly error: number;
  readonly suspended: number;
}

export interface HubConnectorSummaryApi {
  readonly total: number;
  readonly countries: number;
  readonly sectors: readonly HubConnectorSectorSummaryApi[];
  readonly statuses: Record<HubConnectorStatus, number>;
  readonly simulated: true;
}

export interface HubConnectorSyncApi {
  readonly synchronized: number;
  readonly observationsCreated: 0;
  readonly duplicatesIgnored: number;
  readonly completedAt: string;
  readonly simulated: true;
  readonly message: string;
}

export type HubSharingLevel =
  | 'OWNER_ONLY'
  | 'OWNER_AND_CEEAC'
  | 'AUTHORIZED_COUNTRIES'
  | 'REGIONAL_AUTHORIZED'
  | 'PUBLIC_AGGREGATED';

export type HubAggregationLevel = 'POINT' | 'ADMIN_1' | 'COUNTRY' | 'REGIONAL';

export interface HubSharingPolicyApi {
  readonly policyId: string;
  readonly countryOwner: string;
  readonly sharingLevel: HubSharingLevel;
  readonly allowedRoles: readonly ('hub_viewer' | 'hub_analyst' | 'hub_verifier' | 'hub_admin')[];
  readonly allowedCountries: readonly string[];
  readonly aggregationLevel: HubAggregationLevel;
  readonly retentionPeriodDays: number;
  readonly containsPersonalData: boolean;
  readonly updatedAt: string;
  readonly simulated: boolean;
}

export interface HubSharingPolicyListApi {
  readonly items: readonly HubSharingPolicyApi[];
  readonly total: number;
  readonly simulated: boolean;
}

export interface UpdateHubSharingPolicyInput {
  readonly sharingLevel: HubSharingLevel;
  readonly allowedRoles: HubSharingPolicyApi['allowedRoles'];
  readonly allowedCountries: readonly string[];
  readonly aggregationLevel: HubAggregationLevel;
  readonly retentionPeriodDays: number;
  readonly containsPersonalData: boolean;
}

export interface HubObservationQuery {
  page: number;
  limit: number;
  search?: string;
  countryCode?: string;
  sector?: OneHealthObservation['sector'];
  stage?: OneHealthObservation['stage'];
  view?: 'all' | 'priority' | 'country';
}

export interface HubSummary {
  readonly total: number;
  readonly byStage: Record<OneHealthObservation['stage'], number>;
  readonly simulated: boolean;
}

export interface HubObservationPage {
  readonly items: readonly OneHealthObservation[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly pages: number;
}

export class HubDatasetLimitError extends Error {
  constructor() {
    super(
      'Le volume dépasse la limite de 10 000 observations de cette vue. Une vue paginée côté serveur est nécessaire.',
    );
  }
}

@Injectable({ providedIn: 'root' })
export class HubApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/hub`;

  listObservations(query: HubObservationQuery): Observable<HubObservationPage> {
    const params: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') params[key] = value;
    }
    return this.http.get<HubObservationPage>(`${this.baseUrl}/observations`, { params })
      .pipe(timeout(30_000));
  }

  observationSummary(): Observable<HubSummary> {
    return this.http.get<HubSummary>(`${this.baseUrl}/summary`).pipe(timeout(30_000));
  }

  async getAllObservations(signal?: AbortSignal): Promise<readonly OneHealthObservation[]> {
    const firstPage = await this.getObservationPage(1, 100, signal);
    if (
      !Number.isInteger(firstPage.pages) ||
      firstPage.pages < 0 ||
      firstPage.pages > 100 ||
      firstPage.total > 10_000
    ) {
      throw new HubDatasetLimitError();
    }
    if (firstPage.pages <= 1) {
      return firstPage.items;
    }

    const items = [...firstPage.items];
    for (let page = 2; page <= firstPage.pages; page += 3) {
      const batch = await Promise.all(
        Array.from({ length: Math.min(3, firstPage.pages - page + 1) }, (_, offset) =>
          this.getObservationPage(page + offset, 100, signal),
        ),
      );
      items.push(...batch.flatMap((result) => result.items));
    }
    return items;
  }

  getObservationDetail(id: string): Promise<HubObservationDetailApi> {
    return firstValueFrom(
      this.http.get<HubObservationDetailApi>(
        `${this.baseUrl}/observations/${encodeURIComponent(id)}`,
      ),
    );
  }

  getDecisions(): Promise<{ readonly items: readonly HubDecisionApi[]; readonly total: number }> {
    return firstValueFrom(
      this.http.get<{ items: readonly HubDecisionApi[]; total: number }>(
        `${this.baseUrl}/decisions`,
      ),
    );
  }

  getEvents(): Promise<{ readonly items: readonly HubEventApi[]; readonly total: number }> {
    return firstValueFrom(
      this.http.get<{ items: readonly HubEventApi[]; total: number }>(`${this.baseUrl}/events`),
    );
  }

  consolidateEvent(observationIds: readonly string[]): Promise<HubEventApi> {
    return firstValueFrom(
      this.http.post<HubEventApi>(`${this.baseUrl}/events`, { observationIds }),
    );
  }

  getScenario(): Promise<HubScenarioApi> {
    return firstValueFrom(this.http.get<HubScenarioApi>(`${this.baseUrl}/demo/scenario`));
  }

  runScenario(): Promise<HubScenarioApi> {
    return firstValueFrom(this.http.post<HubScenarioApi>(`${this.baseUrl}/demo/scenario/run`, {}));
  }

  getAlertReports(
    observationId: string,
  ): Promise<{ readonly items: readonly HubAlertReportApi[]; readonly total: number }> {
    return firstValueFrom(
      this.http.get<{ items: readonly HubAlertReportApi[]; total: number }>(
        `${this.baseUrl}/alerts/${encodeURIComponent(observationId)}/reports`,
      ),
    );
  }

  generateAlertReport(observationId: string): Promise<HubAlertReportApi> {
    return firstValueFrom(
      this.http.post<HubAlertReportApi>(
        `${this.baseUrl}/alerts/${encodeURIComponent(observationId)}/reports`,
        {},
      ),
    );
  }

  updateReportStatus(
    reportId: string,
    status: Exclude<HubReportStatus, 'DRAFT'>,
  ): Promise<HubAlertReportApi> {
    return firstValueFrom(
      this.http.patch<HubAlertReportApi>(
        `${this.baseUrl}/reports/${encodeURIComponent(reportId)}/status`,
        { status },
      ),
    );
  }

  assignSignal(signalCode: string): Promise<HubObservationDetailApi | { signal: HubSignalApi }> {
    return firstValueFrom(
      this.http.patch<HubObservationDetailApi | { signal: HubSignalApi }>(
        `${this.baseUrl}/signals/${encodeURIComponent(signalCode)}/assign`,
        {},
      ),
    );
  }

  decideSignal(
    signalCode: string,
    status: 'VERIFIED' | 'REJECTED',
    note: string,
  ): Promise<HubObservationDetailApi> {
    return firstValueFrom(
      this.http.patch<HubObservationDetailApi>(
        `${this.baseUrl}/signals/${encodeURIComponent(signalCode)}/decision`,
        { status, note },
      ),
    );
  }

  getConnectors(): Promise<HubConnectorPageApi> {
    return firstValueFrom(
      this.http.get<HubConnectorPageApi>(`${this.baseUrl}/connectors`, {
        params: { page: 1, limit: 100 },
      }),
    );
  }

  getConnectorSummary(): Promise<HubConnectorSummaryApi> {
    return firstValueFrom(
      this.http.get<HubConnectorSummaryApi>(`${this.baseUrl}/connectors/summary`),
    );
  }

  synchronizeConnectors(): Promise<HubConnectorSyncApi> {
    return firstValueFrom(
      this.http.post<HubConnectorSyncApi>(`${this.baseUrl}/connectors/synchronize`, {}),
    );
  }

  getSharingPolicies(): Promise<HubSharingPolicyListApi> {
    return firstValueFrom(
      this.http.get<HubSharingPolicyListApi>(`${this.baseUrl}/sharing-policies`),
    );
  }

  updateSharingPolicy(
    policyId: string,
    input: UpdateHubSharingPolicyInput,
  ): Promise<HubSharingPolicyApi> {
    return firstValueFrom(
      this.http.patch<HubSharingPolicyApi>(
        `${this.baseUrl}/sharing-policies/${encodeURIComponent(policyId)}`,
        input,
      ),
    );
  }

  private getObservationPage(
    page: number,
    limit: number,
    signal?: AbortSignal,
  ): Promise<HubObservationPage> {
    if (signal?.aborted) return Promise.reject(new Error('Chargement annulé.'));
    return firstValueFrom(
      this.http
        .get<HubObservationPage>(`${this.baseUrl}/observations`, {
          params: { page, limit },
        })
        .pipe(timeout(30_000), takeUntil(signal ? fromEvent(signal, 'abort') : NEVER)),
    );
  }
}
