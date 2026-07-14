import type { TestSpec } from '@ai-web-qa-tester/core-domain';

export interface AiEnricherPort {
  enrich(spec: TestSpec): Promise<Partial<TestSpec>>;
}
