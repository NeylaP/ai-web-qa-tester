import * as fs from 'node:fs';
import * as path from 'node:path';
import type { TestSpec, TestSuite } from '@ai-web-qa-tester/core-domain';
import type { TestSuiteWriterPort } from '@ai-web-qa-tester/core-application';

function requestCall(method: string, url: string, requestBody?: Record<string, unknown>): string {
  const bodyArg = requestBody ? JSON.stringify(requestBody) : '{}';
  switch (method) {
    case 'GET': return `request.get('${url}')`;
    case 'DELETE': return `request.delete('${url}')`;
    default: return `request.${method.toLowerCase()}('${url}', { data: ${bodyArg} })`;
  }
}

function renderSpec(spec: TestSpec): string {
  if (spec.skipped) {
    return [
      `  test.skip('${spec.title}', async ({ request }) => {`,
      `    // Contract gap: no matching endpoint found`,
      `    void request;`,
      `  });`,
    ].join('\n');
  }

  const lines: string[] = [
    `  test('${spec.title}', async ({ request }) => {`,
    `    const response = await ${requestCall(spec.method, spec.endpoint, spec.requestBody)};`,
    `    expect(response.status()).toBe(${spec.expectedStatus});`,
  ];

  if (spec.responseAssertions && spec.responseAssertions.length > 0) {
    lines.push(`    const body = await response.json();`);
    for (const assertion of spec.responseAssertions) {
      lines.push(`    ${assertion};`);
    }
  }

  lines.push(`  });`);
  return lines.join('\n');
}

function renderFile(controllerName: string, specs: TestSpec[]): string {
  const tests = specs.map(renderSpec).join('\n\n');
  return [
    `import { test, expect } from '@playwright/test';`,
    ``,
    `test.describe('${controllerName}', () => {`,
    tests,
    `});`,
    ``,
  ].join('\n');
}

export class PlaywrightSpecWriter implements TestSuiteWriterPort {
  async write(suite: TestSuite, backendPath: string, outputDir: string): Promise<void> {
    fs.mkdirSync(outputDir, { recursive: true });

    const groups = new Map<string, TestSpec[]>();
    for (const spec of suite.entries) {
      const list = groups.get(spec.controllerName) ?? [];
      list.push(spec);
      groups.set(spec.controllerName, list);
    }

    for (const [controllerName, specs] of groups) {
      const content = renderFile(controllerName, specs);
      fs.writeFileSync(path.join(outputDir, `${controllerName}.spec.ts`), content, 'utf8');
    }

    const qaDir = path.join(backendPath, '.qa');
    fs.mkdirSync(qaDir, { recursive: true });
    fs.writeFileSync(
      path.join(qaDir, 'test-suite.json'),
      JSON.stringify(suite, null, 2),
      'utf8',
    );
  }
}
