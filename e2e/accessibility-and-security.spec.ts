import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import {
  VIEWER_USER,
  installHubApiMocks,
  loginThroughUi,
} from './fixtures/hub-api.fixture';

const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function expectNoAutomaticWcagViolation(page: Parameters<typeof AxeBuilder>[0]['page']) {
  const result = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
  const summary = result.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    targets: violation.nodes.map((node) => node.target.join(' ')),
  }));
  expect(result.violations, JSON.stringify(summary, null, 2)).toEqual([]);
}

test('landing et connexion respectent les contrôles WCAG automatisables', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expectNoAutomaticWcagViolation(page);

  await page.goto('/connexion', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Connexion au Dashboard' })).toBeVisible();
  await expectNoAutomaticWcagViolation(page);
});

test('dashboard authentifié respecte les contrôles WCAG automatisables', async ({ page }) => {
  await installHubApiMocks(page);
  await loginThroughUi(page);
  await expectNoAutomaticWcagViolation(page);
});

test('le rôle lecteur ne peut pas ouvrir l’administration', async ({ page }) => {
  await installHubApiMocks(page, VIEWER_USER);
  await loginThroughUi(page);
  await page.goto('/administration', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/acces-refuse$/);
  await expect(page.getByRole('heading', { name: /accès/i })).toBeVisible();
});

test('le jeton de session est envoyé aux API autorisées', async ({ page }) => {
  const state = await installHubApiMocks(page);
  await loginThroughUi(page);
  await expect.poll(() => state.authorizedRequests.length).toBeGreaterThan(0);
  expect(state.authorizedRequests).toContain('/api/hub/observations');
});

test('la landing reste fluide et responsive au premier rendu', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.ohn-initial-loader')).toHaveCount(0);
  await expect(page.locator('.landing-brand img')).toHaveJSProperty('complete', true);
  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return {
      domContentLoaded: navigation.domContentLoadedEventEnd,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(metrics.domContentLoaded).toBeLessThan(5_000);
  expect(metrics.overflow).toBeLessThanOrEqual(1);
});
