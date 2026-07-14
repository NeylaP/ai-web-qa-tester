export interface ProcessManagerPort {
  start(command: string, cwd: string): Promise<void>;
  waitForReady(url: string, timeoutMs: number): Promise<void>;
  stop(): Promise<void>;
}
