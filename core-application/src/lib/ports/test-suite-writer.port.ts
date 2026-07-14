import type { TestSuite } from '@ai-web-qa-tester/core-domain';

export interface TestSuiteWriterPort {
  write(suite: TestSuite, backendPath: string, outputDir: string): Promise<void>;
}
