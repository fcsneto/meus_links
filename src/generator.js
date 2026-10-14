const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const contentFile = path.join(root, 'content', 'site.json');
const publicDir = path.join(root, 'public');
const sourceCss = path.join(root, 'src', 'main.css');

function stylesheetAsset() {
  const content = fs.readFileSync(sourceCss);
  const hash = crypto.createHash('sha256').update(content).digest('hex').slice(0, 10);
  return `style/main.${hash}.css`;
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalizeSlug(value) {
  return String(value || '')
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .map((part) => part
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, ''))
    .filter(Boolean)
    .join('/');
}

function assertValid(data) {
  if (!data || typeof data !== 'object') throw new Error('Conteúdo inválido.');
  if (!data.site?.name) throw new Error('O nome do site é obrigatório.');
  const seen = new Set();
  for (const item of [...(data.pages || []), ...(data.redirects || [])]) {
    const slug = normalizeSlug(item.slug);
    if (!slug) throw new Error('Toda página ou atalho precisa de um slug.');
    if (slug !== item.slug) throw new Error(`Slug inválido: "${item.slug}". Sugestão: "${slug}".`);
    if (seen.has(slug)) throw new Error(`Slug duplicado: "${slug}".`);
    seen.add(slug);
  }
  return true;
}

function icon(name) {
  const paths = {
    youtube: '<path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z"/>',
    instagram: '<path d="M12 2.2c3.2 0 3.6 0 4.9.1 3.3.2 4.8 1.7 5 5 .1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.2 3.3-1.7 4.8-5 5-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-3.3-.2-4.8-1.7-5-5C2 15.8 2 15.4 2 12.2s0-3.6.1-4.9c.2-3.3 1.7-4.8 5-5 1.3-.1 1.7-.1 4.9-.1Zm0-2.2C8.7 0 8.3 0 7 .1 2.6.3.3 2.6.1 7 0 8.3 0 8.7 0 12s0 3.7.1 5c.2 4.4 2.5 6.7 6.9 6.9 1.3.1 1.7.1 5 .1s3.7 0 5-.1c4.4-.2 6.7-2.5 6.9-6.9.1-1.3.1-1.7.1-5s0-3.7-.1-5C23.7 2.6 21.4.3 17 .1 15.7 0 15.3 0 12 0Zm0 5.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.4-11.9a1.4 1.4 0 1 0 0 2.9 1.4 1.4 0 0 0 0-2.9Z"/>',
    twitch: '<path d="M2 0 0 4v17h6v3h3l3-3h5l7-7V0H2Zm20 13-4 4h-7l-3 3v-3H3V2h19v11ZM17 5h-2v6h2V5Zm-6 0H9v6h2V5Z"/>',
    tiktok: '<path d="M16.7 0c.4 3.5 2.4 5.6 5.8 5.8v3.9a10 10 0 0 1-5.7-1.8v7.3a8.4 8.4 0 1 1-7.2-8.3v4a4.5 4.5 0 1 0 3.2 4.3V0h3.9Z"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || '<circle cx="12" cy="12" r="10"/>'}</svg>`;
}

function renderProfile(data) {
  const social = (data.socials || []).map((item) => `<li><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener" aria-label="${escapeHtml(item.label)}">${icon(item.icon)}</a></li>`).join('');
  return `<header class="profile">
    <img src="${escapeHtml(data.site.avatar)}" alt="${escapeHtml(data.site.name)}" width="160" height="160">
    <h1>${escapeHtml(data.site.name)}</h1>
    <p>${escapeHtml(data.site.description)}</p>
    <ul class="socials">${social}</ul>
  </header>`;
}

function renderLink(item) {
  const external = item.newTab ? ' target="_blank" rel="noopener"' : '';
  return `<li><a class="button button--${escapeHtml(item.style || 'primary')}" href="${escapeHtml(item.url)}"${external}>${escapeHtml(item.label)}</a></li>`;
}

function renderSection(section) {
  const links = (section.links || []).map(renderLink).join('');
  return `<section class="link-section">
    ${section.title ? `<h2>${escapeHtml(section.title)}</h2>` : ''}
    ${section.bodyHtml ? `<div class="rich-text">${section.bodyHtml}</div>` : ''}
    ${links ? `<ul class="link-list">${links}</ul>` : ''}
  </section>`;
}

function layout(data, { title, description = '', body, canonicalPath = '/' }) {
  const pageTitle = title === data.site.title ? title : `${title} — ${data.site.title}`;
  const canonical = `${String(data.site.baseUrl || '').replace(/\/$/, '')}${canonicalPath}`;
  const theme = data.theme || {};
  return `<!doctype html>
<html lang="${escapeHtml(data.site.language || 'pt-BR')}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(description || data.site.description)}">
  <meta name="theme-color" content="${escapeHtml(theme.background || '#050505')}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <link rel="stylesheet" href="/${stylesheetAsset()}">
  <style>:root{--bg:${escapeHtml(theme.background)};--surface:${escapeHtml(theme.surface)};--primary:${escapeHtml(theme.primary)};--text:${escapeHtml(theme.text)};--muted:${escapeHtml(theme.muted)};--radius:${Number(theme.radius) || 12}px}</style>
</head>
<body>
  <div class="page-shell">${body}</div>
  <footer>${data.site.footer || ''}</footer>
</body>
</html>
`;
}

function renderHome(data) {
  const sections = (data.home?.sections || []).map(renderSection).join('');
  return layout(data, {
    title: data.site.title,
    description: data.site.description,
    canonicalPath: '/',
    body: `${renderProfile(data)}<main>${sections}</main>`
  });
}

function parentPath(slug) {
  const parts = slug.split('/');
  parts.pop();
  return parts.length ? `/${parts.join('/')}/` : '/';
}

function renderPage(data, page) {
  const sections = (page.sections || []).map(renderSection).join('');
  const heading = page.showProfile ? renderProfile(data) : `<header class="article-title"><h1>${escapeHtml(page.title)}</h1></header>`;
  const intro = page.introHtml ? `<div class="rich-text article-intro">${page.introHtml}</div>` : '';
  return layout(data, {
    title: page.title,
    description: page.description || data.site.description,
    canonicalPath: `/${page.slug}/`,
    body: `${heading}<main><nav class="back"><a href="${parentPath(page.slug)}">← Voltar</a></nav>${page.showProfile ? `<h1 class="page-title">${escapeHtml(page.title)}</h1>` : ''}${intro}${sections}</main>`
  });
}

function renderRedirect(data, redirect) {
  const target = escapeHtml(redirect.target);
  return `<!doctype html>
<html lang="${escapeHtml(data.site.language || 'pt-BR')}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(redirect.title)} — ${escapeHtml(data.site.title)}</title>
  <meta http-equiv="refresh" content="0; url=${target}">
  <link rel="canonical" href="${target}">
  <script>location.replace(${JSON.stringify(redirect.target)});</script>
</head>
<body><p>Redirecionando para <a href="${target}">${escapeHtml(redirect.title)}</a>…</p></body>
</html>
`;
}

function writeRoute(slug, html) {
  const dir = slug ? path.join(publicDir, ...slug.split('/')) : publicDir;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
  return slug ? `${slug}/index.html` : 'index.html';
}

function writeLegacyPath(relative, html) {
  const normalized = String(relative || '').replaceAll('\\', '/').replace(/^\/+/, '');
  if (!normalized || normalized.includes('..') || !normalized.endsWith('.html')) throw new Error(`Caminho legado inválido: "${relative}".`);
  const file = path.join(publicDir, ...normalized.split('/'));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html, 'utf8');
  return normalized;
}

