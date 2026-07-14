import type { ComponentInventory } from '@ai-web-qa-tester/core-domain';

export interface InventoryWriterPort {
  write(inventory: ComponentInventory, targetDir: string): Promise<void>;
}
