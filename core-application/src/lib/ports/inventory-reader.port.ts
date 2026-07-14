import type { ComponentInventory } from '@ai-web-qa-tester/core-domain';

export interface InventoryReaderPort {
  read(targetDir: string): Promise<ComponentInventory>;
}
