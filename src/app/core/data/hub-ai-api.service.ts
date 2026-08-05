import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface HubAiResponse {
  readonly content: string;
  readonly mode: 'alert' | 'report' | 'analysis' | 'assistant';
  readonly model: string;
  readonly generatedAt: string;
  readonly sourceIds: readonly string[];
  readonly humanValidationRequired: true;
}

export interface HubAiScope {
  readonly countryCode?: string;
  readonly sector?: 'human' | 'animal' | 'environment';
  readonly periodDays?: number;
}

@Injectable({ providedIn: 'root' })
export class HubAiApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/hub/ai`;

  alertSummary(id: string): Promise<HubAiResponse> {
    return firstValueFrom(this.http.post<HubAiResponse>(`${this.baseUrl}/alerts/${encodeURIComponent(id)}/summary`, {}));
  }

  reportDraft(scope: HubAiScope): Promise<HubAiResponse> {
    return firstValueFrom(this.http.post<HubAiResponse>(`${this.baseUrl}/reports/draft`, scope));
  }

  explainAnalysis(scope: HubAiScope): Promise<HubAiResponse> {
    return firstValueFrom(this.http.post<HubAiResponse>(`${this.baseUrl}/analyses/explain`, scope));
  }

  ask(question: string, scope: HubAiScope = {}): Promise<HubAiResponse> {
    return firstValueFrom(this.http.post<HubAiResponse>(`${this.baseUrl}/assistant`, { ...scope, question }));
  }
}
