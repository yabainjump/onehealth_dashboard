import { HubScenarioReportApi } from '../../core/data/hub-api.service';

const SECTOR_LABELS: Readonly<Record<HubScenarioReportApi['sectors'][number], string>> = {
  human: 'Santé humaine',
  animal: 'Santé animale',
  environment: 'Climat et environnement',
};

export function scenarioReportFilename(report: HubScenarioReportApi): string {
  return `${report.reportId}-${report.generatedAt.slice(0, 10)}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function renderScenarioReportHtml(report: HubScenarioReportApi): string {
  const date = new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(report.generatedAt));
  const list = (items: readonly string[], ordered = false) => {
    const tag = ordered ? 'ol' : 'ul';
    return `<${tag}>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</${tag}>`;
  };
  const traceRows = [
    ['Scénario', report.scenarioCode],
    ['Événement', report.eventCode],
    ['Signal', report.signalCode],
    ['Observations', report.observationIds.join(' · ')],
  ]
    .map(
      ([label, value]) =>
        `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`,
    )
    .join('');
  const chronology = report.chronology
    .map(
      (step, index) =>
        `<li><b>${index + 1}. ${escapeHtml(step.label)}</b><span>${escapeHtml(step.status)}</span></li>`,
    )
    .join('');

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(report.title)}</title><style>
*{box-sizing:border-box}body{max-width:980px;margin:0 auto;padding:42px;color:#17253a;font:15px/1.6 Arial,sans-serif;background:#fff}header{padding:28px;border-radius:18px;background:linear-gradient(135deg,#062d66,#0b5fa7);color:#fff}header small{font-weight:700;letter-spacing:.08em;text-transform:uppercase}h1{margin:10px 0 8px;font-size:30px;line-height:1.2}h2{margin:30px 0 12px;font-size:19px;color:#073b76}.badge{display:inline-block;padding:6px 10px;border-radius:99px;background:#fff0d9;color:#854d0e;font-weight:700}.summary{font-size:17px}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:22px 0}.metric{padding:16px;border:1px solid #dbe5f1;border-radius:12px}.metric b{display:block;color:#0756a0;font-size:25px}.timeline{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;padding:0;list-style:none}.timeline li{display:flex;justify-content:space-between;gap:12px;padding:12px;border:1px solid #dbe5f1;border-radius:10px}.timeline span{color:#167a57;font-size:12px;font-weight:700}.notice{padding:17px;border-left:4px solid #db8b21;background:#fff8e9}.trace{width:100%;border-collapse:collapse}.trace th,.trace td{padding:10px;border-bottom:1px solid #e2e8f0;text-align:left;vertical-align:top}.trace th{width:130px;color:#52627a}.trace td{overflow-wrap:anywhere}footer{margin-top:34px;padding-top:16px;border-top:1px solid #dbe5f1;color:#607089;font-size:12px}@media(max-width:640px){body{padding:18px}.metrics,.timeline{grid-template-columns:1fr 1fr}h1{font-size:24px}}@media print{body{padding:0}@page{margin:14mm}header{print-color-adjust:exact}.metrics{break-inside:avoid}}
</style></head><body><header><small>One Health Convergence Hub · CEEAC</small><h1>${escapeHtml(report.title)}</h1><span class="badge">Simulation · Non officiel</span><p>${escapeHtml(report.objective)}</p></header><section class="metrics"><div class="metric"><b>${report.observationCount}</b>Observations</div><div class="metric"><b>${report.sourceSystems.length}</b>Sources</div><div class="metric"><b>${report.countries.length}</b>Pays</div><div class="metric"><b>${Math.round(report.confidenceScore * 100)} %</b>Confiance du signal</div></section><h2>Synthèse exécutive</h2><p class="summary">${escapeHtml(report.executiveSummary)}</p><h2>Chronologie de traitement</h2><ol class="timeline">${chronology}</ol><h2>Constats de la simulation</h2>${list(report.findings)}<h2>Actions proposées</h2>${list(report.recommendations, true)}<h2>Traçabilité</h2><table class="trace">${traceRows}<tr><th>Sources</th><td>${escapeHtml(report.sourceSystems.join(' · '))}</td></tr><tr><th>Secteurs</th><td>${escapeHtml(report.sectors.map((sector) => SECTOR_LABELS[sector]).join(' · '))}</td></tr></table><h2>Limites et gouvernance</h2><div class="notice"><strong>Validation humaine obligatoire.</strong>${list(report.limitations)}</div><footer>Généré le ${escapeHtml(date)} · ${escapeHtml(report.reportId)} · Données fictives de démonstration</footer></body></html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
