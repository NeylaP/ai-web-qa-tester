import type { MatchConfidence } from './route-map';

export interface TestSpec {
  title: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint: string;
  expectedStatus: number;
  confidence: MatchConfidence;
  skipped: boolean;
  controllerName: string;
  requestBody?: Record<string, unknown>;
  responseAssertions?: string[];
}

export interface ControllerSetup {
  setupEndpoint: string;
  setupMethod: 'POST' | 'PUT';
  setupBody: Record<string, unknown>;
  uniqueFields?: string[];
  idPath: string;
  teardownEndpoint: string;
}

export interface TestSuite {
  generatedAt: string;
  entries: TestSpec[];
  controllerSetups?: Record<string, ControllerSetup>;
}
