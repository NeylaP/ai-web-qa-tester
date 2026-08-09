import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { TestReport } from '@ai-web-qa-tester/core-domain';

export interface DbProject {
  id: number;
  name: string;
  path: string;
  created_at: string;
}

export interface DbRun {
  id: number;
  project_id: number;
  generated_at: string;
  base_url: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
}

export interface DbTestResult {
  id: number;
  run_id: number;
  title: string;
  endpoint: string;
  method: string;
  status: string;
  duration_ms: number;
  error: string | null;
  attachments: string | null;
}

interface DbStore {
  projects: DbProject[];
  runs: DbRun[];
  test_results: DbTestResult[];
  _seq: { project: number; run: number; result: number };
}

const DB_DIR = path.join(os.homedir(), '.qa-tester');
const DB_PATH = path.join(DB_DIR, 'dashboard.json');

function emptyStore(): DbStore {
  return { projects: [], runs: [], test_results: [], _seq: { project: 0, run: 0, result: 0 } };
}

export class DashboardDb {
  private store: DbStore;
  private dbPath: string;

  constructor(dbPath = DB_PATH) {
    this.dbPath = dbPath;
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    if (fs.existsSync(dbPath)) {
      this.store = JSON.parse(fs.readFileSync(dbPath, 'utf-8')) as DbStore;
    } else {
      this.store = emptyStore();
    }
  }

  saveRun(projectName: string, projectPath: string, report: TestReport): number {
    const projectId = this.upsertProject(projectName, projectPath);

    const runId = ++this.store._seq.run;
    this.store.runs.push({
      id: runId,
      project_id: projectId,
      generated_at: report.generatedAt,
      base_url: report.baseUrl,
      total: report.summary.total,
      passed: report.summary.passed,
      failed: report.summary.failed,
      skipped: report.summary.skipped,
    });

    for (const r of report.results) {
      const resultId = ++this.store._seq.result;
      this.store.test_results.push({
        id: resultId,
        run_id: runId,
        title: r.title,
        endpoint: r.endpoint,
        method: r.method,
        status: r.status,
        duration_ms: r.durationMs,
        error: r.error ?? null,
        attachments: r.attachments ? JSON.stringify(r.attachments) : null,
      });
    }

    this.flush();
    return runId;
  }

  getProjects(): DbProject[] {
    return [...this.store.projects].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }

  getRuns(projectId: number): DbRun[] {
    return this.store.runs
      .filter(r => r.project_id === projectId)
      .sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime());
  }

  getRun(runId: number): DbRun | undefined {
    return this.store.runs.find(r => r.id === runId);
  }

  getRunResults(runId: number): DbTestResult[] {
    return this.store.test_results.filter(r => r.run_id === runId);
  }

  getProject(projectId: number): DbProject | undefined {
    return this.store.projects.find(p => p.id === projectId);
  }

  close(): void { /* no-op for JSON store */ }

  private upsertProject(name: string, projectPath: string): number {
    const existing = this.store.projects.find(p => p.path === projectPath);
    if (existing) return existing.id;

    const id = ++this.store._seq.project;
    this.store.projects.push({ id, name, path: projectPath, created_at: new Date().toISOString() });
    return id;
  }

  private flush(): void {
    fs.writeFileSync(this.dbPath, JSON.stringify(this.store, null, 2), 'utf-8');
  }
}
