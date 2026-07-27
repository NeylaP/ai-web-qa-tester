import * as path from 'node:path';
import type { RouteMapEntry, TestSpec, TestSuite, ControllerSetup } from '@ai-web-qa-tester/core-domain';
import type { FileSystemPort } from '../ports/file-system.port';
import type { RouteMapReaderPort } from '../ports/route-map-reader.port';
import type { TestSuiteWriterPort } from '../ports/test-suite-writer.port';
import type { AiEnricherPort } from '../ports/ai-enricher.port';

export class GenerateTestsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GenerateTestsError';
  }
}

export interface GenerateTestsInput {
  backendPath: string;
  outputPath?: string;
}

function deriveStatus(method: string): number {
  return method === 'POST' ? 201 : 200;
}

function toTestSpec(entry: RouteMapEntry): TestSpec {
  const skipped = entry.confidence === 'none';
  const controllerName = entry.matchedEndpoint?.controller ?? entry.angularService;
  return {
    title: `${entry.httpCall.method} ${entry.httpCall.urlPattern} - ${entry.confidence}`,
    method: entry.httpCall.method,
    endpoint: entry.httpCall.urlPattern,
    expectedStatus: skipped ? 0 : deriveStatus(entry.httpCall.method),
    confidence: entry.confidence,
    skipped,
    controllerName,
  };
}

export class GenerateTestsUseCase {
  constructor(
    private readonly fs: FileSystemPort,
    private readonly reader: RouteMapReaderPort,
    private readonly writer: TestSuiteWriterPort,
    private readonly aiEnricher: AiEnricherPort | null = null,
  ) {}

  async execute(input: GenerateTestsInput): Promise<TestSuite> {
    const backendAbs = path.resolve(input.backendPath);
    const routeMapPath = path.join(backendAbs, '.qa', 'route-map.json');

    if (!this.fs.exists(routeMapPath)) {
      throw new GenerateTestsError(
        `route-map.json not found — run 'map' first: ${routeMapPath}`,
      );
    }

    const routeMap = await this.reader.read(backendAbs);

    const entries: TestSpec[] = [];
    for (const entry of routeMap.entries) {
      let spec = toTestSpec(entry);
      if (!spec.skipped && this.aiEnricher) {
        let controllerSource: string | undefined;
        if (entry.controllerFile && this.fs.readFile) {
          const filePath = path.join(backendAbs, entry.controllerFile);
          if (this.fs.exists(filePath)) {
            try {
              controllerSource = this.fs.readFile(filePath);
            } catch {
              // unreadable — proceed without source
            }
          }
        }
        const enriched = await this.aiEnricher.enrich(spec, controllerSource);
        spec = {
          ...spec,
          requestBody: enriched.requestBody,
          responseAssertions: enriched.responseAssertions,
        };
        for (const ec of enriched.errorCases ?? []) {
          entries.push({
            title: ec.title,
            method: spec.method,
            endpoint: spec.endpoint,
            expectedStatus: ec.expectedStatus,
            confidence: spec.confidence,
            skipped: false,
            controllerName: spec.controllerName,
            requestBody: ec.requestBody,
            responseAssertions: ec.responseAssertions,
          });
        }
      }
      entries.push(spec);
    }

    let controllerSetups: Record<string, ControllerSetup> | undefined;
    if (this.aiEnricher?.enrichControllerSetup) {
      const groups = new Map<string, TestSpec[]>();
      for (const spec of entries) {
        if (!spec.skipped) {
          const list = groups.get(spec.controllerName) ?? [];
          list.push(spec);
          groups.set(spec.controllerName, list);
        }
      }
      for (const [controllerName, specs] of groups) {
        const setup = await this.aiEnricher.enrichControllerSetup(controllerName, specs);
        if (setup) {
          controllerSetups ??= {};
          controllerSetups[controllerName] = setup;
        }
      }
    }

    const suite: TestSuite = {
      generatedAt: new Date().toISOString(),
      entries,
      ...(controllerSetups ? { controllerSetups } : {}),
    };

    const outputDir = input.outputPath
      ? path.resolve(input.outputPath)
      : path.join(backendAbs, '.qa', 'tests');

    await this.writer.write(suite, backendAbs, outputDir);

    return suite;
  }
}
