import { ProjectManifest } from '@ai-web-qa-tester/core-domain';

export interface ManifestWriterPort {
  write(manifest: ProjectManifest, targetDir: string): Promise<void>;
}
