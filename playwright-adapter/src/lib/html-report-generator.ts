import * as fs from 'fs';
import type { TestReport, TestResult, TestDelta } from '@ai-web-qa-tester/core-domain';
import type { HtmlReportPort, ReportOptions } from '@ai-web-qa-tester/core-application';

export class HtmlReportGenerator implements HtmlReportPort {
  export(reportJsonPath: string, outputPath: string, options?: ReportOptions): void {
    const raw = fs.readFileSync(reportJsonPath, 'utf-8');
    const report = JSON.parse(raw) as TestReport;
    if (options?.delta) report.delta = options.delta;
    fs.writeFileSync(outputPath, this.buildHtml(report, options), 'utf-8');
  }

  private buildHtml(report: TestReport, options?: ReportOptions): string {
    const { summary, results, generatedAt, baseUrl, delta } = report;
    const passRate =
      summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0;
    const date = new Date(generatedAt).toLocaleString();
    const title = options?.title ?? 'QA Test Report';
    const rows = results.map((r, i) => this.buildRow(r, i)).join('');
    const deltaHtml = delta ? this.buildDelta(delta) : '';
    const logoHtml = options?.logoUrl
      ? `<img src="${this.esc(options.logoUrl)}" alt="logo" class="logo">`
      : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.esc(title)}</title>
  <style>${this.css()}</style>
</head>
<body>
  <header>
    <div class="header-content">
      <div class="header-left">
        ${logoHtml}
        <h1>${this.esc(title)}</h1>
      </div>
      <div class="meta">
        <span>${this.esc(baseUrl)}</span>
        <span>Generated: ${date}</span>
      </div>
    </div>
  </header>
  <main>
    <div class="cards">
      <div class="card total"><div class="num">${summary.total}</div><div class="lbl">Total</div></div>
      <div class="card passed"><div class="num">${summary.passed}</div><div class="lbl">Passed</div></div>
      <div class="card failed"><div class="num">${summary.failed}</div><div class="lbl">Failed</div></div>
      <div class="card skipped"><div class="num">${summary.skipped}</div><div class="lbl">Skipped</div></div>
    </div>
    <div class="progress-section">
      <div class="progress-label">${passRate}% passed</div>
      <div class="progress-bar">
        <div class="progress-fill${passRate === 0 ? ' zero' : ''}" style="width:${passRate}%"></div>
      </div>
    </div>
    ${deltaHtml}
    <table>
      <thead>
        <tr><th>Method</th><th>Title</th><th>Status</th><th>Duration</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </main>
  <script>${this.js()}</script>
</body>
</html>`;
  }

  private buildDelta(delta: TestDelta): string {
    const prevDate = new Date(delta.previousRun).toLocaleString();
    const items: string[] = [];

    if (delta.newFailures.length > 0) {
      items.push(`
        <div class="delta-group">
          <span class="delta-badge regression">&#9660; ${delta.newFailures.length} new failure${delta.newFailures.length > 1 ? 's' : ''}</span>
          <ul>${delta.newFailures.map((t) => `<li>${this.esc(t)}</li>`).join('')}</ul>
        </div>`);
    }

    if (delta.fixed.length > 0) {
      items.push(`
        <div class="delta-group">
          <span class="delta-badge fixed">&#9650; ${delta.fixed.length} fixed</span>
          <ul>${delta.fixed.map((t) => `<li>${this.esc(t)}</li>`).join('')}</ul>
        </div>`);
    }

    if (delta.newSkipped.length > 0) {
      items.push(`
        <div class="delta-group">
          <span class="delta-badge skipped">&#8212; ${delta.newSkipped.length} newly skipped</span>
          <ul>${delta.newSkipped.map((t) => `<li>${this.esc(t)}</li>`).join('')}</ul>
        </div>`);
    }

    if (items.length === 0) {
      items.push('<p class="delta-no-change">No changes vs previous run</p>');
    }

    return `
    <div class="delta-section">
      <div class="delta-header">Delta vs <span class="delta-prev-date">${prevDate}</span></div>
      <div class="delta-body">${items.join('')}</div>
    </div>`;
  }

  private buildRow(r: TestResult, i: number): string {
    const icon = r.status === 'passed' ? '✓' : r.status === 'failed' ? '✗' : '─';
    const hasError = r.status === 'failed' && r.error;
    const errorText = hasError ? this.esc(this.stripAnsi(r.error!)) : '';
    const clickAttr = hasError
      ? ` onclick="toggle(${i})" class="result-row ${r.status} expandable"`
      : ` class="result-row ${r.status}"`;

    return `
      <tr${clickAttr}>
        <td><span class="method m-${r.method.toLowerCase()}">${r.method}</span></td>
        <td class="title">${this.esc(r.title)}</td>
        <td><span class="badge ${r.status}">${icon} ${r.status.toUpperCase()}</span></td>
        <td class="dur">${r.durationMs}ms</td>
      </tr>${hasError ? `
      <tr class="err-row" id="err-${i}">
        <td colspan="4"><pre class="err-msg">${errorText}</pre></td>
      </tr>` : ''}`;
  }

  private stripAnsi(str: string): string {
    return str.replace(/\u001b\[[0-9;]*m/g, '');
  }

  private esc(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private css(): string {
    return `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,sans-serif;background:#f5f7fa;color:#1e293b;line-height:1.5}
header{background:linear-gradient(135deg,#1e1b4b,#312e81);color:#fff;padding:24px 32px}
.header-content{max-width:960px;margin:0 auto;display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap}
.header-left{display:flex;align-items:center;gap:14px}
.logo{height:40px;width:auto;border-radius:6px}
header h1{font-size:1.5rem;font-weight:700;letter-spacing:-.02em}
.meta{display:flex;flex-direction:column;gap:4px;font-size:.82rem;opacity:.7;text-align:right}
main{max-width:960px;margin:32px auto;padding:0 16px}
.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}
.card{background:#fff;border-radius:12px;padding:20px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.08),0 4px 12px rgba(0,0,0,.04)}
.card .num{font-size:2.4rem;font-weight:800;letter-spacing:-.03em}
.card .lbl{font-size:.72rem;color:#94a3b8;margin-top:4px;text-transform:uppercase;letter-spacing:.06em;font-weight:600}
.card.total .num{color:#6366f1}
.card.passed .num{color:#16a34a}
.card.failed .num{color:#dc2626}
.card.skipped .num{color:#94a3b8}
.progress-section{margin-bottom:24px}
.progress-label{font-size:.88rem;color:#64748b;margin-bottom:8px;font-weight:500}
.progress-bar{height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden}
.progress-fill{height:100%;background:linear-gradient(90deg,#16a34a,#22c55e);border-radius:4px;min-width:0;transition:width .6s ease}
.progress-fill.zero{background:#dc2626}
.delta-section{background:#fff;border-radius:12px;padding:20px 24px;margin-bottom:24px;box-shadow:0 1px 3px rgba(0,0,0,.08),0 4px 12px rgba(0,0,0,.04);border-left:4px solid #6366f1}
.delta-header{font-size:.8rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin-bottom:14px}
.delta-prev-date{font-weight:400;text-transform:none;letter-spacing:0;color:#94a3b8}
.delta-body{display:flex;flex-wrap:wrap;gap:20px}
.delta-group ul{margin-top:8px;padding-left:18px;font-size:.82rem;color:#475569}
.delta-group li{margin-bottom:2px}
.delta-badge{display:inline-block;padding:3px 10px;border-radius:10px;font-size:.75rem;font-weight:700}
.delta-badge.regression{background:#fee2e2;color:#b91c1c}
.delta-badge.fixed{background:#dcfce7;color:#15803d}
.delta-badge.skipped{background:#f1f5f9;color:#64748b}
.delta-no-change{font-size:.85rem;color:#94a3b8;font-style:italic}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08),0 4px 12px rgba(0,0,0,.04)}
thead th{background:#f8fafc;padding:11px 16px;text-align:left;font-size:.72rem;text-transform:uppercase;letter-spacing:.06em;color:#64748b;border-bottom:1px solid #e2e8f0;font-weight:600}
.result-row td{padding:11px 16px;border-bottom:1px solid #f1f5f9;vertical-align:middle;transition:background .15s}
.result-row.passed{border-left:3px solid #16a34a}
.result-row.failed{border-left:3px solid #dc2626}
.result-row.skipped{border-left:3px solid #94a3b8;opacity:.65}
.result-row.expandable{cursor:pointer}
.result-row.expandable:hover td{background:#f8fafc}
.method{display:inline-block;padding:2px 8px;border-radius:4px;font-size:.7rem;font-weight:700;font-family:ui-monospace,monospace}
.m-get{background:#dbeafe;color:#1d4ed8}
.m-post{background:#dcfce7;color:#15803d}
.m-put{background:#fef9c3;color:#854d0e}
.m-patch{background:#fef3c7;color:#92400e}
.m-delete{background:#fee2e2;color:#b91c1c}
.badge{display:inline-flex;align-items:center;gap:4px;padding:2px 10px;border-radius:10px;font-size:.72rem;font-weight:700}
.badge.passed{background:#dcfce7;color:#15803d}
.badge.failed{background:#fee2e2;color:#b91c1c}
.badge.skipped{background:#f1f5f9;color:#64748b}
.title{font-size:.85rem;color:#334155}
.dur{font-family:ui-monospace,monospace;font-size:.8rem;color:#94a3b8}
.err-row{display:none}
.err-row.open{display:table-row}
.err-msg{background:#fff1f2;color:#9f1239;padding:14px 18px;font-size:.78rem;line-height:1.7;white-space:pre-wrap;border-radius:4px;margin:0}
@media(max-width:640px){.cards{grid-template-columns:repeat(2,1fr)}.header-content{flex-direction:column}.meta{text-align:left}}
@media(prefers-color-scheme:dark){
  body{background:#0f172a;color:#e2e8f0}
  header{background:linear-gradient(135deg,#1e1b4b,#1e293b)}
  .card,.delta-section,table{background:#1e293b;box-shadow:0 1px 3px rgba(0,0,0,.3)}
  .card .lbl,.progress-label,.delta-header,.meta{color:#94a3b8}
  .delta-prev-date{color:#64748b}
  .delta-group ul{color:#94a3b8}
  .delta-badge.regression{background:#450a0a;color:#fca5a5}
  .delta-badge.fixed{background:#052e16;color:#86efac}
  .delta-badge.skipped{background:#1e293b;color:#64748b}
  .progress-bar{background:#334155}
  thead th{background:#0f172a;color:#64748b;border-color:#334155}
  .result-row td{border-color:#1e293b}
  .result-row.expandable:hover td{background:#0f172a}
  .title{color:#cbd5e1}
  .dur{color:#64748b}
  .m-get{background:#1e3a5f;color:#93c5fd}
  .m-post{background:#052e16;color:#86efac}
  .m-put{background:#422006;color:#fcd34d}
  .m-patch{background:#431407;color:#fbbf24}
  .m-delete{background:#450a0a;color:#fca5a5}
  .badge.passed{background:#052e16;color:#86efac}
  .badge.failed{background:#450a0a;color:#fca5a5}
  .badge.skipped{background:#1e293b;color:#64748b}
  .err-msg{background:#2d0a0a;color:#fca5a5}
}`;
  }

  private js(): string {
    return `function toggle(i){var r=document.getElementById('err-'+i);if(r)r.classList.toggle('open')}`;
  }
}
