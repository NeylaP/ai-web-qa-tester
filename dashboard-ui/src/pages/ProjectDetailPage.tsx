import { useState, useEffect } from 'react';

interface Project { id: number; name: string; path: string; created_at: string; }
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

export default function ProjectDetailPage({ projectId }: { projectId: number }) {
  const [project, setProject] = useState<Project | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/${projectId}`).then(r => r.json()),
      fetch(`/api/projects/${projectId}/runs`).then(r => r.json()),
    ]).then(([p, rs]: [Project, Run[]]) => {
      setProject(p);
      setRuns(rs);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [projectId]);

  if (loading) return <div className="loading">Loading...</div>;
  if (!project) return <div className="empty">Project not found.</div>;

  return (
    <div className="page container">
      <button className="btn-back" onClick={() => { window.location.hash = '#/'; }}>
        ← Back to projects
      </button>

      <div className="page-header">
        <h1 className="page-title">{project.name}</h1>
        <p className="page-subtitle" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
          {project.path}
        </p>
      </div>

      {runs.length === 0 ? (
        <div className="empty">No runs recorded yet.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Base URL</th>
                <th>Total</th>
                <th>Passed</th>
                <th>Failed</th>
                <th>Skipped</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {runs.map(run => (
                <tr
                  key={run.id}
                  className="clickable"
                  onClick={() => { window.location.hash = `#/runs/${run.id}`; }}
                >
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {new Date(run.generated_at).toLocaleString()}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{run.base_url}</td>
                  <td>{run.total}</td>
                  <td style={{ color: 'var(--passed)', fontWeight: 600 }}>{run.passed}</td>
                  <td style={{ color: run.failed > 0 ? 'var(--failed)' : 'var(--text-muted)', fontWeight: run.failed > 0 ? 600 : 400 }}>
                    {run.failed}
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{run.skipped}</td>
                  <td>
                    <span className={`badge badge-${run.failed > 0 ? 'failed' : 'passed'}`}>
                      {run.failed > 0 ? 'failed' : 'passed'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
