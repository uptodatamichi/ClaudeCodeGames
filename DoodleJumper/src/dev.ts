import { Hono } from 'hono';
import { join } from 'path';

const app = new Hono();
const assetsRoot = join(import.meta.dir, '..', 'assets', '@scope', 'package-name');

app.get('/', (c) => c.redirect('/app/'));

app.get('/app/*', async (c) => {
    const file = Bun.file(join(assetsRoot, 'index.html'));
    return new Response(file, { headers: { 'Content-Type': 'text/html' } });
});

app.get('/game.js', async (c) => {
    const file = Bun.file(join(assetsRoot, 'game.js'));
    return new Response(file, { headers: { 'Content-Type': 'application/javascript' } });
});

app.get('/images/:filename', async (c) => {
    const filename = c.req.param('filename');
    const file = Bun.file(join(assetsRoot, 'images', filename));
    if (!await file.exists()) return c.notFound();
    const ext = filename.split('.').pop()?.toLowerCase();
    const mime: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', wav: 'audio/wav', svg: 'image/svg+xml' };
    return new Response(file, { headers: { 'Content-Type': mime[ext ?? ''] ?? 'application/octet-stream' } });
});

const PORT = 3000;
Bun.serve({ fetch: app.fetch, port: PORT });
console.log(`DoodleJumper dev server running at http://localhost:${PORT}`);
