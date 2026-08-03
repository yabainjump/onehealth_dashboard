import { MOCK_ONE_HEALTH_OBSERVATIONS } from '../../core/data/mock/mock-observations';
import { buildReportLibrary, renderReportHtml, reportFilename } from './report-presenter';

describe('report presenter', () => {
  it('builds regional, country and sector reports from loaded observations', () => {
    const reports = buildReportLibrary(MOCK_ONE_HEALTH_OBSERVATIONS);

    expect(reports.some((report) => report.scope === 'regional')).toBeTrue();
    expect(reports.filter((report) => report.scope === 'country').length).toBe(11);
    expect(reports.filter((report) => report.scope === 'sector').length).toBe(3);
    expect(reports.every((report) => report.observationCount >= 0)).toBeTrue();
  });

  it('renders a standalone report while keeping the validation warning', () => {
    const report = buildReportLibrary(MOCK_ONE_HEALTH_OBSERVATIONS)[0];
    const html = renderReportHtml(report, 'Données fictives de démonstration');

    expect(html).toContain('<!doctype html>');
    expect(html).toContain(report.title);
    expect(html).toContain('Validation obligatoire');
    expect(html).toContain('Données fictives de démonstration');
  });

  it('creates a filesystem-safe report filename', () => {
    const report = buildReportLibrary(MOCK_ONE_HEALTH_OBSERVATIONS)[0];
    expect(reportFilename(report)).toMatch(/^[a-z0-9-]+$/);
  });
});
