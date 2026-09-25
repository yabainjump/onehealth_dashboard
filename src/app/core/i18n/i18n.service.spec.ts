import { translate } from './i18n.service';

describe('dashboard translations', () => {
  it('translates shell navigation in every supported language', () => {
    expect(translate('fr', 'shell.nav.overview')).toBe('Vue d’ensemble');
    expect(translate('en', 'shell.nav.overview')).toBe('Overview');
    expect(translate('pt', 'shell.nav.overview')).toBe('Visão geral');
    expect(translate('es', 'shell.nav.overview')).toBe('Vista general');
  });

  it('interpolates values without evaluating markup', () => {
    const result = translate('en', 'scenario.success.description', {
      source: '<b>Cameroon</b>',
      comparison: 'Chad',
      period: 'August',
    });

    expect(result).toContain('<b>Cameroon</b>–Chad');
  });
});
