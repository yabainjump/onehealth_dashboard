import {
  HealthSector,
  OneHealthObservation,
  SourceSystem,
} from '../../core/data/models/one-health-observation.model';

export type ReportScope = 'regional' | 'country' | 'sector';
export type ReportRisk = 'stable' | 'watch' | 'priority';

export interface HubReport {
  readonly id: string;
  readonly scope: ReportScope;
  readonly risk: ReportRisk;
  readonly title: string;
  readonly description: string;
  readonly countryCode: string | null;
  readonly countryName: string;
  readonly sector: HealthSector | null;
  readonly periodDays: 30 | 90;
  readonly periodLabel: string;
  readonly generatedAt: string;
  readonly dateFrom: string;
  readonly dateTo: string;
  readonly observationCount: number;
  readonly signalCount: number;
  readonly verifiedAlertCount: number;
  readonly priorityCount: number;
  readonly countryCount: number;
  readonly sectors: readonly HealthSector[];
  readonly sources: readonly SourceSystem[];
  readonly findings: readonly string[];
  readonly recommendations: readonly string[];
  readonly simulated: boolean;
}

export const REPORT_SCOPE_LABELS: Readonly<Record<ReportScope, string>> = {
  regional: 'Situation régionale',
  country: 'Note pays',
  sector: 'Veille sectorielle',
};

export const REPORT_RISK_LABELS: Readonly<Record<ReportRisk, string>> = {
  stable: 'Surveillance courante',
  watch: 'Points à vérifier',
  priority: 'Attention prioritaire',
};

