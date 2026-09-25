import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import {
  LucideCheckCircle2,
  LucideFileChartColumn,
  LucideSparkles,
  LucideTriangleAlert,
} from '@lucide/angular';

import {
  CeeacCountryCode,
  HubScenarioApi,
  RunHubScenarioInput,
} from '../../../../core/data/hub-api.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { canSubmitScenario } from './scenario-execution-dialog.presenter';

export type ScenarioOverlayState = 'configure' | 'running' | 'success' | 'error';

export interface ScenarioCountryOption {
  readonly code: CeeacCountryCode;
  readonly name: string;
}

export interface ScenarioCountryChange {
  readonly field: 'sourceCountryCode' | 'comparisonCountryCode';
  readonly value: CeeacCountryCode;
}

export interface ScenarioDateChange {
  readonly field: 'dateFrom' | 'dateTo';
  readonly value: string;
}

@Component({
  selector: 'app-scenario-execution-dialog',
  imports: [
    LucideCheckCircle2,
    LucideFileChartColumn,
    LucideSparkles,
    LucideTriangleAlert,
    TranslatePipe,
  ],
  templateUrl: './scenario-execution-dialog.component.html',
  styleUrl: './scenario-execution-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScenarioExecutionDialogComponent {
  readonly state = input.required<ScenarioOverlayState>();
  readonly busy = input.required<boolean>();
  readonly message = input<string | null>(null);
  readonly scenario = input<HubScenarioApi | null>(null);
  readonly draft = input.required<RunHubScenarioInput>();
  readonly countries = input.required<readonly ScenarioCountryOption[]>();
  readonly maximumDate = input.required<string>();
  readonly configurationError = input<string | null>(null);
  readonly sourceCountryName = input.required<string>();
  readonly comparisonCountryName = input.required<string>();
  readonly periodLabel = input.required<string>();

  readonly closeRequested = output<void>();
  readonly retryRequested = output<void>();
  readonly runRequested = output<void>();
  readonly reportRequested = output<void>();
  readonly countryChanged = output<ScenarioCountryChange>();
  readonly dateChanged = output<ScenarioDateChange>();

  private readonly document = inject(DOCUMENT);
  private readonly dialog = viewChild<ElementRef<HTMLElement>>('dialog');
  private readonly primaryAction = viewChild<ElementRef<HTMLButtonElement>>('primaryAction');

  private readonly scrollLock = effect((onCleanup) => {
    this.state();
    const previousOverflow = this.document.body.style.overflow;
    this.document.body.style.overflow = 'hidden';
    onCleanup(() => {
      this.document.body.style.overflow = previousOverflow;
    });
  });

  private readonly focusDialog = effect(() => {
    const state = this.state();
    const target = state === 'success' || state === 'error' ? this.primaryAction() : this.dialog();
    if (target) queueMicrotask(() => target.nativeElement.focus());
  });

  protected requestClose(): void {
    if (this.state() !== 'running') this.closeRequested.emit();
  }

  protected submit(): void {
    if (canSubmitScenario(this.busy(), this.configurationError())) this.runRequested.emit();
  }

  protected changeCountry(field: ScenarioCountryChange['field'], event: Event): void {
    this.countryChanged.emit({
      field,
      value: (event.target as HTMLSelectElement).value as CeeacCountryCode,
    });
  }

  protected changeDate(field: ScenarioDateChange['field'], event: Event): void {
    this.dateChanged.emit({ field, value: (event.target as HTMLInputElement).value });
  }
}
