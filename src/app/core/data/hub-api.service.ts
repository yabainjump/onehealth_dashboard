import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, fromEvent, NEVER, Observable, takeUntil, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OneHealthObservation } from './models/one-health-observation.model';
import type { components } from '../api/generated/dashboard-api.types';

type HubSchemas = components['schemas'];

export type HubSignalApi = HubSchemas['HubSignal'];
export type HubObservationDetailApi = HubSchemas['HubObservationDetail'];
export type HubAuditApi = HubSchemas['HubAudit'];
export type HubDecisionApi = HubSchemas['HubDecision'];
export type HubDecisionListApi = HubSchemas['HubDecisionList'];
export type CeeacCountryCode = HubSchemas['CeeacCountryCode'];
export type HubScenarioConfigurationApi = HubSchemas['HubScenarioConfiguration'];
export type RunHubScenarioInput = HubSchemas['RunHubScenarioInput'];
export type HubScenarioApi = HubSchemas['HubScenario'];
export type HubScenarioReportApi = HubSchemas['HubScenarioReport'];
export type HubEventObservationApi = HubSchemas['HubEventObservation'];
export type HubEventApi = HubSchemas['HubEvent'];
export type HubEventListApi = HubSchemas['HubEventList'];
export type HubAlertReportApi = HubSchemas['HubAlertReport'];
export type HubAlertReportListApi = HubSchemas['HubAlertReportList'];
export type HubReportStatus = HubAlertReportApi['status'];
export type HubConnectorApi = HubSchemas['HubConnector'];
export type HubConnectorStatus = HubConnectorApi['status'];
export type HubConnectorPageApi = HubSchemas['HubConnectorPage'];
export type HubConnectorSectorSummaryApi = HubSchemas['HubConnectorSectorSummary'];
export type HubConnectorSummaryApi = HubSchemas['HubConnectorSummary'];
export type HubConnectorSyncApi = HubSchemas['HubConnectorSync'];
export type HubSharingPolicyApi = HubSchemas['HubSharingPolicy'];
export type HubSharingLevel = HubSharingPolicyApi['sharingLevel'];
export type HubAggregationLevel = HubSharingPolicyApi['aggregationLevel'];
export type HubSharingPolicyListApi = HubSchemas['HubSharingPolicyList'];
export type UpdateHubSharingPolicyInput = HubSchemas['UpdateHubSharingPolicyInput'];
export type HubSummary = HubSchemas['HubSummary'];
export type HubObservationPage = HubSchemas['HubObservationPage'];

export interface HubObservationQuery {
  page: number;
  limit: number;
  search?: string;
  countryCode?: string;
  sector?: OneHealthObservation['sector'];
  stage?: OneHealthObservation['stage'];
  view?: 'all' | 'priority' | 'country';
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

  getDecisions(): Promise<HubDecisionListApi> {
    return firstValueFrom(this.http.get<HubDecisionListApi>(`${this.baseUrl}/decisions`));
  }

  getEvents(): Promise<HubEventListApi> {
    return firstValueFrom(this.http.get<HubEventListApi>(`${this.baseUrl}/events`));
  }

  consolidateEvent(observationIds: readonly string[]): Promise<HubEventApi> {
    return firstValueFrom(
      this.http.post<HubEventApi>(`${this.baseUrl}/events`, { observationIds }),
    );
  }

  getScenario(): Promise<HubScenarioApi> {
    return firstValueFrom(this.http.get<HubScenarioApi>(`${this.baseUrl}/demo/scenario`));
  }

  runScenario(input: RunHubScenarioInput): Promise<HubScenarioApi> {
    return firstValueFrom(
      this.http
        .post<HubScenarioApi>(`${this.baseUrl}/demo/scenario/run`, input)
        .pipe(timeout(120_000)),
    );
  }

  getScenarioReport(scenarioCode: string): Promise<HubScenarioReportApi> {
    return firstValueFrom(
      this.http.get<HubScenarioReportApi>(
        `${this.baseUrl}/demo/scenarios/${encodeURIComponent(scenarioCode)}/report`,
      ),
    );
  }

  getAlertReports(
    observationId: string,
  ): Promise<HubAlertReportListApi> {
    return firstValueFrom(
      this.http.get<HubAlertReportListApi>(
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
