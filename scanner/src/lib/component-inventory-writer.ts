import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ComponentInventory } from '@ai-web-qa-tester/core-domain';
import type { InventoryWriterPort } from '@ai-web-qa-tester/core-application';

export class ComponentInventoryWriter implements InventoryWriterPort {
  async write(inventory: ComponentInventory, targetDir: string): Promise<void> {
    const qaDir = path.join(targetDir, '.qa');
    fs.mkdirSync(qaDir, { recursive: true });
    fs.writeFileSync(
      path.join(qaDir, 'component-inventory.json'),
      JSON.stringify(inventory, null, 2),
      'utf8',
    );
  }
}
