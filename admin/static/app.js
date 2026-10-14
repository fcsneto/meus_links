let data = null;
let repo = null;
let active = location.hash.slice(1) || 'dashboard';
let selectedPage = null;
let dirty = false;

const $ = (selector) => document.querySelector(selector);
const content = $('#content');
const titles = { dashboard: 'Visão geral', profile: 'Perfil', home: 'Página inicial', pages: 'Páginas', redirects: 'Atalhos', appearance: 'Aparência', publish: 'Publicar' };
const styles = ['primary', 'light', 'dark', 'wise', 'blue', 'amazon', 'purple'];

function h(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function toast(message, error = false) {
  const el = $('#toast');
  el.textContent = message;
  el.className = error ? 'show error' : 'show';
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.className = ''; }, 3200);
}

function markDirty() {
  dirty = true;
  $('#save-state').textContent = 'Alterações não salvas';
}

function get(path) {
  return path.split('.').reduce((value, key) => value?.[key], data);
}

function set(path, value) {
  const parts = path.split('.');
  const last = parts.pop();
  let target = data;
  for (const part of parts) target = target[part];
  target[last] = value;
  markDirty();
}

function field(label, path, options = {}) {
  const value = get(path) ?? '';
  const wide = options.wide ? ' wide' : '';
  const help = options.help ? `<small>${h(options.help)}</small>` : '';
  if (options.textarea) return `<div class="field${wide}"><label>${h(label)}</label><textarea data-path="${h(path)}" rows="${options.rows || 4}">${h(value)}</textarea>${help}</div>`;
  if (options.checkbox) return `<label class="check${wide}"><input type="checkbox" data-path="${h(path)}" ${value ? 'checked' : ''}> ${h(label)}</label>`;
  return `<div class="field${wide}"><label>${h(label)}</label><input data-path="${h(path)}" type="${options.type || 'text'}" value="${h(value)}" ${options.placeholder ? `placeholder="${h(options.placeholder)}"` : ''}>${help}</div>`;
}

function styleSelect(path, value) {
  return `<select data-path="${h(path)}">${styles.map((style) => `<option value="${style}" ${style === value ? 'selected' : ''}>${style}</option>`).join('')}</select>`;
}

function renderLink(link, path, actions) {
  return `<div class="link-row">
    <div class="field"><label>Texto</label><input data-path="${path}.label" value="${h(link.label)}"></div>
    <div class="field url"><label>Destino</label><input data-path="${path}.url" value="${h(link.url)}"></div>
    <div class="field"><label>Estilo</label>${styleSelect(`${path}.style`, link.style)}</div>
    <label class="check"><input type="checkbox" data-path="${path}.newTab" ${link.newTab ? 'checked' : ''}> Nova aba</label>
    <button class="button danger small" data-action="${actions.remove}" data-indices="${actions.indices}">Remover</button>
  </div>`;
}

function renderSection(section, base, index, scope) {
  const isHome = scope === 'home';
  const actionPrefix = isHome ? 'home' : 'page';
  return `<div class="row-card">
    <div class="row-head"><strong>Seção ${index + 1}</strong><div class="row-actions"><button class="button small" data-action="add-${actionPrefix}-link" data-index="${index}">+ Link</button><button class="button danger small" data-action="remove-${actionPrefix}-section" data-index="${index}">Remover seção</button></div></div>
    <div class="grid">
      ${field('Título da seção', `${base}.title`, { wide: true })}
      ${isHome ? '' : field('Texto ou HTML opcional', `${base}.bodyHtml`, { textarea: true, wide: true, help: 'Aceita HTML para textos, listas e conteúdo mais livre.' })}
    </div>
    <div class="divider"></div>
    ${(section.links || []).length ? section.links.map((link, linkIndex) => renderLink(link, `${base}.links.${linkIndex}`, { remove: `remove-${actionPrefix}-link`, indices: `${index},${linkIndex}` })).join('') : '<div class="empty">Nenhum link nesta seção.</div>'}
  </div>`;
}

