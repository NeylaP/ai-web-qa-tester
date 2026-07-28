import type { TestDelta } from '@ai-web-qa-tester/core-domain';

export interface ReportOptions {
  title?: string;
  logoUrl?: string;
  delta?: TestDelta;
}

export interface HtmlReportPort {
  export(reportJsonPath: string, outputPath: string, options?: ReportOptions): void;
}
