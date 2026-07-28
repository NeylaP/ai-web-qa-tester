import type { TestReport, TestDelta } from '@ai-web-qa-tester/core-domain';
import type { FileSystemPort } from '../ports/file-system.port';
import type { HtmlReportPort, ReportOptions } from '../ports/html-report.port';

export interface ExportReportInput {
  backendPath: string;
  outputPath?: string;
  title?: string;
  logoUrl?: string;
}

export class ExportReportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExportReportError';
  }
}

export class ExportReportUseCase {
  constructor(
    private readonly fs: FileSystemPort,
    private readonly htmlReport: HtmlReportPort,
  ) {}

  execute(input: ExportReportInput): string {
    const reportPath = `${input.backendPath}/.qa/test-report.json`;
    const outputPath = input.outputPath ?? `${input.backendPath}/.qa/test-report.html`;
    const historyDir = `${input.backendPath}/.qa/history`;

    if (!this.fs.exists(reportPath)) {
      throw new ExportReportError(
        `Report not found: ${reportPath}. Run 'run' first.`,
      );
    }

    const delta = this.computeDelta(reportPath, historyDir);
    this.archiveCurrent(reportPath, historyDir);

    const options: ReportOptions = {
      title: input.title,
      logoUrl: input.logoUrl,
      ...(delta ? { delta } : {}),
    };

    this.htmlReport.export(reportPath, outputPath, options);
    return outputPath;
  }

  private computeDelta(reportPath: string, historyDir: string): TestDelta | null {
    if (!this.fs.readFile || !this.fs.listFiles || !this.fs.exists(historyDir)) {
      return null;
    }

    const files = this.fs
      .listFiles(historyDir)
      .filter((f) => f.endsWith('.json'))
      .sort();

    if (files.length === 0) return null;

    const current: TestReport = JSON.parse(this.fs.readFile(reportPath));
    const prev: TestReport = JSON.parse(
      this.fs.readFile(`${historyDir}/${files[files.length - 1]}`),
    );

    const prevFailed = new Set(
      prev.results.filter((r) => r.status === 'failed').map((r) => r.title),
    );
    const prevSkipped = new Set(
      prev.results.filter((r) => r.status === 'skipped').map((r) => r.title),
    );

    return {
      previousRun: prev.generatedAt,
      newFailures: current.results
        .filter((r) => r.status === 'failed' && !prevFailed.has(r.title))
        .map((r) => r.title),
      fixed: current.results
        .filter((r) => r.status === 'passed' && prevFailed.has(r.title))
        .map((r) => r.title),
      newSkipped: current.results
        .filter((r) => r.status === 'skipped' && !prevSkipped.has(r.title))
        .map((r) => r.title),
    };
  }

  private archiveCurrent(reportPath: string, historyDir: string): void {
    if (!this.fs.readFile || !this.fs.writeFile || !this.fs.mkdir) return;

    this.fs.mkdir(historyDir);
    const raw = this.fs.readFile(reportPath);
    const { generatedAt } = JSON.parse(raw) as { generatedAt: string };
    const stamp = generatedAt.replace(/[:.]/g, '-').replace(/Z$/, '');
    this.fs.writeFile(`${historyDir}/test-report-${stamp}.json`, raw);
  }
}
