import type { RouteMap } from '@ai-web-qa-tester/core-domain';

export interface RouteMapWriterPort {
  write(routeMap: RouteMap, targetDir: string): Promise<void>;
}