function dashboard() {
  const linkCount = (data.home.sections || []).reduce((sum, section) => sum + (section.links || []).length, 0) + (data.pages || []).reduce((sum, page) => sum + (page.sections || []).reduce((count, section) => count + (section.links || []).length, 0), 0);
  return `<div class="hero">
    <section class="hero-card"><p class="eyebrow">SEU SITE, SEM COMPLICAÇÃO</p><h2>Edite aqui.<br>Publique estático.</h2><p>O painel roda apenas no seu computador. O visitante recebe HTML e CSS leves, sem banco de dados e sem área administrativa pública.</p></section>
    <div class="stats"><div class="stat"><strong>${data.pages.length}</strong><span>páginas</span></div><div class="stat"><strong>${linkCount}</strong><span>links</span></div><div class="stat"><strong>${data.redirects.length}</strong><span>atalhos</span></div><div class="stat"><strong>${data.socials.length}</strong><span>redes</span></div></div>
  </div>
  <section class="panel"><div class="panel-head"><div><h2>Fluxo de trabalho</h2><p>Do rascunho ao neto.bio em três etapas.</p></div><button class="button" data-action="build">Gerar agora</button></div><div class="panel-body steps">
    <div class="step"><div><strong>Edite o conteúdo</strong><p>Organize a home, páginas internas, links e atalhos curtos.</p></div></div>
    <div class="step"><div><strong>Gere e confira a prévia</strong><p>O gerador atualiza a pasta public sem precisar editar HTML manualmente.</p></div></div>
    <div class="step"><div><strong>Publique uma versão</strong><p>O painel cria um commit e envia a nova versão estática ao GitHub.</p></div></div>
  </div></section>
  <section class="panel"><div class="panel-head"><div><h2>Repositório</h2><p>${h(repo?.lastCommit || 'Git não disponível')}</p></div><span class="muted">branch ${h(repo?.branch || '—')}</span></div><div class="panel-body"><div class="git">${h(repo?.gitStatus || 'Área de trabalho limpa.')}</div></div></section>`;
}

function profile() {
  return `<section class="panel"><div class="panel-head"><div><h2>Identidade do site</h2><p>Informações reutilizadas na home e nas páginas.</p></div></div><div class="panel-body grid">
    ${field('Nome', 'site.name')}${field('Título do navegador', 'site.title')}${field('Descrição', 'site.description', { wide: true })}${field('Endereço do site', 'site.baseUrl')}${field('Imagem de perfil', 'site.avatar')}${field('Rodapé (aceita HTML)', 'site.footer', { textarea: true, wide: true })}
  </div></section>
  <section class="panel"><div class="panel-head"><div><h2>Redes sociais</h2><p>Ícones exibidos junto do perfil.</p></div><button class="button" data-action="add-social">+ Rede</button></div><div class="panel-body">${data.socials.map((social, index) => `<div class="link-row"><div class="field"><label>Nome</label><input data-path="socials.${index}.label" value="${h(social.label)}"></div><div class="field url"><label>URL</label><input data-path="socials.${index}.url" value="${h(social.url)}"></div><div class="field"><label>Ícone</label><select data-path="socials.${index}.icon">${['youtube','instagram','twitch','tiktok','link'].map((icon) => `<option ${icon === social.icon ? 'selected' : ''}>${icon}</option>`).join('')}</select></div><span></span><button class="button danger small" data-action="remove-social" data-index="${index}">Remover</button></div>`).join('') || '<div class="empty">Nenhuma rede cadastrada.</div>'}</div></section>`;
}

function home() {
  return `<section class="panel"><div class="panel-head"><div><h2>Seções e links</h2><p>A ordem abaixo é a mesma exibida no site.</p></div><button class="button" data-action="add-home-section">+ Seção</button></div><div class="panel-body">${data.home.sections.map((section, index) => renderSection(section, `home.sections.${index}`, index, 'home')).join('') || '<div class="empty">A home ainda não tem seções.</div>'}</div></section>`;
}

