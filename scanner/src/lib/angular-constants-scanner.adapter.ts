import * as fs from 'node:fs';
import * as path from 'node:path';
import type { HttpCall } from '@ai-web-qa-tester/core-domain';
import type { AngularInventory, InventoryAnalyzerPort } from '@ai-web-qa-tester/core-application';

export class AngularConstantsScannerAdapter implements InventoryAnalyzerPort<AngularInventory> {
  constructor(private readonly constantsFilePath: string) {}

  async analyze(frontendAbsPath: string, _tsConfigPath: string): Promise<AngularInventory> {
    const constantsMap = this.parseConstantsFile();
    const services = this.scanServiceFiles(frontendAbsPath, constantsMap);
    return { components: [], services, routes: [] };
  }

  private parseConstantsFile(): Map<string, string> {
    const content = fs.readFileSync(this.constantsFilePath, 'utf-8');
    const rawMap = new Map<string, string>();

    // Find every `export const NAME = {` block
    const constRe = /export\s+const\s+(\w+)\s*=\s*\{/g;
    let blockMatch: RegExpExecArray | null;

    while ((blockMatch = constRe.exec(content)) !== null) {
      const namespace = blockMatch[1];
      const startIdx = blockMatch.index + blockMatch[0].length;

      // Walk forward to find the matching closing brace
      let depth = 1;
      let idx = startIdx;
      while (idx < content.length && depth > 0) {
        if (content[idx] === '{') depth++;
        if (content[idx] === '}') depth--;
        idx++;
      }

      const block = content.slice(startIdx, idx - 1);

      // Extract KEY: `template literal` entries
      const entryRe = /(\w+)\s*:\s*`([^`]*)`/g;
      let entryMatch: RegExpExecArray | null;
      while ((entryMatch = entryRe.exec(block)) !== null) {
        rawMap.set(`${namespace}.${entryMatch[1]}`, entryMatch[2]);
      }
    }

    return this.resolveTemplates(rawMap);
  }

  // Multi-pass substitution: resolves ${NAMESPACE.KEY} chains and strips unknown vars (e.g. ${environment.url_api})
  private resolveTemplates(rawMap: Map<string, string>): Map<string, string> {
    const working = new Map(rawMap);
    const varRe = /\$\{([^}]+)\}/g;

    let changed = true;
    while (changed) {
      changed = false;
      for (const [key, value] of working) {
        const newValue = value.replace(varRe, (_, name: string) => {
          const trimmed = name.trim();
          if (working.has(trimmed)) {
            changed = true;
            return working.get(trimmed)!;
          }
          return ''; // unknown runtime var (e.g. environment.url_api) → strip it
        });
        if (newValue !== value) {
          working.set(key, newValue);
          changed = true;
        }
      }
    }

    const resolved = new Map<string, string>();
    for (const [key, value] of working) {
      // Strip any leftover ${...} and normalise duplicate slashes
      const clean = value.replace(varRe, '').replace(/\/+/g, '/');
      resolved.set(key, clean.startsWith('/') ? clean : `/${clean}`);
    }
    return resolved;
  }

  private scanServiceFiles(
    frontendPath: string,
    constantsMap: Map<string, string>,
  ): AngularInventory['services'] {
    const results: AngularInventory['services'] = [];
    const serviceFiles = this.findServiceFiles(path.join(frontendPath, 'src'));

    for (const filePath of serviceFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const httpCalls = this.extractHttpCalls(content, constantsMap);
      if (httpCalls.length === 0) continue;

      // "jobs.service.ts" → "JobsService"
      const stem = path.basename(filePath, '.ts');
      const name = stem.split('.').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
      results.push({ name, filePath, httpCalls });
    }

    return results;
  }

  private extractHttpCalls(content: string, constantsMap: Map<string, string>): HttpCall[] {
    const calls: HttpCall[] = [];
    // Capture: this.http.METHOD(  <first-argument>
    // Stops at first comma, closing paren, or newline — enough to grab the URL arg.
    const httpRe = /this\.http\.(get|post|put|patch|delete)\(\s*([^,)\n]+)/gi;
    let match: RegExpExecArray | null;

    while ((match = httpRe.exec(content)) !== null) {
      const method = match[1].toUpperCase() as HttpCall['method'];
      const argStr = match[2].trim();

      // Pattern 1 — direct constant: ROUTES_PRIVATE.CATEGORIES
      const directMatch = argStr.match(/^(ROUTES_\w+\.\w+)/);
      if (directMatch) {
        const urlPattern = constantsMap.get(directMatch[1]);
        if (urlPattern) this.addCall(calls, method, urlPattern);
        continue;
      }

      // Pattern 2 — template literal starting with a constant: `${ROUTES_PRIVATE.JOBS}/${id}`
      const templateMatch = argStr.match(/^`\$\{(ROUTES_\w+\.\w+)\}([^`]*)/);
      if (templateMatch) {
        const base = constantsMap.get(templateMatch[1]);
        if (base) {
          // Replace dynamic segments like /${id} with /:id
          const suffix = (templateMatch[2] ?? '').replace(/\/\$\{[^}]+\}/g, '/:id');
          this.addCall(calls, method, `${base}${suffix}`);
        }
      }
    }

    return calls;
  }

  private addCall(calls: HttpCall[], method: HttpCall['method'], urlPattern: string): void {
    if (!calls.some(c => c.method === method && c.urlPattern === urlPattern)) {
      calls.push({ method, urlPattern });
    }
  }

  private findServiceFiles(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    const results: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
        results.push(...this.findServiceFiles(full));
      } else if (entry.isFile() && entry.name.endsWith('.service.ts')) {
        results.push(full);
      }
    }
    return results;
  }
}
