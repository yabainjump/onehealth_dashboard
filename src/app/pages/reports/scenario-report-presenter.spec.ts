import { HubScenarioReportApi } from '../../core/data/hub-api.service';
import {
  renderScenarioReportHtml,
  scenarioReportFilename,
} from './scenario-report-presenter';

const report: HubScenarioReportApi = {
  reportId: 'SIM-SCN-CM-TD-CONVERGENCE-01',
  reportType: 'SIMULATION',
  scenarioCode: 'SCN-CM-TD-CONVERGENCE-01',
  title: 'Rapport <script>alert(1)</script>',
  executiveSummary: 'Synthèse intersectorielle.',
  objective: 'Démontrer le Hub.',
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
  findings: ['Constat fictif.'],
  recommendations: ['Vérifier humainement.'],
  limitations: ['Données fictives.'],
  chronology: [
    {
      code: 'INGEST',
      label: 'Ingestion',
      status: 'COMPLETED',
      completedAt: '2026-09-23T10:00:00.000Z',
    },
  ],
  observationIds: ['OBS-1'],
  signalCode: 'SIG-1',
  eventCode: 'EVT-1',
  generatedAt: '2026-09-23T10:00:00.000Z',
  official: false,
  simulated: true,
};

describe('scenario report presenter', () => {
  it('keeps the simulation warning in the exported document and escapes API text', () => {
    const html = renderScenarioReportHtml(report);

    expect(html).toContain('Simulation · Non officiel');
    expect(html).toContain('Validation humaine obligatoire');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
  });

  it('builds a stable safe filename', () => {
    expect(scenarioReportFilename(report)).toBe(
      'sim-scn-cm-td-convergence-01-2026-09-23',
    );
  });
});