function pages() {
  if (selectedPage === null) return `<div class="toolbar"><h2>Páginas internas</h2><button class="button primary" data-action="add-page">+ Nova página</button></div><div class="page-list">${data.pages.map((page, index) => `<button class="page-item" data-action="edit-page" data-index="${index}"><strong>${h(page.title)}</strong><code>/${h(page.slug)}/</code></button>`).join('')}</div>`;
  const page = data.pages[selectedPage];
  if (!page) { selectedPage = null; return pages(); }
  return `<div class="toolbar"><button class="crumb" data-action="back-pages">← Todas as páginas</button><button class="button danger" data-action="delete-page">Excluir página</button></div>
  <section class="panel"><div class="panel-head"><div><h2>Configurações da página</h2><p>O slug define o endereço público.</p></div></div><div class="panel-body grid">
    ${field('Título', `pages.${selectedPage}.title`)}${field('Slug', `pages.${selectedPage}.slug`, { help: 'Ex.: projetos ou ajude/indicacao' })}${field('Descrição para buscadores', `pages.${selectedPage}.description`, { wide: true })}${field('Exibir perfil no topo', `pages.${selectedPage}.showProfile`, { checkbox: true, wide: true })}${field('Conteúdo inicial (HTML opcional)', `pages.${selectedPage}.introHtml`, { textarea: true, rows: 8, wide: true })}
  </div></section>
  <section class="panel"><div class="panel-head"><div><h2>Seções</h2><p>Blocos de conteúdo e listas de links.</p></div><button class="button" data-action="add-page-section">+ Seção</button></div><div class="panel-body">${page.sections.map((section, index) => renderSection(section, `pages.${selectedPage}.sections.${index}`, index, 'page')).join('') || '<div class="empty">Esta página ainda não tem seções.</div>'}</div></section>`;
}

function redirects() {
  return `<section class="panel"><div class="panel-head"><div><h2>Atalhos e encurtadores</h2><p>Transforme neto.bio/whatsapp em qualquer endereço externo.</p></div><button class="button" data-action="add-redirect">+ Atalho</button></div><div class="panel-body">${data.redirects.map((item, index) => `<div class="link-row"><div class="field"><label>Nome</label><input data-path="redirects.${index}.title" value="${h(item.title)}"></div><div class="field url"><label>Destino</label><input data-path="redirects.${index}.target" value="${h(item.target)}"></div><div class="field"><label>Slug curto</label><input data-path="redirects.${index}.slug" value="${h(item.slug)}"></div><span></span><button class="button danger small" data-action="remove-redirect" data-index="${index}">Remover</button></div>`).join('') || '<div class="empty">Nenhum atalho cadastrado.</div>'}</div></section>`;
}

function appearance() {
  const colors = [['Fundo','background'],['Superfície','surface'],['Cor principal','primary'],['Texto','text'],['Texto secundário','muted']];
  return `<section class="panel"><div class="panel-head"><div><h2>Cores e formato</h2><p>Uma personalização enxuta para manter a identidade visual consistente.</p></div></div><div class="panel-body grid">${colors.map(([label,key]) => `<div class="field"><label>${label}</label><div class="color-row"><input type="color" data-path="theme.${key}" value="${h(data.theme[key])}"><input data-path="theme.${key}" value="${h(data.theme[key])}"></div></div>`).join('')}${field('Arredondamento dos botões (px)', 'theme.radius', { type: 'number' })}</div></section>`;
}

function publishView() {
  return `<section class="panel"><div class="publish-box"><p class="eyebrow">NOVA VERSÃO</p><h2>Pronto para publicar?</h2><p>O painel salva o conteúdo, gera todos os arquivos estáticos, cria um commit e envia a versão para a branch <strong>${h(repo?.branch || 'atual')}</strong> no GitHub.</p><div class="field" style="max-width:560px;margin:0 auto 14px;text-align:left"><label>Mensagem da versão</label><input id="commit-message" value="Atualiza conteúdo do neto.bio"></div><button class="button primary" data-action="publish">Publicar no GitHub</button></div></section>
  <section class="panel"><div class="panel-head"><div><h2>Estado atual</h2><p>${repo?.generatedAt ? `Última geração: ${h(new Date(repo.generatedAt).toLocaleString('pt-BR'))}` : 'Nenhuma geração registrada.'}</p></div></div><div class="panel-body"><div class="git">${h(repo?.gitStatus || 'Área de trabalho limpa.')}</div></div></section>`;
}

function render() {
  $('#view-title').textContent = titles[active] || 'Painel';
  document.querySelectorAll('[data-nav]').forEach((button) => button.classList.toggle('active', button.dataset.nav === active));
  const views = { dashboard, profile, home, pages, redirects, appearance, publish: publishView };
  content.innerHTML = (views[active] || dashboard)();
}

