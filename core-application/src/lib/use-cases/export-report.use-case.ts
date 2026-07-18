import type { FileSystemPort } from '../ports/file-system.port';
import type { HtmlReportPort } from '../ports/html-report.port';

export interface ExportReportInput {
  backendPath: string;
  outputPath?: string;
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

    if (!this.fs.exists(reportPath)) {
      throw new ExportReportError(
        `Report not found: ${reportPath}. Run 'run' first.`,
      );
    }

    this.htmlReport.export(reportPath, outputPath);
    return outputPath;
  }
}
