const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { execFile, spawn } = require('node:child_process');
const { promisify } = require('node:util');
const { assertValid, build } = require('../src/generator');

const exec = promisify(execFile);
const root = path.resolve(__dirname, '..');
const adminDir = path.join(root, 'admin', 'static');
const publicDir = path.join(root, 'public');
const contentFile = path.join(root, 'content', 'site.json');
const port = Number(process.env.PORT) || 4173;
const host = '127.0.0.1';

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function json(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
}

function body(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 2_000_000) reject(new Error('Conteúdo grande demais.'));
    });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('JSON inválido.')); }
    });
    req.on('error', reject);
  });
}

function safePath(base, requestPath) {
  const target = path.resolve(base, requestPath.replace(/^[/\\]+/, ''));
  return target === base || target.startsWith(`${base}${path.sep}`) ? target : null;
}

function serveFile(res, file, transformPreview = false) {
  if (!file || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return false;
  const extension = path.extname(file).toLowerCase();
  let content = fs.readFileSync(file);
  if (transformPreview && extension === '.html') {
    content = Buffer.from(content.toString('utf8')
      .replaceAll('href="/', 'href="/preview/')
      .replaceAll('src="/', 'src="/preview/'));
  }
  res.writeHead(200, { 'Content-Type': mime[extension] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  res.end(content);
  return true;
}

async function git(args) {
  const { stdout, stderr } = await exec('git', args, { cwd: root, windowsHide: true, maxBuffer: 1024 * 1024 });
  return `${stdout || ''}${stderr || ''}`.trim();
}

async function status() {
  let gitStatus = '';
  let branch = '';
  let lastCommit = '';
  try {
    [gitStatus, branch, lastCommit] = await Promise.all([
      git(['status', '--short']),
      git(['branch', '--show-current']),
      git(['log', '-1', '--pretty=%h · %s · %cr'])
    ]);
  } catch { /* O painel continua útil mesmo sem Git. */ }
  let generatedAt = null;
  const manifest = path.join(publicDir, '.generated.json');
  if (fs.existsSync(manifest)) generatedAt = JSON.parse(fs.readFileSync(manifest, 'utf8')).generatedAt;
  return { gitStatus, branch, lastCommit, generatedAt };
}

async function publish(message) {
  build();
  await git(['add', '--', 'content/site.json', 'public']);
  let createdCommit = false;
  try {
    await git(['diff', '--cached', '--quiet', '--', 'content/site.json', 'public']);
  } catch (error) {
    if (error.code !== 1) throw error;
    const cleanMessage = String(message || '').trim() || `Atualiza neto.bio (${new Date().toLocaleDateString('pt-BR')})`;
    await git(['commit', '-m', cleanMessage, '--', 'content/site.json', 'public']);
    createdCommit = true;
  }
  const branch = await git(['branch', '--show-current']);
  await git(['push', 'origin', branch]);
  return { published: createdCommit, message: createdCommit ? 'Versão enviada ao GitHub.' : 'Não havia uma nova versão; a branch foi sincronizada.', ...(await status()) };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || `${host}:${port}`}`);
  try {
    if (req.method === 'GET' && url.pathname === '/api/site') {
      return json(res, 200, { site: JSON.parse(fs.readFileSync(contentFile, 'utf8')), status: await status() });
    }
    if (req.method === 'GET' && url.pathname === '/api/status') return json(res, 200, await status());
    if (req.method === 'PUT' && url.pathname === '/api/site') {
      const data = await body(req);
      assertValid(data);
      const temporary = `${contentFile}.tmp`;
      fs.writeFileSync(temporary, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
      fs.renameSync(temporary, contentFile);
      return json(res, 200, { saved: true });
    }
    if (req.method === 'POST' && url.pathname === '/api/build') {
      const result = build();
      return json(res, 200, { built: true, ...result, status: await status() });
    }
    if (req.method === 'POST' && url.pathname === '/api/publish') {
      const data = await body(req);
      return json(res, 200, await publish(data.message));
    }
    if (url.pathname.startsWith('/preview')) {
      const relative = decodeURIComponent(url.pathname.slice('/preview'.length)) || '/';
      let file = safePath(publicDir, relative);
      if (file && fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
      if (serveFile(res, file, true)) return;
      return json(res, 404, { error: 'Página de prévia não encontrada. Gere o site primeiro.' });
    }
    const requested = url.pathname === '/' ? '/index.html' : url.pathname;
    if (serveFile(res, safePath(adminDir, requested))) return;
    json(res, 404, { error: 'Não encontrado.' });
  } catch (error) {
    console.error(error);
    json(res, 400, { error: error.message || 'Erro inesperado.' });
  }
});

server.listen(port, host, () => {
  const url = `http://${host}:${port}`;
  console.log(`Painel do neto.bio disponível em ${url}`);
  console.log('Pressione Ctrl+C para encerrar.');
  if (!process.env.NO_OPEN) {
    if (process.platform === 'win32') spawn('cmd.exe', ['/c', 'start', '', url], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
    else if (process.platform === 'darwin') spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
    else spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
  }
});