async function request(url, options = {}) {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Não foi possível concluir a operação.');
  return result;
}

async function save(showToast = true) {
  await request('/api/site', { method: 'PUT', body: JSON.stringify(data) });
  dirty = false;
  $('#save-state').textContent = 'Tudo salvo';
  if (showToast) toast('Alterações salvas.');
}

async function buildSite() {
  await save(false);
  const result = await request('/api/build', { method: 'POST', body: '{}' });
  repo = result.status;
  render();
  toast(`Site gerado com ${result.files.length} arquivos.`);
}

async function publishSite() {
  if (!confirm('Publicar esta versão no GitHub agora?')) return;
  const message = $('#commit-message')?.value || 'Atualiza conteúdo do neto.bio';
  await save(false);
  toast('Publicando…');
  const result = await request('/api/publish', { method: 'POST', body: JSON.stringify({ message }) });
  repo = result;
  render();
  toast(result.message);
}

document.addEventListener('input', (event) => {
  const path = event.target.dataset.path;
  if (!path) return;
  const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
  set(path, value);
  if (event.target.type === 'color') {
    const text = event.target.parentElement.querySelector('input:not([type=color])');
    if (text) text.value = value;
  }
});

document.addEventListener('click', async (event) => {
  const nav = event.target.closest('[data-nav]');
  if (nav) {
    event.preventDefault();
    active = nav.dataset.nav;
    selectedPage = null;
    location.hash = active;
    $('.sidebar').classList.remove('open');
    render();
    return;
  }
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  try {
    if (action === 'build') return await buildSite();
    if (action === 'publish') return await publishSite();
    if (action === 'add-social') data.socials.push({ label: 'Nova rede', icon: 'link', url: 'https://' });
    if (action === 'remove-social') data.socials.splice(Number(button.dataset.index), 1);
    if (action === 'add-home-section') data.home.sections.push({ title: 'Nova seção', links: [] });
    if (action === 'remove-home-section') data.home.sections.splice(Number(button.dataset.index), 1);
    if (action === 'add-home-link') data.home.sections[Number(button.dataset.index)].links.push({ label: 'Novo link', url: 'https://', style: 'primary', newTab: true });
    if (action === 'remove-home-link') { const [section, link] = button.dataset.indices.split(',').map(Number); data.home.sections[section].links.splice(link, 1); }
    if (action === 'add-page') { data.pages.push({ slug: `nova-pagina-${data.pages.length + 1}`, title: 'Nova página', description: '', showProfile: true, introHtml: '', sections: [] }); selectedPage = data.pages.length - 1; }
    if (action === 'edit-page') { selectedPage = Number(button.dataset.index); render(); return; }
    if (action === 'back-pages') { selectedPage = null; render(); return; }
    if (action === 'delete-page') { if (!confirm('Excluir esta página?')) return; data.pages.splice(selectedPage, 1); selectedPage = null; }
    if (action === 'add-page-section') data.pages[selectedPage].sections.push({ title: 'Nova seção', bodyHtml: '', links: [] });
    if (action === 'remove-page-section') data.pages[selectedPage].sections.splice(Number(button.dataset.index), 1);
    if (action === 'add-page-link') data.pages[selectedPage].sections[Number(button.dataset.index)].links.push({ label: 'Novo link', url: 'https://', style: 'primary', newTab: true });
    if (action === 'remove-page-link') { const [section, link] = button.dataset.indices.split(',').map(Number); data.pages[selectedPage].sections[section].links.splice(link, 1); }
    if (action === 'add-redirect') data.redirects.push({ slug: `atalho-${data.redirects.length + 1}`, title: 'Novo atalho', target: 'https://' });
    if (action === 'remove-redirect') data.redirects.splice(Number(button.dataset.index), 1);
    markDirty();
    render();
  } catch (error) { toast(error.message, true); }
});

$('#save').addEventListener('click', () => save().catch((error) => toast(error.message, true)));
$('#menu').addEventListener('click', () => $('.sidebar').classList.toggle('open'));
window.addEventListener('beforeunload', (event) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });

(async () => {
  try {
    const result = await request('/api/site');
    data = result.site;
    repo = result.status;
    render();
  } catch (error) {
    content.innerHTML = `<div class="empty">${h(error.message)}</div>`;
  }
})();
