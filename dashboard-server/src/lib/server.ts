import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import * as fs from 'fs';
import * as path from 'path';
import { DashboardDb } from '@ai-web-qa-tester/dashboard-db';

export async function createServer(port = 4000): Promise<void> {
  const fastify = Fastify({ logger: false });
  const db = new DashboardDb();

  await fastify.register(fastifyCors, { origin: true });

  // ── Projects ────────────────────────────────────────────────────────────
  fastify.get('/api/projects', async () => db.getProjects());

  fastify.get<{ Params: { id: string } }>('/api/projects/:id', async (req, reply) => {
    const project = db.getProject(Number(req.params.id));
    if (!project) return reply.status(404).send({ error: 'Project not found' });
    return project;
  });

  fastify.get<{ Params: { id: string } }>('/api/projects/:id/runs', async (req, reply) => {
    const project = db.getProject(Number(req.params.id));
    if (!project) return reply.status(404).send({ error: 'Project not found' });
    return db.getRuns(Number(req.params.id));
  });

  // ── Runs ─────────────────────────────────────────────────────────────────
  fastify.get<{ Params: { id: string } }>('/api/runs/:id', async (req, reply) => {
    const run = db.getRun(Number(req.params.id));
    if (!run) return reply.status(404).send({ error: 'Run not found' });
    const project = db.getProject(run.project_id);
    return { ...run, project };
  });

  fastify.get<{ Params: { id: string } }>('/api/runs/:id/results', async (req, reply) => {
    const run = db.getRun(Number(req.params.id));
    if (!run) return reply.status(404).send({ error: 'Run not found' });
    const results = db.getRunResults(Number(req.params.id));
    return results.map(r => ({
      ...r,
      attachments: r.attachments ? JSON.parse(r.attachments) : [],
    }));
  });

  // ── Artifacts ─────────────────────────────────────────────────────────────
  // Streams a local artifact file (screenshot/video/trace) by absolute path.
  // Local-only tool — no auth needed.
  fastify.get<{ Querystring: { filePath: string } }>('/api/artifact', async (req, reply) => {
    const filePath = decodeURIComponent(req.query.filePath);
    if (!path.isAbsolute(filePath) || !fs.existsSync(filePath)) {
      return reply.status(404).send({ error: 'Artifact not found' });
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType =
      ext === '.png' ? 'image/png' :
      ext === '.webm' ? 'video/webm' :
      ext === '.mp4' ? 'video/mp4' :
      ext === '.zip' ? 'application/zip' :
      'application/octet-stream';
    reply.header('Content-Type', contentType);
    return reply.send(fs.createReadStream(filePath));
  });

  // ── React UI (served after build) ──────────────────────────────────────────
  const uiDist = path.resolve(__dirname, '../../../../dist/dashboard-ui');
  if (fs.existsSync(uiDist)) {
    await fastify.register(fastifyStatic, { root: uiDist, prefix: '/' });
    fastify.setNotFoundHandler((_req, reply) => {
      reply.sendFile('index.html');
    });
  } else {
    fastify.get('/', async (_req, reply) => {
      reply.type('text/html').send(`
        <html><body style="font-family:sans-serif;padding:2rem">
          <h2>QA Tester Dashboard API</h2>
          <p>Frontend not built yet. Run <code>npm run build --workspace=dashboard-ui</code>.</p>
          <ul>
            <li><a href="/api/projects">/api/projects</a></li>
          </ul>
        </body></html>
      `);
    });
  }

  await fastify.listen({ port, host: '127.0.0.1' });
  console.log(`\nQA Tester Dashboard running at http://localhost:${port}`);
  console.log('Press Ctrl+C to stop.\n');
}
