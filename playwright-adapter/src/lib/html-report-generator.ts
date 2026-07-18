import * as fs from 'fs';
import type { TestReport, TestResult } from '@ai-web-qa-tester/core-domain';
import type { HtmlReportPort } from '@ai-web-qa-tester/core-application';

export class HtmlReportGenerator implements HtmlReportPort {
  export(reportJsonPath: string, outputPath: string): void {
    const raw = fs.readFileSync(reportJsonPath, 'utf-8');
    const report = JSON.parse(raw) as TestReport;
    fs.writeFileSync(outputPath, this.buildHtml(report), 'utf-8');
  }

  private buildHtml(report: TestReport): string {
    const { summary, results, generatedAt, baseUrl } = report;
    const passRate =
      summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0;
    const date = new Date(generatedAt).toLocaleString();
    const rows = results.map((r, i) => this.buildRow(r, i)).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QA Test Report</title>
  <style>${this.css()}</style>
</head>
<body>
  <header>
    <div class="header-content">
      <h1>QA Test Report</h1>
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

  private buildRow(r: TestResult, i: number): string {
    const icon = r.status === 'passed' ? '✓' : r.status === 'failed' ? '✗' : '─';
    const hasError = r.status === 'failed' && r.error;
    const errorText = hasError ? this.esc(this.stripAnsi(r.error!)) : '';
    const clickAttr = hasError ? ` onclick="toggle(${i})" class="result-row ${r.status} expandable"` : ` class="result-row ${r.status}"`;

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
body{font-family:system-ui,-apple-system,sans-serif;background:#f5f7fa;color:#333}
header{background:#1a1a2e;color:#fff;padding:24px 32px}
header h1{font-size:1.5rem;margin-bottom:6px}
.meta{display:flex;gap:20px;font-size:.85rem;opacity:.75}
main{max-width:960px;margin:32px auto;padding:0 16px}
.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}
.card{background:#fff;border-radius:10px;padding:20px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.08)}
.card .num{font-size:2.4rem;font-weight:700}
.card .lbl{font-size:.8rem;color:#999;margin-top:4px;text-transform:uppercase;letter-spacing:.05em}
.card.total .num{color:#6366f1}
.card.passed .num{color:#22c55e}
.card.failed .num{color:#ef4444}
.card.skipped .num{color:#94a3b8}
.progress-section{margin-bottom:24px}
.progress-label{font-size:.9rem;color:#555;margin-bottom:8px}
.progress-bar{height:10px;background:#e2e8f0;border-radius:5px;overflow:hidden}
.progress-fill{height:100%;background:#22c55e;border-radius:5px;min-width:0;transition:width .5s}
.progress-fill.zero{background:#ef4444}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}
thead th{background:#f8fafc;padding:12px 16px;text-align:left;font-size:.75rem;text-transform:uppercase;letter-spacing:.05em;color:#64748b;border-bottom:1px solid #e2e8f0}
.result-row td{padding:12px 16px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
.result-row.passed{border-left:4px solid #22c55e}
.result-row.failed{border-left:4px solid #ef4444}
.result-row.skipped{border-left:4px solid #94a3b8;opacity:.7}
.result-row.expandable{cursor:pointer}
.result-row.expandable:hover{background:#f8fafc}
.method{display:inline-block;padding:2px 8px;border-radius:4px;font-size:.72rem;font-weight:700;font-family:monospace}
.m-get{background:#dbeafe;color:#1d4ed8}
.m-post{background:#dcfce7;color:#15803d}
.m-put{background:#fef9c3;color:#854d0e}
.m-patch{background:#fef3c7;color:#92400e}
.m-delete{background:#fee2e2;color:#b91c1c}
.badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:12px;font-size:.75rem;font-weight:600}
.badge.passed{background:#dcfce7;color:#15803d}
.badge.failed{background:#fee2e2;color:#b91c1c}
.badge.skipped{background:#f1f5f9;color:#64748b}
.title{font-size:.88rem}
.dur{font-family:monospace;font-size:.82rem;color:#aaa}
.err-row{display:none}
.err-row.open{display:table-row}
.err-msg{background:#fff1f2;color:#9f1239;padding:14px 18px;font-size:.78rem;line-height:1.7;white-space:pre-wrap;border-radius:4px;margin:0}`;
  }

  private js(): string {
    return `function toggle(i){var r=document.getElementById('err-'+i);if(r)r.classList.toggle('open')}`;
  }
}
