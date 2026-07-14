import type { TestReport } from '@ai-web-qa-tester/core-domain';

export interface TestRunnerInput {
  testDir: string;
  baseUrl: string;
  outputPath: string;
}

export interface TestRunnerPort {
  run(input: TestRunnerInput): Promise<TestReport>;
}
