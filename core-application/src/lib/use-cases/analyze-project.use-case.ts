import * as path from 'node:path';
import type { ComponentInventory } from '@ai-web-qa-tester/core-domain';
import type { FileSystemPort } from '../ports/file-system.port';
import type { InventoryWriterPort } from '../ports/inventory-writer.port';
import type { AngularInventory, InventoryAnalyzerPort, NestInventory } from '../ports/inventory-analyzer.port';

export class AnalysisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AnalysisError';
  }
}

export interface AnalyzeProjectInput {
  frontendPath: string;
  backendPath: string;
}

export class AnalyzeProjectUseCase {
  constructor(
    private readonly fs: FileSystemPort,
    private readonly angularAnalyzer: InventoryAnalyzerPort<AngularInventory>,
    private readonly nestAnalyzer: InventoryAnalyzerPort<NestInventory>,
    private readonly writer: InventoryWriterPort,
  ) {}

  async execute(input: AnalyzeProjectInput): Promise<ComponentInventory> {
    const frontendAbs = path.resolve(input.frontendPath);
    const backendAbs = path.resolve(input.backendPath);

    const manifestPath = path.join(backendAbs, '.qa', 'project-manifest.json');
    if (!this.fs.exists(manifestPath)) {
      throw new AnalysisError(`project-manifest.json not found — run 'scan' first: ${manifestPath}`);
    }

    const frontendTsConfig = path.join(frontendAbs, 'tsconfig.json');
    if (!this.fs.exists(frontendTsConfig)) {
      throw new AnalysisError(`tsconfig.json not found in frontend path: ${frontendTsConfig}`);
    }

    const backendTsConfig = path.join(backendAbs, 'tsconfig.json');
    if (!this.fs.exists(backendTsConfig)) {
      throw new AnalysisError(`tsconfig.json not found in backend path: ${backendTsConfig}`);
    }

    const [angular, nestjs] = await Promise.all([
      this.angularAnalyzer.analyze(frontendAbs, frontendTsConfig),
      this.nestAnalyzer.analyze(backendAbs, backendTsConfig),
    ]);

    const inventory: ComponentInventory = {
      analyzedAt: new Date().toISOString(),
      angular,
      nestjs,
    };

    await this.writer.write(inventory, backendAbs);

    return inventory;
  }
}
