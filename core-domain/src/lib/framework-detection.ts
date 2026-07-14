export type FrameworkType = 'angular' | 'nestjs' | 'unknown';

export interface FrameworkDetection {
  framework: FrameworkType;
  version: string | null;
}
