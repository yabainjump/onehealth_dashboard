import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-convergence-motion',
  templateUrl: './convergence-motion.component.html',
  styleUrl: './convergence-motion.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConvergenceMotionComponent {
  readonly tone = input<'light' | 'dark'>('light');
}
