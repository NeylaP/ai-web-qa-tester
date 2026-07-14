import { describe, it, expect, vi } from 'vitest';
import * as path from 'node:path';
import { AnalyzeProjectUseCase, AnalysisError } from './analyze-project.use-case';
import type { FileSystemPort } from '../ports/file-system.port';
import type { AngularInventory, InventoryAnalyzerPort, NestInventory } from '../ports/inventory-analyzer.port';
import type { InventoryWriterPort } from '../ports/inventory-writer.port';

const frontendAbs = path.resolve('test-frontend');
const backendAbs = path.resolve('test-backend');
const manifestPath = path.join(backendAbs, '.qa', 'project-manifest.json');
const frontendTsConfig = path.join(frontendAbs, 'tsconfig.json');
const backendTsConfig = path.join(backendAbs, 'tsconfig.json');

const stubAngular: AngularInventory = {
  components: [{ name: 'AppComponent', selector: 'app-root', filePath: 'src/app.component.ts' }],
  services: [],
  routes: [],
};
const stubNest: NestInventory = { controllers: [], services: [], dtos: [] };

interface MockOpts {
  manifestExists?: boolean;
  frontendTsConfigExists?: boolean;
  backendTsConfigExists?: boolean;
}

function makeMocks(opts: MockOpts = {}) {
  const {
    manifestExists = true,
    frontendTsConfigExists = true,
    backendTsConfigExists = true,
  } = opts;

  const mockFs: FileSystemPort = {
    exists: vi.fn((p: string) => {
      if (p === manifestPath) return manifestExists;
      if (p === frontendTsConfig) return frontendTsConfigExists;
      if (p === backendTsConfig) return backendTsConfigExists;
      return false;
    }),
    isDirectory: vi.fn(() => true),
  };
  const mockAngular: InventoryAnalyzerPort<AngularInventory> = { analyze: vi.fn(async () => stubAngular) };
  const mockNest: InventoryAnalyzerPort<NestInventory> = { analyze: vi.fn(async () => stubNest) };
  const mockWriter: InventoryWriterPort = { write: vi.fn(async () => undefined) };
  return { mockFs, mockAngular, mockNest, mockWriter };
}

describe('AnalyzeProjectUseCase', () => {
  it('returns a ComponentInventory with both analyzers on happy path', async () => {
    const { mockFs, mockAngular, mockNest, mockWriter } = makeMocks();
    const useCase = new AnalyzeProjectUseCase(mockFs, mockAngular, mockNest, mockWriter);

    const result = await useCase.execute({ frontendPath: 'test-frontend', backendPath: 'test-backend' });

    expect(result.angular).toEqual(stubAngular);
    expect(result.nestjs).toEqual(stubNest);
    expect(result.analyzedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('calls both analyzers with resolved absolute paths', async () => {
    const { mockFs, mockAngular, mockNest, mockWriter } = makeMocks();
    const useCase = new AnalyzeProjectUseCase(mockFs, mockAngular, mockNest, mockWriter);

    await useCase.execute({ frontendPath: 'test-frontend', backendPath: 'test-backend' });

    expect(mockAngular.analyze).toHaveBeenCalledWith(frontendAbs, frontendTsConfig);
    expect(mockNest.analyze).toHaveBeenCalledWith(backendAbs, backendTsConfig);
  });

  it('throws AnalysisError when project-manifest.json is missing', async () => {
    const { mockFs, mockAngular, mockNest, mockWriter } = makeMocks({ manifestExists: false });
    const useCase = new AnalyzeProjectUseCase(mockFs, mockAngular, mockNest, mockWriter);

    await expect(useCase.execute({ frontendPath: 'test-frontend', backendPath: 'test-backend' }))
      .rejects.toThrow(AnalysisError);
    await expect(useCase.execute({ frontendPath: 'test-frontend', backendPath: 'test-backend' }))
      .rejects.toThrow("run 'scan' first");
  });

  it('throws AnalysisError when frontend tsconfig.json is missing', async () => {
    const { mockFs, mockAngular, mockNest, mockWriter } = makeMocks({ frontendTsConfigExists: false });
    const useCase = new AnalyzeProjectUseCase(mockFs, mockAngular, mockNest, mockWriter);

    await expect(useCase.execute({ frontendPath: 'test-frontend', backendPath: 'test-backend' }))
      .rejects.toThrow('tsconfig.json not found in frontend path');
  });

  it('throws AnalysisError when backend tsconfig.json is missing', async () => {
    const { mockFs, mockAngular, mockNest, mockWriter } = makeMocks({ backendTsConfigExists: false });
    const useCase = new AnalyzeProjectUseCase(mockFs, mockAngular, mockNest, mockWriter);

    await expect(useCase.execute({ frontendPath: 'test-frontend', backendPath: 'test-backend' }))
      .rejects.toThrow('tsconfig.json not found in backend path');
  });
});
