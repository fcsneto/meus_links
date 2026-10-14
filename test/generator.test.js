const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { assertValid, escapeHtml, normalizeSlug, renderHome, renderPage, renderRedirect } = require('../src/generator');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'content', 'site.json'), 'utf8'));

test('conteúdo principal é válido', () => {
  assert.equal(assertValid(data), true);
});

test('normaliza slugs em português e aninhados', () => {
  assert.equal(normalizeSlug('/Ajude/Indicação/'), 'ajude/indicacao');
});

test('rejeita slugs duplicados entre páginas e atalhos', () => {
  const invalid = structuredClone(data);
  invalid.redirects.push({ slug: invalid.pages[0].slug, title: 'Duplicado', target: 'https://example.com' });
  assert.throws(() => assertValid(invalid), /Slug duplicado/);
});

test('escapa texto inserido em campos simples', () => {
  assert.equal(escapeHtml('<script>"oi"</script>'), '&lt;script&gt;&quot;oi&quot;&lt;/script&gt;');
});

test('renderiza home, página e redirecionamento completos', () => {
  const home = renderHome(data);
  const page = renderPage(data, data.pages[0]);
  const redirect = renderRedirect(data, data.redirects[0]);
  assert.match(home, /Francisco Neto/);
  assert.match(home, /Produtos divulgados/);
  assert.match(home, /\/style\/main\.[a-f0-9]{10}\.css/);
  assert.match(page, /\/ajude\/indicacao\//);
  assert.match(redirect, /location\.replace/);
  assert.match(redirect, /chat\.whatsapp\.com/);
});
