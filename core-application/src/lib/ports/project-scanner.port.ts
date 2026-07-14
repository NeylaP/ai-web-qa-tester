import { FrameworkDetection } from '@ai-web-qa-tester/core-domain';

export interface ProjectScannerPort {
  detect(absolutePath: string): Promise<FrameworkDetection>;
}
