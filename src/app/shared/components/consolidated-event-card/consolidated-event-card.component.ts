import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowRight, LucideCheck, LucideNetwork } from '@lucide/angular';
import { HubEventApi } from '../../../core/data/hub-api.service';

@Component({
  selector: 'app-consolidated-event-card',
  imports: [RouterLink, LucideArrowRight, LucideCheck, LucideNetwork],
  templateUrl: './consolidated-event-card.component.html',
  styleUrl: './consolidated-event-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsolidatedEventCardComponent {
  readonly event = input.required<HubEventApi>();

  protected scorePercent(score: number): number {
    return Math.round(score * 100);
  }
}
