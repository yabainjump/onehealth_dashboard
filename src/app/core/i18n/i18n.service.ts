import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';

import { AppLanguage, SUPPORTED_LANGUAGES, TRANSLATIONS, TranslationKey } from './translations';

const STORAGE_KEY = 'ohn.dashboard.language';

export function translate(
  language: AppLanguage,
  key: TranslationKey,
  parameters: Readonly<Record<string, string | number>> = {},
): string {
  const template = TRANSLATIONS[language][key] ?? TRANSLATIONS.fr[key] ?? key;
  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
    Object.hasOwn(parameters, name) ? String(parameters[name]) : match,
  );
}

function storedLanguage(): AppLanguage {
  try {
    const value = globalThis.localStorage?.getItem(STORAGE_KEY);
    return SUPPORTED_LANGUAGES.includes(value as AppLanguage) ? (value as AppLanguage) : 'fr';
  } catch {
    return 'fr';
  }
}

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly document = inject(DOCUMENT);
  readonly language = signal<AppLanguage>(storedLanguage());
  readonly languages = SUPPORTED_LANGUAGES;

  private readonly synchronizeDocument = effect(() => {
    const language = this.language();
    this.document.documentElement.lang = language;
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, language);
    } catch {
      // Le stockage local peut être bloqué sans empêcher l'utilisation du Hub.
    }
  });

  setLanguage(value: string): void {
    if (SUPPORTED_LANGUAGES.includes(value as AppLanguage)) {
      this.language.set(value as AppLanguage);
    }
  }

  t(key: TranslationKey, parameters?: Readonly<Record<string, string | number>>): string {
    return translate(this.language(), key, parameters);
  }
}
