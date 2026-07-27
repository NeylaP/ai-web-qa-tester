import type { HttpCall, NestEndpoint } from './component-inventory';

export type MatchConfidence = 'exact' | 'partial' | 'none';

export interface RouteMapEntry {
  angularService: string;
  httpCall: HttpCall;
  matchedEndpoint: { controller: string; endpoint: NestEndpoint } | null;
  confidence: MatchConfidence;
  controllerFile?: string;
}

export interface RouteMap {
  mappedAt: string;
  entries: RouteMapEntry[];
}
