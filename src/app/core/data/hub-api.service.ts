import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
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
  readonly audit: readonly Record<string, unknown>[];
  readonly simulated: true;
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
  readonly allowedRoles: readonly (
    | 'hub_viewer'
    | 'hub_analyst'
    | 'hub_verifier'
    | 'hub_admin'
  )[];
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

interface HubObservationPage {
  readonly items: readonly OneHealthObservation[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly pages: number;
}

@Injectable({ providedIn: 'root' })
export class HubApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/hub`;

  async getAllObservations(): Promise<readonly OneHealthObservation[]> {
    const firstPage = await this.getObservationPage(1, 100);
    if (firstPage.pages <= 1) {
      return firstPage.items;
    }

    const remainingPages = await Promise.all(
      Array.from({ length: firstPage.pages - 1 }, (_, index) =>
        this.getObservationPage(index + 2, 100),
      ),
    );
    return [firstPage, ...remainingPages].flatMap((page) => page.items);
  }

  getObservationDetail(id: string): Promise<HubObservationDetailApi> {
    return firstValueFrom(
      this.http.get<HubObservationDetailApi>(
        `${this.baseUrl}/observations/${encodeURIComponent(id)}`,
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

  private getObservationPage(page: number, limit: number): Promise<HubObservationPage> {
    return firstValueFrom(
      this.http.get<HubObservationPage>(`${this.baseUrl}/observations`, {
        params: { page, limit },
      }),
    );
  }
}
