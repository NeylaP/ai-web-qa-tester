import { exec, ChildProcess } from 'child_process';
import type { ProcessManagerPort } from '@ai-web-qa-tester/core-application';

export class NodeProcessManager implements ProcessManagerPort {
  private child: ChildProcess | null = null;

  async start(command: string, cwd: string): Promise<void> {
    this.child = exec(command, { cwd, maxBuffer: 10 * 1024 * 1024 });
    this.child.stdout?.pipe(process.stdout);
    this.child.stderr?.pipe(process.stderr);
  }

  async waitForReady(url: string, timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    let lastLog = 0;
    while (Date.now() < deadline) {
      try {
        const res = await fetch(url);
        if (res.status < 600) {
          process.stdout.write('\n');
          return;
        }
      } catch {
        // server not ready yet
      }
      const now = Date.now();
      if (now - lastLog >= 5000) {
        const remaining = Math.round((deadline - now) / 1000);
        process.stdout.write(`\rWaiting for server at ${url}... (${remaining}s remaining)`);
        lastLog = now;
      }
      await new Promise<void>(r => setTimeout(r, 500));
    }
    process.stdout.write('\n');
    throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`);
  }

  async stop(): Promise<void> {
    if (!this.child?.pid) return;
    const pid = this.child.pid;
    const child = this.child;
    this.child = null;
    if (process.platform === 'win32') {
      await new Promise<void>((resolve) => exec(`taskkill /F /T /PID ${pid}`, () => resolve()));
    } else {
      child.kill('SIGTERM');
    }
  }
}
