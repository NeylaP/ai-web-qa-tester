import type { TestReport } from '@ai-web-qa-tester/core-domain';
import type { FileSystemPort } from '../ports/file-system.port';
import type { TestRunnerPort } from '../ports/test-runner.port';
import type { ProcessManagerPort } from '../ports/process-manager.port';

export interface RunTestsInput {
  backendPath: string;
  baseUrl: string;
  startCommand?: string;
  skipBackend?: boolean;
  authToken?: string;
}

export class RunTestsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RunTestsError';
  }
}

export class RunTestsUseCase {
  constructor(
    private readonly fs: FileSystemPort,
    private readonly runner: TestRunnerPort,
    private readonly processManager: ProcessManagerPort,
  ) {}

  async execute(input: RunTestsInput): Promise<TestReport> {
    const testDir = `${input.backendPath}/.qa/tests`;
    const outputPath = `${input.backendPath}/.qa/test-report.json`;

    if (!this.fs.exists(testDir)) {
      throw new RunTestsError(
        `Test directory not found: ${testDir}. Run 'generate' first.`,
      );
    }

    if (input.skipBackend) {
      return await this.runner.run({ testDir, baseUrl: input.baseUrl, outputPath, authToken: input.authToken });
    }

    const startCmd = input.startCommand ?? this.deriveStartCommand(input.backendPath);

    try {
      await this.processManager.start(startCmd, input.backendPath);
      await this.processManager.waitForReady(input.baseUrl, 120_000);
      return await this.runner.run({ testDir, baseUrl: input.baseUrl, outputPath, authToken: input.authToken });
    } finally {
      await this.processManager.stop();
    }
  }

  private deriveStartCommand(_backendPath: string): string {
    return 'npx nest build && node dist/main.js';
  }
}
