export type TestResultStatus = 'passed' | 'failed' | 'skipped';

export interface TestResult {
  title: string;
  endpoint: string;
  method: string;
  status: TestResultStatus;
  durationMs: number;
  error?: string;
}

export interface TestDelta {
  previousRun: string;
  newFailures: string[];
  fixed: string[];
  newSkipped: string[];
}

export interface TestReport {
  generatedAt: string;
  baseUrl: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  results: TestResult[];
  delta?: TestDelta;
}
