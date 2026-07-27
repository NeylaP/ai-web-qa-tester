import * as fs from 'node:fs';
import * as path from 'node:path';
import type { TestSpec, TestSuite, ControllerSetup } from '@ai-web-qa-tester/core-domain';
import type { TestSuiteWriterPort } from '@ai-web-qa-tester/core-application';

function substituteId(url: string): string {
  return url.replace(/:[a-zA-Z]\w*|\{[a-zA-Z]\w*\}/g, '${_createdId}');
}

function hasPathParam(url: string): boolean {
  return /:[a-zA-Z]\w*|\{[a-zA-Z]\w*\}/.test(url);
}

function requestCall(method: string, url: string, requestBody?: Record<string, unknown>, hasSetup?: boolean): string {
  const needsSub = hasSetup && hasPathParam(url);
  const resolvedUrl = needsSub ? substituteId(url) : url;
  const urlExpr = needsSub ? `\`${resolvedUrl}\`` : `'${resolvedUrl}'`;
  const bodyArg = requestBody ? JSON.stringify(requestBody) : '{}';
  switch (method) {
    case 'GET': return `request.get(${urlExpr})`;
    case 'DELETE': return `request.delete(${urlExpr})`;
    default: return `request.${method.toLowerCase()}(${urlExpr}, { data: ${bodyArg} })`;
  }
}

function renderSetupBlocks(setup: ControllerSetup): string {
  const hasUnique = (setup.uniqueFields?.length ?? 0) > 0;
  const bodyLines = Object.entries(setup.setupBody).map(([key, value]) => {
    if (setup.uniqueFields?.includes(key) && typeof value === 'string') {
      return `        ${key}: \`${value}_\${_ts}\`,`;
    }
    return `        ${key}: ${JSON.stringify(value)},`;
  });

  const lines: string[] = [
    `  let _createdId: string | number;`,
    ``,
    `  test.beforeAll(async ({ request }) => {`,
  ];

  if (hasUnique) lines.push(`    const _ts = Date.now();`);

  lines.push(
    `    const setupResponse = await request.${setup.setupMethod.toLowerCase()}('${setup.setupEndpoint}', {`,
    `      data: {`,
    ...bodyLines,
    `      },`,
    `    });`,
    `    const setupBody = await setupResponse.json();`,
    `    _createdId = setupBody.${setup.idPath};`,
    `  });`,
    ``,
    `  test.afterAll(async ({ request }) => {`,
    `    if (_createdId !== undefined) {`,
    `      await request.delete(\`${setup.teardownEndpoint}/\${_createdId}\`);`,
    `    }`,
    `  });`,
  );

  return lines.join('\n');
}

function renderSpec(spec: TestSpec, hasSetup = false): string {
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
    `    const response = await ${requestCall(spec.method, spec.endpoint, spec.requestBody, hasSetup)};`,
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

function renderFile(controllerName: string, specs: TestSpec[], setup?: ControllerSetup): string {
  const hasSetup = !!setup;
  const chunks: string[] = [
    `import { test, expect } from '@playwright/test';`,
    ``,
    `test.describe('${controllerName}', () => {`,
  ];

  if (setup) {
    chunks.push(renderSetupBlocks(setup));
    chunks.push(``);
  }

  chunks.push(specs.map(spec => renderSpec(spec, hasSetup)).join('\n\n'));
  chunks.push(`});`);
  chunks.push(``);

  return chunks.join('\n');
}

export class PlaywrightSpecWriter implements TestSuiteWriterPort {
  async write(suite: TestSuite, backendPath: string, outputDir: string): Promise<void> {
    if (fs.existsSync(outputDir)) {
      for (const file of fs.readdirSync(outputDir)) {
        if (file.endsWith('.spec.ts')) {
          fs.unlinkSync(path.join(outputDir, file));
        }
      }
    }
    fs.mkdirSync(outputDir, { recursive: true });

    const groups = new Map<string, TestSpec[]>();
    for (const spec of suite.entries) {
      const list = groups.get(spec.controllerName) ?? [];
      list.push(spec);
      groups.set(spec.controllerName, list);
    }

    for (const [controllerName, specs] of groups) {
      const setup = suite.controllerSetups?.[controllerName];
      const content = renderFile(controllerName, specs, setup);
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
