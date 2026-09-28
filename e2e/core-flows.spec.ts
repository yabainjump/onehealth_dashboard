import { expect, test } from '@playwright/test';
import { installHubApiMocks, loginThroughUi } from './fixtures/hub-api.fixture';

test.describe('parcours critiques du Hub', () => {
  test.beforeEach(async ({ page }) => {
    await installHubApiMocks(page);
  });

  test('redirige une route protégée puis ouvre le dashboard après connexion', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/connexion\?retour=%2Fdashboard$/);

    await page.getByLabel('Adresse e-mail').fill('admin.e2e@onehealth.test');
    await page.locator('input[formcontrolname="password"]').fill('MotDePasse-E2E-2026');
    await page.getByRole('button', { name: 'Accéder au Hub' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'Tableau de bord stratégique' })).toBeVisible();
    await expect(page.getByText('Données simulées.', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('ohn_hub_session_token'))).toBeNull();
    expect(await page.evaluate(() => sessionStorage.getItem('ohn_hub_session_token'))).toBeTruthy();
  });

  test('charge les principales vues métier sans erreur applicative', async ({ page }) => {
    test.setTimeout(120_000);
    await loginThroughUi(page);
    const routes = [
      ['/etat-membre', 'Situation One Health par État membre'],
      ['/carte', 'Carte interactive CEEAC'],
      ['/alertes', 'Signaux et alertes One Health'],
      ['/analyses', 'Espace Analyste Régional'],
      ['/rapports', 'Bibliothèque des rapports'],
      ['/connecteurs', 'Suivi des connecteurs'],
      ['/souverainete', 'Registre des politiques de partage'],
      ['/administration', 'Administration des accès Hub'],
      ['/aide', 'Comment pouvons-nous vous aider ?'],
      ['/profil', 'Mon profil'],
    ] as const;

    for (const [path, heading] of routes) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      await expect(page.locator('body')).not.toContainText('Internal server error');
    }
  });

  test('exécute un scénario et ouvre son rapport traçable', async ({ page }) => {
    await loginThroughUi(page);
    await page.getByRole('button', { name: 'Lancer le scénario' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Lancer la simulation' }).click();
    await expect(page.getByRole('heading', { name: 'Scénario complété avec succès' })).toBeVisible();
    await page.getByRole('button', { name: 'Afficher le rapport' }).click();

    await expect(page).toHaveURL(/\/rapports\/scenario\/SCN-CM-TD-E2E$/);
    await expect(page.getByRole('heading', { name: 'Rapport de simulation Cameroun–Tchad' })).toBeVisible();
    await expect(page.getByText('Non officiel', { exact: true })).toBeVisible();
  });

  test('interroge Rudolf sans persister la conversation', async ({ page }) => {
    await loginThroughUi(page);
    await page.getByRole('button', { name: 'Rudolf' }).click();
    const composer = page.getByPlaceholder('Posez une question sur les données autorisées…');
    await composer.fill('Quels signaux multisectoriels sont visibles ?');
    await page.getByRole('button', { name: 'Envoyer' }).click();
    await expect(page.getByRole('heading', { name: 'Synthèse E2E' })).toBeVisible();
    const persistentKeys = await page.evaluate(() => Object.keys(localStorage));
    expect(persistentKeys.some((key) => key.toLowerCase().includes('rudolf'))).toBe(false);
  });
});

test.describe('navigation mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('ouvre le menu sans débordement horizontal', async ({ page }) => {
    await installHubApiMocks(page);
    await loginThroughUi(page);
    await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
    await page.getByRole('link', { name: 'Alertes sanitaires' }).click();
    await expect(page).toHaveURL(/\/alertes$/);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
