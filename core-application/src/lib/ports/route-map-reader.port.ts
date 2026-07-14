import type { RouteMap } from '@ai-web-qa-tester/core-domain';

export interface RouteMapReaderPort {
  read(targetDir: string): Promise<RouteMap>;
}
