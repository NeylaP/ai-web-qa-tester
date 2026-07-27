import type { TestSpec, ControllerSetup } from '@ai-web-qa-tester/core-domain';

export interface ErrorCaseSpec {
  title: string;
  requestBody: Record<string, unknown>;
  expectedStatus: number;
  responseAssertions?: string[];
}

export interface AiEnrichment {
  requestBody?: Record<string, unknown>;
  responseAssertions?: string[];
  errorCases?: ErrorCaseSpec[];
}

export interface AiEnricherPort {
  enrich(spec: TestSpec, controllerSource?: string): Promise<AiEnrichment>;
  enrichControllerSetup?(controllerName: string, specs: TestSpec[]): Promise<ControllerSetup | null>;
}
