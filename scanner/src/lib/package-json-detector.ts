import * as fs from 'node:fs';
import * as path from 'node:path';
import { FrameworkDetection } from '@ai-web-qa-tester/core-domain';
import { ProjectScannerPort } from '@ai-web-qa-tester/core-application';

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

function stripSemverPrefix(version: string): string {
  return version.replace(/^[^0-9]*/, '');
}

function readPackageJson(dir: string): PackageJson | null {
  const pkgPath = path.join(dir, 'package.json');
  try {
    const raw = fs.readFileSync(pkgPath, 'utf8');
    return JSON.parse(raw) as PackageJson;
  } catch {
    return null;
  }
}

function findDep(pkg: PackageJson, name: string): string | null {
  return (
    pkg.dependencies?.[name] ??
    pkg.devDependencies?.[name] ??
    null
  );
}

export class PackageJsonDetector implements ProjectScannerPort {
  async detect(absolutePath: string): Promise<FrameworkDetection> {
    const pkg = readPackageJson(absolutePath);

    if (!pkg) {
      return { framework: 'unknown', version: null };
    }

    const angularVersion = findDep(pkg, '@angular/core');
    if (angularVersion !== null) {
      return { framework: 'angular', version: stripSemverPrefix(angularVersion) };
    }

    const nestVersion = findDep(pkg, '@nestjs/core');
    if (nestVersion !== null) {
      return { framework: 'nestjs', version: stripSemverPrefix(nestVersion) };
    }

    return { framework: 'unknown', version: null };
  }
}
