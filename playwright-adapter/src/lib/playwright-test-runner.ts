import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import type { TestReport, TestResult, TestAttachment } from '@ai-web-qa-tester/core-domain';
import type { TestRunnerPort, TestRunnerInput } from '@ai-web-qa-tester/core-application';

interface PwReport {
  suites?: PwSuite[];
}

interface PwSuite {
  title: string;
  specs?: PwSpec[];
  suites?: PwSuite[];
}

interface PwSpec {
  title: string;
  tests: PwTest[];
}

interface PwTest {
  results: PwResult[];
}

interface PwAttachment {
  name: string;
  contentType: string;
  path?: string;
}

interface PwResult {
  status: 'passed' | 'failed' | 'skipped' | 'timedOut' | 'interrupted';
  duration: number;
  error?: { message: string };
  attachments?: PwAttachment[];
}

export class PlaywrightTestRunner implements TestRunnerPort {
  async run(input: TestRunnerInput): Promise<TestReport> {
    const qaDir = path.dirname(input.outputPath);
    const rawReportPath = path.join(qaDir, 'playwright-raw.json');
    const configPath = this.writeConfig(input, rawReportPath);

    await this.runPlaywright(configPath);

    const rawJson = fs.readFileSync(rawReportPath, 'utf-8');
    const report = this.parseReport(rawJson, input.baseUrl);
    fs.writeFileSync(input.outputPath, JSON.stringify(report, null, 2), 'utf-8');
    return report;
  }

  private writeConfig(input: TestRunnerInput, rawReportPath: string): string {
    const qaDir = path.dirname(input.outputPath);
    fs.mkdirSync(qaDir, { recursive: true });

    // Create a directory junction so spec files in <qaDir>/tests/ resolve
    // `@playwright/test` to our local version instead of any global install.
    // Junction type works without admin rights on Windows.
    const junctionDst = path.join(qaDir, 'node_modules', '@playwright', 'test');
    if (!fs.existsSync(junctionDst)) {
      const localPwt = path.resolve(process.cwd(), 'node_modules', '@playwright', 'test');
      fs.mkdirSync(path.dirname(junctionDst), { recursive: true });
      fs.symlinkSync(localPwt, junctionDst, 'junction');
    }

    const configPath = path.join(qaDir, 'playwright.run.config.ts');

    const useLines: string[] = [`    baseURL: ${JSON.stringify(input.baseUrl)},`];
    const extraHeaders: Record<string, string> = {};
    if (input.authToken) extraHeaders['Authorization'] = `Bearer ${input.authToken}`;
    if (input.originHeader) extraHeaders['origin_dev'] = input.originHeader;
    if (Object.keys(extraHeaders).length > 0) {
      useLines.push(`    extraHTTPHeaders: ${JSON.stringify(extraHeaders)},`);
    }

    const artifactsDir = path.resolve(path.join(qaDir, 'playwright-artifacts'));
    const content = [
      `import { defineConfig } from '@playwright/test';`,
      `export default defineConfig({`,
      `  testDir: ${JSON.stringify(path.resolve(input.testDir))},`,
      `  timeout: ${input.testTimeout ?? 30_000},`,
      `  outputDir: ${JSON.stringify(artifactsDir)},`,
      `  use: {`,
      ...useLines,
      `    screenshot: 'on',`,
      `    video: 'retain-on-failure',`,
      `    trace: 'retain-on-failure',`,
      `  },`,
      `  reporter: [['json', { outputFile: ${JSON.stringify(path.resolve(rawReportPath))} }]],`,
      `});`,
    ].join('\n');
    fs.writeFileSync(configPath, content, 'utf-8');
    return configPath;
  }

  private runPlaywright(configPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Call the local @playwright/test CLI directly via node — avoids npx resolving
      // the global `playwright` package instead of the local `@playwright/test`.
      const playwrightCli = path.join(process.cwd(), 'node_modules', '@playwright', 'test', 'cli.js');
      const child = spawn(process.execPath, [playwrightCli, 'test', '--config', configPath], {
        stdio: 'inherit',
        shell: false,
        env: process.env,
      });
      child.on('close', (code) => {
        // 0 = all passed, 1 = some tests failed — both acceptable (we parse the report)
        if (code !== null && code > 1) {
          reject(new Error(`Playwright exited with code ${code}`));
        } else {
          resolve();
        }
      });
      child.on('error', reject);
    });
  }

  private parseReport(jsonStr: string, baseUrl: string): TestReport {
    const raw = JSON.parse(jsonStr) as PwReport;
    const results: TestResult[] = [];
    this.collectSpecs(raw.suites ?? [], results);

    return {
      generatedAt: new Date().toISOString(),
      baseUrl,
      summary: {
        total: results.length,
        passed: results.filter(r => r.status === 'passed').length,
        failed: results.filter(r => r.status === 'failed').length,
        skipped: results.filter(r => r.status === 'skipped').length,
      },
      results,
    };
  }

  private collectSpecs(suites: PwSuite[], results: TestResult[]): void {
    for (const suite of suites) {
      for (const spec of suite.specs ?? []) {
        const result = spec.tests[0]?.results[0];
        const status: TestResult['status'] =
          result?.status === 'passed'
            ? 'passed'
            : result?.status === 'skipped'
              ? 'skipped'
              : 'failed';

        const attachments: TestAttachment[] = (result?.attachments ?? [])
          .filter(a => a.path)
          .map(a => ({
            name: a.name,
            contentType: a.contentType,
            path: a.path as string,
            type: a.contentType.startsWith('video/')
              ? 'video'
              : a.name === 'trace'
                ? 'trace'
                : 'screenshot',
          }));

        results.push({
          title: spec.title,
          endpoint: spec.title.match(/\s(\/\S+)/)?.[1] ?? '',
          method: spec.title.match(/^(GET|POST|PUT|PATCH|DELETE)/)?.[1] ?? '',
          status,
          durationMs: result?.duration ?? 0,
          ...(result?.error ? { error: result.error.message } : {}),
          ...(attachments.length > 0 ? { attachments } : {}),
        });
      }
      this.collectSpecs(suite.suites ?? [], results);
    }
  }
}
