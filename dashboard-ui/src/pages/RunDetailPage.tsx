import { useState, useEffect } from 'react';

interface Attachment { type: 'screenshot' | 'video' | 'trace'; name: string; path: string; contentType: string; }
interface TestResult {
  id: number;
  run_id: number;
  title: string;
  endpoint: string;
  method: string;
  status: string;
  duration_ms: number;
  error: string | null;
  attachments: Attachment[];
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
  project: { id: number; name: string; path: string };
}

function artifactUrl(filePath: string) {
  return `/api/artifact?filePath=${encodeURIComponent(filePath)}`;
}

function MethodBadge({ method }: { method: string }) {
  return <span className={`method-badge method-${method}`}>{method}</span>;
}

function ResultRow({ result }: { result: TestResult }) {
  const [expanded, setExpanded] = useState(result.status === 'failed');
  const [lightbox, setLightbox] = useState<string | null>(null);

  const screenshots = result.attachments.filter(a => a.type === 'screenshot');
  const videos = result.attachments.filter(a => a.type === 'video');

  const hasDetails = result.error || screenshots.length > 0 || videos.length > 0;

  return (
    <>
      <tr
        className={hasDetails ? 'clickable' : ''}
        onClick={() => hasDetails && setExpanded(e => !e)}
        style={{ borderLeft: `3px solid ${result.status === 'passed' ? 'var(--passed)' : result.status === 'failed' ? 'var(--failed)' : 'var(--border)'}` }}
      >
        <td><MethodBadge method={result.method || 'GET'} /></td>
        <td className="endpoint-cell">{result.endpoint || result.title}</td>
        <td>
          <span className={`badge badge-${result.status}`}>{result.status}</span>
        </td>
        <td className="duration-cell">{result.duration_ms}ms</td>
        <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
          {hasDetails ? (expanded ? '▲ hide' : '▼ details') : ''}
        </td>
      </tr>

      {expanded && hasDetails && (
        <tr className="result-row-expanded">
          <td colSpan={5} style={{ padding: '1rem 1.25rem 1.25rem' }}>
            {result.error && (
              <>
                <div style={{ fontSize: '0.75rem', color: 'var(--failed)', fontWeight: 600, marginBottom: '0.375rem' }}>
                  ERROR
                </div>
                <div className="error-block">{result.error}</div>
              </>
            )}

            {screenshots.length > 0 && (
              <div style={{ marginTop: result.error ? '1rem' : 0 }}>
                <div className="attachment-label">Screenshots ({screenshots.length})</div>
                <div className="attachments">
                  {screenshots.map((a, i) => (
                    <img
                      key={i}
                      className="attachment-img"
                      src={artifactUrl(a.path)}
                      alt={a.name}
                      onClick={e => { e.stopPropagation(); setLightbox(artifactUrl(a.path)); }}
                    />
                  ))}
                </div>
              </div>
            )}

            {videos.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <div className="attachment-label">Videos ({videos.length})</div>
                <div className="attachments">
                  {videos.map((a, i) => (
                    <video
                      key={i}
                      className="attachment-video"
                      src={artifactUrl(a.path)}
                      controls
                      onClick={e => e.stopPropagation()}
                    />
                  ))}
                </div>
              </div>
            )}
          </td>
        </tr>
      )}

      {lightbox && (
        <tr>
          <td colSpan={5} style={{ padding: 0, border: 'none' }}>
            <div className="lightbox" onClick={() => setLightbox(null)}>
              <img src={lightbox} alt="screenshot" />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function RunDetailPage({ runId }: { runId: number }) {
  const [run, setRun] = useState<Run | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [filter, setFilter] = useState<'all' | 'failed' | 'passed'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/runs/${runId}`).then(r => r.json()),
      fetch(`/api/runs/${runId}/results`).then(r => r.json()),
    ]).then(([r, rs]: [Run, TestResult[]]) => {
      setRun(r);
      setResults(rs);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [runId]);

  if (loading) return <div className="loading">Loading run...</div>;
  if (!run) return <div className="empty">Run not found.</div>;

  const displayed = results.filter(r =>
    filter === 'all' ? true : r.status === filter
  );

  return (
    <div className="page container">
      <button className="btn-back" onClick={() => { window.location.hash = `#/projects/${run.project_id}`; }}>
        ← Back to {run.project?.name ?? 'project'}
      </button>

      <div className="page-header">
        <h1 className="page-title">Run — {new Date(run.generated_at).toLocaleString()}</h1>
        <p className="page-subtitle" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{run.base_url}</p>
      </div>

      <div className="summary-bar">
        <div className="summary-item">
          <span className="summary-label">Total</span>
          <span className="summary-value">{run.total}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Passed</span>
          <span className="summary-value passed">{run.passed}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Failed</span>
          <span className="summary-value failed">{run.failed}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Skipped</span>
          <span className="summary-value skipped">{run.skipped}</span>
        </div>
        <div className="summary-item" style={{ marginLeft: 'auto' }}>
          <span className="summary-label">Filter</span>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
            {(['all', 'failed', 'passed'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '0.2rem 0.6rem',
                  borderRadius: '4px',
                  border: '1px solid var(--border)',
                  background: filter === f ? 'var(--accent)' : 'transparent',
                  color: filter === f ? '#fff' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {displayed.length === 0 ? (
        <div className="empty">No results match the current filter.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Method</th>
                <th>Endpoint</th>
                <th style={{ width: '100px' }}>Status</th>
                <th style={{ width: '100px' }}>Duration</th>
                <th style={{ width: '80px' }}></th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(r => <ResultRow key={r.id} result={r} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
