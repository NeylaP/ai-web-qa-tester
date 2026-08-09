import { useState, useEffect } from 'react';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import RunDetailPage from './pages/RunDetailPage';

function parseHash(): { page: string; id?: number } {
  const hash = window.location.hash.replace('#', '') || '/';
  const [, page, idStr] = hash.split('/');
  return { page: page || '', id: idStr ? Number(idStr) : undefined };
}

export default function App() {
  const [route, setRoute] = useState(parseHash);

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <>
      <nav className="navbar">
        <div className="container navbar-inner">
          <a href="#/" className="navbar-brand">
            🧪 QA Tester <span>Dashboard</span>
          </a>
        </div>
      </nav>

      {!route.page && <ProjectsPage />}
      {route.page === 'projects' && route.id !== undefined && (
        <ProjectDetailPage projectId={route.id} />
      )}
      {route.page === 'runs' && route.id !== undefined && (
        <RunDetailPage runId={route.id} />
      )}
    </>
  );
}
