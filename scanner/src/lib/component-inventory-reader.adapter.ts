import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ComponentInventory } from '@ai-web-qa-tester/core-domain';
import type { InventoryReaderPort } from '@ai-web-qa-tester/core-application';

export class ComponentInventoryReader implements InventoryReaderPort {
  async read(targetDir: string): Promise<ComponentInventory> {
    const filePath = path.join(targetDir, '.qa', 'component-inventory.json');
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as ComponentInventory;
  }
}
