import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type BrandLoaderMode = 'page' | 'panel' | 'inline';

@Component({
  selector: 'app-brand-loader',
  templateUrl: './brand-loader.component.html',
  styleUrl: './brand-loader.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandLoaderComponent {
  readonly message = input('Chargement du Hub…');
  readonly detail = input('Préparation des données autorisées');
  readonly mode = input<BrandLoaderMode>('panel');
}
