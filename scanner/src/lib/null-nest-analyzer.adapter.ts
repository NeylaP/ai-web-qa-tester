import type { NestInventory, InventoryAnalyzerPort } from '@ai-web-qa-tester/core-application';

export class NullNestAnalyzer implements InventoryAnalyzerPort<NestInventory> {
  async analyze(_absolutePath: string, _tsConfigPath: string): Promise<NestInventory> {
    return { controllers: [], services: [], dtos: [] };
  }
}
