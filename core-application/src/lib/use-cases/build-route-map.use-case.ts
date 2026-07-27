import * as path from 'node:path';
import type { HttpCall, NestController, RouteMap, RouteMapEntry } from '@ai-web-qa-tester/core-domain';
import type { FileSystemPort } from '../ports/file-system.port';
import type { InventoryReaderPort } from '../ports/inventory-reader.port';
import type { RouteMapWriterPort } from '../ports/route-map-writer.port';

export class RouteMapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RouteMapError';
  }
}

export interface BuildRouteMapInput {
  backendPath: string;
}

function normalize(urlPattern: string): string {
  return urlPattern.replace(/^\//, '').replace(/^api\//, '');
}

function templateToRegex(nestPath: string): RegExp {
  const escaped = nestPath.replace(/:[^/]+/g, '[^/]+');
  return new RegExp(`^${escaped}$`);
}

function matchEntry(
  serviceName: string,
  httpCall: HttpCall,
  controllers: NestController[],
): RouteMapEntry {
  const normalizedUrl = normalize(httpCall.urlPattern);

  for (const controller of controllers) {
    for (const endpoint of controller.endpoints) {
      if (endpoint.method !== httpCall.method) continue;

      const normalizedEndpoint = normalize(endpoint.path);

      if (normalizedUrl === normalizedEndpoint) {
        return {
          angularService: serviceName,
          httpCall,
          matchedEndpoint: { controller: controller.name, endpoint },
          confidence: 'exact',
          controllerFile: controller.filePath,
        };
      }
    }
  }

  for (const controller of controllers) {
    for (const endpoint of controller.endpoints) {
      if (endpoint.method !== httpCall.method) continue;

      const normalizedEndpoint = normalize(endpoint.path);

      if (normalizedEndpoint.includes(':') && templateToRegex(normalizedEndpoint).test(normalizedUrl)) {
        return {
          angularService: serviceName,
          httpCall,
          matchedEndpoint: { controller: controller.name, endpoint },
          confidence: 'partial',
          controllerFile: controller.filePath,
        };
      }
    }
  }

  return {
    angularService: serviceName,
    httpCall,
    matchedEndpoint: null,
    confidence: 'none',
  };
}

export class BuildRouteMapUseCase {
  constructor(
    private readonly fs: FileSystemPort,
    private readonly reader: InventoryReaderPort,
    private readonly writer: RouteMapWriterPort,
  ) {}

  async execute(input: BuildRouteMapInput): Promise<RouteMap> {
    const backendAbs = path.resolve(input.backendPath);
    const inventoryPath = path.join(backendAbs, '.qa', 'component-inventory.json');

    if (!this.fs.exists(inventoryPath)) {
      throw new RouteMapError(
        `component-inventory.json not found — run 'analyze' first: ${inventoryPath}`,
      );
    }

    const inventory = await this.reader.read(backendAbs);

    const noBackend = inventory.nestjs.controllers.length === 0;
    const entries: RouteMapEntry[] = [];
    for (const service of inventory.angular.services) {
      for (const httpCall of service.httpCalls) {
        entries.push(
          noBackend
            ? { angularService: service.name, httpCall, matchedEndpoint: null, confidence: 'exact' }
            : matchEntry(service.name, httpCall, inventory.nestjs.controllers),
        );
      }
    }

    const routeMap: RouteMap = {
      mappedAt: new Date().toISOString(),
      entries,
    };

    await this.writer.write(routeMap, backendAbs);

    return routeMap;
  }
}