export const REPORT_SECTOR_LABELS: Readonly<Record<HealthSector, string>> = {
  human: 'Santé humaine',
  animal: 'Santé animale',
  environment: 'Climat et environnement',
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function buildReportLibrary(
  observations: readonly OneHealthObservation[],
): readonly HubReport[] {
  if (!observations.length) return [];

  const referenceTime = Math.max(
    ...observations
      .map((observation) => new Date(observation.observedAt).getTime())
      .filter(Number.isFinite),
  );
  const reports: HubReport[] = [];

  reports.push(
    buildReport('regional-30', 'regional', observations, referenceTime, 30, null, null),
    buildReport('regional-90', 'regional', observations, referenceTime, 90, null, null),
  );

  const countries = [
    ...new Map(
      observations.map((observation) => [observation.countryCode, observation.countryName]),
    ).entries(),
  ].sort((left, right) => left[1].localeCompare(right[1], 'fr'));
  for (const [countryCode, countryName] of countries) {
    reports.push(
      buildReport(
        `country-${countryCode.toLowerCase()}-90`,
        'country',
        observations,
        referenceTime,
        90,
        { code: countryCode, name: countryName },
        null,
      ),
    );
  }

  for (const sector of ['human', 'animal', 'environment'] as const) {
    reports.push(
      buildReport(
        `sector-${sector}-30`,
        'sector',
        observations,
        referenceTime,
        30,
        null,
        sector,
      ),
    );
  }

  return reports.sort(
    (left, right) =>
      riskOrder(right.risk) - riskOrder(left.risk) ||
      left.title.localeCompare(right.title, 'fr'),
  );
}

function buildReport(
  id: string,
  scope: ReportScope,
  observations: readonly OneHealthObservation[],
  referenceTime: number,
  periodDays: 30 | 90,
  country: { readonly code: string; readonly name: string } | null,
  sector: HealthSector | null,
): HubReport {
  const minimumTime = referenceTime - periodDays * DAY_MS;
  const scoped = observations.filter((observation) => {
    const observedAt = new Date(observation.observedAt).getTime();
    return (
      observedAt >= minimumTime &&
      (!country || observation.countryCode === country.code) &&
      (!sector || observation.sector === sector)
    );
  });
  const signalCount = scoped.filter((item) => item.stage === 'signal').length;
  const verifiedAlertCount = scoped.filter((item) => item.stage === 'verified-alert').length;
  const priorityCount = scoped.filter(
    (item) => item.severity === 'high' || item.severity === 'critical',
  ).length;
  const sectors = [...new Set(scoped.map((item) => item.sector))];
  const sources = [...new Set(scoped.map((item) => item.sourceSystem))];
  const countryCount = new Set(scoped.map((item) => item.countryCode)).size;
  const risk: ReportRisk = verifiedAlertCount > 0 ? 'priority' : signalCount > 0 ? 'watch' : 'stable';
  const dateTimes = scoped
    .map((item) => new Date(item.observedAt).getTime())
    .filter(Number.isFinite);
  const dateFrom = new Date(dateTimes.length ? Math.min(...dateTimes) : minimumTime).toISOString();
  const dateTo = new Date(dateTimes.length ? Math.max(...dateTimes) : referenceTime).toISOString();
  const title = reportTitle(scope, periodDays, country?.name ?? '', sector);

  return {
    id,
    scope,
    risk,
    title,
    description: reportDescription(scope, country?.name ?? '', sector),
    countryCode: country?.code ?? null,
    countryName: country?.name ?? 'CEEAC',
    sector,
    periodDays,
    periodLabel: periodDays === 30 ? '30 derniers jours' : '90 derniers jours',
    generatedAt: new Date().toISOString(),
    dateFrom,
    dateTo,
    observationCount: scoped.length,
    signalCount,
    verifiedAlertCount,
    priorityCount,
    countryCount,
    sectors,
    sources,
    findings: buildFindings(scoped, signalCount, verifiedAlertCount, priorityCount),
    recommendations: buildRecommendations(
      signalCount,
      verifiedAlertCount,
      priorityCount,
      sectors.length,
    ),
    simulated: scoped.every((item) => item.simulated),
  };
}

function reportTitle(
  scope: ReportScope,
  periodDays: 30 | 90,
  countryName: string,
  sector: HealthSector | null,
): string {
  if (scope === 'country') return `Note de situation · ${countryName}`;
  if (scope === 'sector' && sector) return `Veille · ${REPORT_SECTOR_LABELS[sector]}`;
  return periodDays === 30
    ? 'Bulletin régional One Health'
    : 'Analyse régionale trimestrielle';
}

function reportDescription(
  scope: ReportScope,
  countryName: string,
  sector: HealthSector | null,
): string {
  if (scope === 'country') {
    return `Synthèse multisectorielle des observations disponibles pour ${countryName}.`;
  }
  if (scope === 'sector' && sector) {
    return `Lecture régionale consolidée du flux ${REPORT_SECTOR_LABELS[sector].toLowerCase()}.`;
  }
  return 'Synthèse consolidée des flux de santé humaine, animale et environnementale.';
}

function buildFindings(
  observations: readonly OneHealthObservation[],
  signalCount: number,
  verifiedAlertCount: number,
  priorityCount: number,
): readonly string[] {
  const countries = new Set(observations.map((item) => item.countryCode));
  const sectors = new Set(observations.map((item) => item.sector));
  const countryVolumes = new Map<string, { name: string; count: number }>();
  for (const observation of observations) {
    const current = countryVolumes.get(observation.countryCode) ?? {
      name: observation.countryName,
      count: 0,
    };
    current.count += 1;
    countryVolumes.set(observation.countryCode, current);
  }
  const leadingCountry = [...countryVolumes.values()].sort(
    (left, right) => right.count - left.count,
  )[0];
  const findings = [
    `${observations.length} observations consolidées dans ${countries.size} pays et ${sectors.size} secteurs.`,
    `${signalCount} signaux à vérifier et ${verifiedAlertCount} alertes vérifiées figurent dans la période.`,
    `${priorityCount} dossiers présentent une gravité haute ou critique.`,
  ];
  if (leadingCountry) {
    findings.push(
      `${leadingCountry.name} présente le volume documentaire le plus élevé avec ${leadingCountry.count} dossiers.`,
    );
  }
  return findings;
}

function buildRecommendations(
  signalCount: number,
  verifiedAlertCount: number,
  priorityCount: number,
  sectorCount: number,
): readonly string[] {
  const recommendations: string[] = [];
  if (signalCount) {
    recommendations.push(
      `Prioriser la vérification humaine des ${signalCount} signaux avant toute diffusion institutionnelle.`,
    );
  }
  if (verifiedAlertCount) {
    recommendations.push(
      `Soumettre les ${verifiedAlertCount} alertes vérifiées au circuit de validation et de coordination CEEAC.`,
    );
  }
  if (priorityCount) {
    recommendations.push(
      `Documenter les mesures de suivi des ${priorityCount} dossiers de gravité haute ou critique.`,
    );
  }
  if (sectorCount < 3) {
    recommendations.push(
      'Rechercher les données des secteurs manquants avant de conclure à une convergence One Health.',
    );
  } else {
    recommendations.push(
      'Maintenir le croisement humain–animal–environnement et l’analyse par les experts mandatés.',
    );
  }
  return recommendations;
}

export function renderReportHtml(report: HubReport, dataModeLabel: string): string {
  const dateFormatter = new Intl.DateTimeFormat('fr', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const date = (value: string) => dateFormatter.format(new Date(value));
  const list = (items: readonly string[]) =>
    items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${escapeHtml(report.title)}</title><style>
body{font-family:Arial,sans-serif;color:#17253a;max-width:920px;margin:0 auto;padding:42px;line-height:1.55}header{border-bottom:3px solid #0f4b95;padding-bottom:18px}small{color:#5d6b7f}h1{color:#0b3d7b;margin:8px 0}h2{font-size:18px;margin-top:30px}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:24px 0}.metric{padding:14px;border:1px solid #dce3ed;border-radius:8px}.metric b{display:block;font-size:24px;color:#0b3d7b}.notice{margin-top:30px;padding:14px;background:#fff6e8;border-left:4px solid #e86d12}footer{margin-top:40px;padding-top:16px;border-top:1px solid #dce3ed;color:#5d6b7f;font-size:12px}@media print{body{padding:0}@page{margin:16mm}}
</style></head><body><header><small>ONE HEALTH CONVERGENCE HUB · ${escapeHtml(REPORT_SCOPE_LABELS[report.scope])}</small>
<h1>${escapeHtml(report.title)}</h1><p>${escapeHtml(report.description)}</p>
<small>Période : ${escapeHtml(report.periodLabel)} · ${date(report.dateFrom)} au ${date(report.dateTo)}</small></header>
<section class="metrics"><div class="metric"><b>${report.observationCount}</b>Observations</div><div class="metric"><b>${report.signalCount}</b>Signaux</div><div class="metric"><b>${report.verifiedAlertCount}</b>Alertes vérifiées</div><div class="metric"><b>${report.countryCount}</b>Pays couverts</div></section>
<h2>Constats descriptifs</h2><ul>${list(report.findings)}</ul><h2>Actions proposées</h2><ol>${list(report.recommendations)}</ol>
<div class="notice"><strong>Validation obligatoire.</strong> Cette synthèse est générée automatiquement à partir des données disponibles. Elle ne constitue ni une validation sanitaire, ni une preuve de causalité, ni une instruction opérationnelle.</div>
<footer>Généré le ${date(report.generatedAt)} · ${escapeHtml(dataModeLabel)} · One Health Network / Hub régional CEEAC</footer></body></html>`;
}

export function reportFilename(report: HubReport): string {
  return `${report.title}-${report.periodDays}j`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function riskOrder(risk: ReportRisk): number {
  return risk === 'priority' ? 3 : risk === 'watch' ? 2 : 1;
}
