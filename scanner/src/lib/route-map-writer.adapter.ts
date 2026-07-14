import * as fs from 'node:fs';
import * as path from 'node:path';
import type { RouteMap } from '@ai-web-qa-tester/core-domain';
import type { RouteMapWriterPort } from '@ai-web-qa-tester/core-application';

export class RouteMapWriter implements RouteMapWriterPort {
  async write(routeMap: RouteMap, targetDir: string): Promise<void> {
    const qaDir = path.join(targetDir, '.qa');
    fs.mkdirSync(qaDir, { recursive: true });
    fs.writeFileSync(
      path.join(qaDir, 'route-map.json'),
      JSON.stringify(routeMap, null, 2),
      'utf8',
    );
  }
}
