import * as fs from 'node:fs';
import * as path from 'node:path';
import type { RouteMap } from '@ai-web-qa-tester/core-domain';
import type { RouteMapReaderPort } from '@ai-web-qa-tester/core-application';

export class RouteMapReader implements RouteMapReaderPort {
  async read(targetDir: string): Promise<RouteMap> {
    const filePath = path.join(targetDir, '.qa', 'route-map.json');
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as RouteMap;
  }
}
