# Route Mapping Specification

## Purpose

Connects Angular `HttpCall`s to NestJS `NestEndpoint`s from `ComponentInventory`, producing a `RouteMap` with per-entry `confidence` scores (`exact` | `partial` | `none`) written to `.qa/route-map.json`. Enables Day 5 test generation to distinguish safe matches from ambiguous ones and contract mismatches.

## Requirements

### Requirement: URL Normalization

The system MUST strip a leading `/` and a leading `api/` prefix from each Angular `HttpCall.urlPattern` before matching against NestJS endpoint paths.

#### Scenario: Strip leading slash and api prefix

- GIVEN an Angular `HttpCall` with `urlPattern: '/api/products'`
- WHEN URL normalization runs
- THEN the normalized path is `'products'`

### Requirement: Exact Match

The system MUST produce `confidence: 'exact'` when both the HTTP method and the normalized Angular path match a NestJS endpoint's method and path exactly.

#### Scenario: GET /api/products matches GET products

- GIVEN an Angular `HttpCall` `{ method: 'GET', urlPattern: '/api/products' }`
- AND a `NestEndpoint` `{ method: 'GET', path: 'products' }`
- WHEN `BuildRouteMapUseCase` executes
- THEN the `RouteMapEntry` for that call has `confidence: 'exact'`
- AND `matchedEndpoint` references that `NestEndpoint`

### Requirement: Partial Match

The system MUST produce `confidence: 'partial'` when the HTTP method matches and the normalized Angular path matches a NestJS `:param` template path (each `:param` segment matches any non-empty literal segment). Exact match takes priority over partial.

#### Scenario: GET /api/products/123 matches GET products/:id

- GIVEN an Angular `HttpCall` `{ method: 'GET', urlPattern: '/api/products/123' }`
- AND a `NestEndpoint` `{ method: 'GET', path: 'products/:id' }`
- WHEN `BuildRouteMapUseCase` executes
- THEN the `RouteMapEntry` has `confidence: 'partial'`
- AND `matchedEndpoint` references that `NestEndpoint`

### Requirement: No Match

The system MUST produce `confidence: 'none'` and `matchedEndpoint: null` when no `NestEndpoint` matches both the HTTP method and path of an Angular `HttpCall`. Method comparison is case-insensitive; a path-only match with a different method MUST NOT produce `partial`.

#### Scenario: Method mismatch — PUT with no PUT endpoint

- GIVEN an Angular `HttpCall` `{ method: 'PUT', urlPattern: '/api/products' }`
- AND a `NestEndpoint` `{ method: 'PATCH', path: 'products' }`
- WHEN `BuildRouteMapUseCase` executes
- THEN the `RouteMapEntry` has `confidence: 'none'`
- AND `matchedEndpoint` is `null`

### Requirement: Full Coverage

The system MUST produce exactly one `RouteMapEntry` per `HttpCall` found in the `ComponentInventory`. No `HttpCall` is omitted regardless of match outcome.

#### Scenario: Empty httpCalls produces empty entries

- GIVEN a `ComponentInventory` with `httpCalls: []`
- WHEN `BuildRouteMapUseCase` executes
- THEN the output `RouteMap` has `entries: []`
- AND no error is thrown

### Requirement: Output File

The system MUST write the resulting `RouteMap` as `route-map.json` inside `{backendPath}/.qa/`.

#### Scenario: route-map.json written to .qa/

- GIVEN a valid `ComponentInventory` with at least one `HttpCall`
- WHEN `BuildRouteMapUseCase` completes successfully
- THEN `{backendPath}/.qa/route-map.json` exists
- AND its content is a valid JSON `RouteMap` object with an `entries` array

### Requirement: Prerequisite Validation

The system MUST throw a descriptive error when `{backendPath}/.qa/component-inventory.json` does not exist before executing the matching algorithm. No `route-map.json` MUST be written in this case.

#### Scenario: Missing component-inventory.json

- GIVEN a `backendPath` where `.qa/component-inventory.json` does not exist
- WHEN `BuildRouteMapUseCase` is invoked
- THEN an error is thrown that includes the expected file path
- AND no `route-map.json` is written to disk
