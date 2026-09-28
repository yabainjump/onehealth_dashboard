import type { Page, Route } from '@playwright/test';
import { MOCK_ONE_HEALTH_OBSERVATIONS } from '../../src/app/core/data/mock/mock-observations';

export interface MockHubUser {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly username: string;
  readonly institution: string;
  readonly role: 'user' | 'admin';
  readonly hubRoles: readonly string[];
  readonly hubCountryCodes: readonly string[];
  readonly typeMedecin: string;
  readonly country: string;
  readonly city: string;
  readonly phone: string;
  readonly bio: string;
  readonly photoURL: string;
  readonly coverPhotoURL: string;
  readonly isCertified: boolean;
  readonly certificationStatus: 'approved';
  readonly lastSeenAt: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface HubMockState {
  readonly authorizedRequests: string[];
  scenarioCompleted: boolean;
}

export const ADMIN_USER: MockHubUser = {
  id: 'e2e-admin',
  email: 'admin.e2e@onehealth.test',
  firstName: 'Amina',
  lastName: 'Test',
  username: 'amina.e2e',
  institution: 'CEEAC — environnement E2E',
  role: 'admin',
  hubRoles: ['hub_admin', 'hub_analyst', 'hub_verifier'],
  hubCountryCodes: ['CM', 'TD', 'GA'],
  typeMedecin: 'Épidémiologiste',
  country: 'Cameroun',
  city: 'Yaoundé',
  phone: '+237 600000000',
  bio: 'Compte fictif réservé aux tests automatisés.',
  photoURL: '',
  coverPhotoURL: '',
  isCertified: true,
  certificationStatus: 'approved',
  lastSeenAt: '2026-09-27T10:00:00.000Z',
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-09-27T10:00:00.000Z',
};

export const VIEWER_USER: MockHubUser = {
  ...ADMIN_USER,
  id: 'e2e-viewer',
  email: 'viewer.e2e@onehealth.test',
  username: 'viewer.e2e',
  role: 'user',
  hubRoles: ['hub_viewer'],
  hubCountryCodes: ['CM'],
};

const token = 'eyJhbGciOiJub25lIn0.eyJzdWIiOiJlMmUtYWRtaW4ifQ.c2lnbmF0dXJl';

function scenario(completed: boolean, input?: Record<string, string>) {
  const now = '2026-09-27T10:00:00.000Z';
  const configuration = {
    sourceCountryCode: input?.['sourceCountryCode'] ?? 'CM',
    comparisonCountryCode: input?.['comparisonCountryCode'] ?? 'TD',
    dateFrom: input?.['dateFrom'] ?? '2026-09-01',
    dateTo: input?.['dateTo'] ?? '2026-09-27',
    sectors: ['human', 'animal', 'environment'],
    sourceSystems: ['DHIS2', 'ARIS 3', 'CAPC-AC'],
    analysisType: 'CROSS_SECTOR_CONVERGENCE',
  };
  return {
    scenarioCode: 'SCN-CM-TD-E2E',
    title: 'Convergence zoonotique Cameroun–Tchad',
    description: 'Simulation E2E multisectorielle.',
    status: completed ? 'COMPLETED' : 'READY',
    configuration,
    steps: ['CAPC', 'ARIS', 'DHIS2', 'NORMALIZE', 'CORRELATE', 'SIGNAL'].map((code) => ({
      code,
      label: `Étape ${code}`,
      status: completed ? 'COMPLETED' : 'PENDING',
      completedAt: completed ? now : null,
    })),
    observationIds: completed ? ['E2E-OBS-1', 'E2E-OBS-2', 'E2E-OBS-3', 'E2E-OBS-4'] : [],
    signalCode: completed ? 'SIG-E2E-1' : null,
    eventCode: completed ? 'EVT-E2E-1' : null,
    initiatedBy: completed ? ADMIN_USER.id : null,
    startedAt: completed ? now : null,
    completedAt: completed ? now : null,
    reportAvailable: completed,
    reportId: completed ? 'SIM-SCN-CM-TD-E2E' : null,
    simulated: true,
  };
}

function scenarioReport() {
  const current = scenario(true);
  return {
    reportId: 'SIM-SCN-CM-TD-E2E',
    reportType: 'SIMULATION',
    scenarioCode: current.scenarioCode,
    title: 'Rapport de simulation Cameroun–Tchad',
    executiveSummary: 'Une convergence fictive a été détectée entre les trois secteurs.',
    objective: 'Valider le parcours opérationnel du Hub sans donnée sanitaire réelle.',
    configuration: current.configuration,
    countries: [
      { countryCode: 'CM', countryName: 'Cameroun' },
      { countryCode: 'TD', countryName: 'Tchad' },
    ],
    sectors: ['human', 'animal', 'environment'],
    sourceSystems: ['DHIS2', 'ARIS 3', 'CAPC-AC'],
    observationCount: 4,
    signalCount: 1,
    eventCount: 1,
    confidenceScore: 0.91,
    findings: ['Rapprochement fictif dans la fenêtre spatio-temporelle configurée.'],
    recommendations: ['Faire vérifier le signal par un expert habilité.'],
    limitations: ['Données entièrement simulées pour les tests E2E.'],
    chronology: current.steps,
    observationIds: current.observationIds,
    signalCode: current.signalCode,
    eventCode: current.eventCode,
    generatedAt: '2026-09-27T10:00:00.000Z',
    official: false,
    simulated: true,
  };
}

async function json(route: Route, body: unknown, status = 200): Promise<void> {
  await route.fulfill({
    status,
    contentType: 'application/json; charset=utf-8',
    headers: { 'cache-control': 'no-store' },
    body: JSON.stringify(body),
  });
}

export async function installHubApiMocks(
  page: Page,
  user: MockHubUser = ADMIN_USER,
): Promise<HubMockState> {
  const state: HubMockState = { authorizedRequests: [], scenarioCompleted: false };

  await page.route(/https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/, (route) => route.abort());
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const authorization = request.headers()['authorization'];
    if (authorization === `Bearer ${token}`) state.authorizedRequests.push(path);

    if (path === '/api/auth/login' && request.method() === 'POST') {
      return json(route, { accessToken: token, tokenType: 'Bearer', expiresIn: '15m', user });
    }
    if (path === '/api/auth/me') return json(route, user);
    if (path === '/api/auth/logout') return route.fulfill({ status: 204 });
    if (path === '/api/users/me' && request.method() === 'PATCH') {
      return json(route, { ...user, ...(request.postDataJSON() as object) });
    }

    if (path === '/api/hub/observations') {
      const search = (url.searchParams.get('search') ?? '').toLocaleLowerCase('fr');
      const countryCode = url.searchParams.get('countryCode');
      const sector = url.searchParams.get('sector');
      const stage = url.searchParams.get('stage');
      const view = url.searchParams.get('view');
      const pageNumber = Math.max(1, Number(url.searchParams.get('page') ?? 1));
      const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 100)));
      const filtered = MOCK_ONE_HEALTH_OBSERVATIONS.filter((item) =>
        (!countryCode || item.countryCode === countryCode) &&
        (!sector || item.sector === sector) &&
        (!stage || item.stage === stage) &&
        (view !== 'priority' || item.stage !== 'observation') &&
        (!search || `${item.title} ${item.countryName} ${item.adminArea}`.toLocaleLowerCase('fr').includes(search)),
      );
      const offset = (pageNumber - 1) * limit;
      return json(route, {
        items: filtered.slice(offset, offset + limit),
        total: filtered.length,
        page: pageNumber,
        limit,
        pages: Math.ceil(filtered.length / limit),
      });
    }
    if (path === '/api/hub/summary') {
      return json(route, {
        total: MOCK_ONE_HEALTH_OBSERVATIONS.length,
        byStage: {
          observation: MOCK_ONE_HEALTH_OBSERVATIONS.filter((item) => item.stage === 'observation').length,
          signal: MOCK_ONE_HEALTH_OBSERVATIONS.filter((item) => item.stage === 'signal').length,
          'verified-alert': MOCK_ONE_HEALTH_OBSERVATIONS.filter((item) => item.stage === 'verified-alert').length,
        },
        simulated: true,
      });
    }
    if (path === '/api/hub/decisions') return json(route, { items: [], total: 0 });
    if (path === '/api/hub/events') return json(route, { items: [], total: 0 });
    if (path === '/api/hub/demo/scenario/run' && request.method() === 'POST') {
      state.scenarioCompleted = true;
      await new Promise((resolve) => setTimeout(resolve, 180));
      return json(route, scenario(true, request.postDataJSON() as Record<string, string>));
    }
    if (path === '/api/hub/demo/scenario') return json(route, scenario(state.scenarioCompleted));
    if (path === '/api/hub/demo/scenarios/SCN-CM-TD-E2E/report') {
      return json(route, scenarioReport());
    }
    if (path === '/api/hub/ai/assistant') {
      return json(route, {
        content: '## Synthèse E2E\n\nLes données autorisées couvrent les trois secteurs One Health.',
        mode: 'assistant',
        model: 'mock-e2e',
        generatedAt: '2026-09-27T10:00:00.000Z',
        sourceIds: ['E2E-OBS-1'],
        humanValidationRequired: true,
      });
    }
    if (path === '/api/hub/connectors/summary') {
      return json(route, {
        total: 1,
        countries: 1,
        sectors: [{ sector: 'human', total: 1, availabilityPercent: 99, operational: 1, degraded: 0, error: 0, suspended: 0 }],
        statuses: { operational: 1, degraded: 0, error: 0, suspended: 0 },
        simulated: true,
      });
    }
    if (path === '/api/hub/connectors') {
      const connector = {
        id: 'CON-E2E-CM-DHIS2', countryCode: 'CM', countryName: 'Cameroun', institution: 'Ministère test', sector: 'human', sourceSystem: 'DHIS2', protocol: 'API_REST', endpointAlias: 'dhis2-test', status: 'operational', availabilityPercent: 99, lastSyncAt: '2026-09-27T09:00:00.000Z', lastSuccessAt: '2026-09-27T09:00:00.000Z', nextSyncAt: '2026-09-27T11:00:00.000Z', volume: { received: 55, accepted: 55, rejected: 0, duplicates: 0 }, lastDurationMs: 120, error: null, enabled: true, simulated: true,
      };
      return json(route, { items: [connector], total: 1, page: 1, limit: 100, pages: 1, simulated: true });
    }
    if (path === '/api/hub/sharing-policies') {
      return json(route, { items: [{ policyId: 'POL-E2E-CM', countryOwner: 'CM', sharingLevel: 'OWNER_AND_CEEAC', allowedRoles: ['hub_admin', 'hub_analyst'], allowedCountries: [], aggregationLevel: 'COUNTRY', retentionPeriodDays: 365, containsPersonalData: false, updatedAt: '2026-09-27T10:00:00.000Z', simulated: true }], total: 1, simulated: true });
    }
    if (path === '/api/admin/users') {
      return json(route, { items: [{ ...user, isBanned: false }], total: 1, page: 1, limit: 20 });
    }

    return json(route, { message: `Route E2E non simulée : ${request.method()} ${path}` }, 503);
  });

  return state;
}

export async function loginThroughUi(page: Page): Promise<void> {
  await page.goto('/connexion', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Adresse e-mail').fill('admin.e2e@onehealth.test');
  await page.locator('input[formcontrolname="password"]').fill('MotDePasse-E2E-2026');
  await page.getByRole('button', { name: 'Accéder au Hub' }).click();
  await page.waitForURL('**/dashboard');
}
