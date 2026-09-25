import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-language-switcher',
  imports: [TranslatePipe],
  template: `
    <label class="language-switcher">
      <span class="sr-only">{{ 'language.label' | t }}</span>
      <select
        [attr.aria-label]="'language.label' | t"
        [value]="i18n.language()"
        (change)="changeLanguage($event)"
      >
        <option value="fr">FR</option>
        <option value="en">EN</option>
        <option value="pt">PT</option>
        <option value="es">ES</option>
      </select>
    </label>
  `,
  styles: `
    .language-switcher select {
      min-width: 58px;
      min-height: 36px;
      padding: 0 24px 0 9px;
      border: 1px solid var(--oh-border, #d8e1ed);
      border-radius: 10px;
      background: var(--oh-surface, #fff);
      color: var(--oh-ink-800, #24344d);
      font: inherit;
      font-size: var(--oh-text-xs, 0.75rem);
      font-weight: 650;
      cursor: pointer;
    }
    .language-switcher select:focus-visible {
      outline: 3px solid rgb(24 105 184 / 18%);
      outline-offset: 2px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageSwitcherComponent {
  protected readonly i18n = inject(I18nService);

  protected changeLanguage(event: Event): void {
    this.i18n.setLanguage((event.target as HTMLSelectElement).value);
  }
}
