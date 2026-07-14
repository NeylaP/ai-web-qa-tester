import { FrameworkDetection } from './framework-detection';

export interface ProjectManifest {
  frontendPath: string;
  backendPath: string;
  frontend: FrameworkDetection;
  backend: FrameworkDetection;
  scannedAt: string;
}