function build(input) {
  const data = input || JSON.parse(fs.readFileSync(contentFile, 'utf8'));
  assertValid(data);
  const previousManifestFile = path.join(publicDir, '.generated.json');
  if (fs.existsSync(previousManifestFile)) {
    const previous = JSON.parse(fs.readFileSync(previousManifestFile, 'utf8'));
    for (const relative of previous.files || []) {
      const target = path.resolve(publicDir, relative);
      if ((target === publicDir || target.startsWith(`${publicDir}${path.sep}`)) && fs.existsSync(target)) fs.rmSync(target);
    }
  }

  fs.mkdirSync(path.join(publicDir, 'style'), { recursive: true });
  fs.copyFileSync(sourceCss, path.join(publicDir, 'style', 'main.css'));
  const versionedStylesheet = stylesheetAsset();
  fs.copyFileSync(sourceCss, path.join(publicDir, ...versionedStylesheet.split('/')));

  const files = [writeRoute('', renderHome(data))];
  for (const page of data.pages || []) files.push(writeRoute(page.slug, renderPage(data, page)));
  for (const redirect of data.redirects || []) {
    const html = renderRedirect(data, redirect);
    files.push(writeRoute(redirect.slug, html));
    if (redirect.legacyPath) files.push(writeLegacyPath(redirect.legacyPath, html));
  }
  files.push('style/main.css', versionedStylesheet);
  fs.writeFileSync(previousManifestFile, `${JSON.stringify({ generatedAt: new Date().toISOString(), files }, null, 2)}\n`);
  return { files, generatedAt: new Date().toISOString() };
}

module.exports = { assertValid, build, escapeHtml, normalizeSlug, renderHome, renderPage, renderRedirect };
