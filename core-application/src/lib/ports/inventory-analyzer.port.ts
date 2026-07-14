import type { AngularComponent, AngularService, NestController, NestDto, NestService } from '@ai-web-qa-tester/core-domain';

export type AngularInventory = {
  components: AngularComponent[];
  services: AngularService[];
  routes: string[];
};

export type NestInventory = {
  controllers: NestController[];
  services: NestService[];
  dtos: NestDto[];
};

export interface InventoryAnalyzerPort<T extends AngularInventory | NestInventory> {
  analyze(absolutePath: string, tsConfigPath: string): Promise<T>;
}
