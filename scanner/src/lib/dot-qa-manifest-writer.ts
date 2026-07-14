import * as fs from 'node:fs';
import * as path from 'node:path';
import { ProjectManifest } from '@ai-web-qa-tester/core-domain';
import { ManifestWriterPort } from '@ai-web-qa-tester/core-application';

export class DotQaManifestWriter implements ManifestWriterPort {
  async write(manifest: ProjectManifest, targetDir: string): Promise<void> {
    const qaDir = path.join(targetDir, '.qa');
    fs.mkdirSync(qaDir, { recursive: true });
    const outPath = path.join(qaDir, 'project-manifest.json');
    fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2), 'utf8');
  }
}
