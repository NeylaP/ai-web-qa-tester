import { useState, useEffect } from 'react';

interface Project {
  id: number;
  name: string;
  path: string;
  created_at: string;
}

interface Run {
  id: number;
  project_id: number;
  generated_at: string;
  base_url: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [lastRuns, setLastRuns] = useState<Record<number, Run>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(async (ps: Project[]) => {
        setProjects(ps);
        const runs: Record<number, Run> = {};
        await Promise.all(ps.map(async p => {
          const r = await fetch(`/api/projects/${p.id}/runs`).then(x => x.json()) as Run[];
          if (r[0]) runs[p.id] = r[0];
        }));
        setLastRuns(runs);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading projects...</div>;

  return (
    <div className="page container">
      <div className="page-header">
        <h1 className="page-title">Projects</h1>
        <p className="page-subtitle">
          {projects.length === 0
            ? 'No projects yet — run qa-tester pipeline to record your first run.'
            : `${projects.length} project${projects.length !== 1 ? 's' : ''} tracked`}
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="empty">
          No data yet. Run <code>qa-tester pipeline</code> to track your first run.
        </div>
      ) : (
        <div className="grid">
          {projects.map(p => {
            const run = lastRuns[p.id];
            const allPassed = run && run.failed === 0 && run.skipped === 0;
            const hasFailed = run && run.failed > 0;
            return (
              <div
                key={p.id}
                className="card"
                onClick={() => { window.location.hash = `#/projects/${p.id}`; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className="card-title">{p.name}</div>
                  {run && (
                    <span className={`badge badge-${hasFailed ? 'failed' : allPassed ? 'passed' : 'skipped'}`}>
                      {hasFailed ? 'failing' : allPassed ? 'passing' : 'partial'}
                    </span>
                  )}
                </div>
                <div className="card-path" title={p.path}>{p.path}</div>
                {run ? (
                  <div className="card-meta">
                    <span className="card-meta-item">
                      Last run: {new Date(run.generated_at).toLocaleDateString()}
                    </span>
                    <span className="card-meta-item" style={{ color: 'var(--passed)' }}>
                      {run.passed} passed
                    </span>
                    {run.failed > 0 && (
                      <span className="card-meta-item" style={{ color: 'var(--failed)' }}>
                        {run.failed} failed
                      </span>
                    )}
                    <span className="card-meta-item">{run.total} total</span>
                  </div>
                ) : (
                  <div className="card-meta">
                    <span className="card-meta-item">No runs yet</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
