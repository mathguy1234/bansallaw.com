/**
 * Bansal Law — CMS Content Renderer
 * Fetches published Markdown files from GitHub and injects them
 * into blog.html, success-stories.html, and significant-cases.html.
 */
(function () {
  const REPO   = 'mathguy1234/bansallaw.com';
  const BRANCH = 'master';
  const API    = `https://api.github.com/repos/${REPO}/contents`;
  const RAW    = `https://raw.githubusercontent.com/${REPO}/${BRANCH}`;

  // ── Helpers ────────────────────────────────────────────────────────────────

  function parseFrontmatter(text) {
    const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!m) return { data: {}, content: text };
    const data = {};
    m[1].split('\n').forEach(line => {
      const idx = line.indexOf(':');
      if (idx === -1) return;
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (key) data[key] = val;
    });
    return { data, content: m[2] };
  }

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function fmtDate(str) {
    if (!str) return '';
    try {
      return new Date(str).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return str; }
  }

  async function listFiles(folder) {
    try {
      const r = await fetch(`${API}/${folder}`);
      if (!r.ok) return [];
      const files = await r.json();
      return Array.isArray(files)
        ? files.filter(f => f.name.endsWith('.md') && !f.name.startsWith('.'))
        : [];
    } catch { return []; }
  }

  async function fetchMd(path) {
    try {
      const r = await fetch(`${RAW}/${path}`);
      return r.ok ? r.text() : null;
    } catch { return null; }
  }

  // ── Blog Posts ─────────────────────────────────────────────────────────────

  async function loadBlog() {
    const container = document.getElementById('cms-blog-posts');
    if (!container) return;

    const files = await listFiles('content/blog');
    if (!files.length) return;

    const posts = (await Promise.all(
      files.map(async f => {
        const text = await fetchMd(`content/blog/${f.name}`);
        if (!text) return null;
        const { data } = parseFrontmatter(text);
        return { data, slug: f.name.replace(/\.md$/, '') };
      })
    ))
      .filter(p => p && p.data.status === 'published')
      .sort((a, b) => new Date(b.data.date) - new Date(a.data.date));

    if (!posts.length) return;

    // Section divider
    container.innerHTML = `
      <div class="col-span-full mb-4">
        <p class="text-gold text-xs font-semibold tracking-widest uppercase flex items-center gap-3">
          <span class="flex-1 h-px bg-gold/20 inline-block"></span>
          Latest from Our Team
          <span class="flex-1 h-px bg-gold/20 inline-block"></span>
        </p>
      </div>`;

    posts.forEach(post => {
      const catSlug = (post.data.category || 'general').toLowerCase().replace(/[\s&]+/g, '-');
      const div = document.createElement('div');
      div.className = 'article-card';
      div.setAttribute('data-category', catSlug);
      div.innerHTML = `
        <div style="height:180px;background:linear-gradient(135deg,#1e2846,#1a2035);display:flex;align-items:center;justify-content:center;padding:1.25rem;">
          <span style="color:#c9a84c;font-family:'Playfair Display',serif;font-size:1.05rem;font-weight:700;text-align:center;line-height:1.35;">${esc(post.data.title)}</span>
        </div>
        <div class="p-6">
          <div class="flex items-center gap-3 mb-3">
            <span class="bg-gold/10 border border-gold/25 text-gold text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full">${esc(post.data.category || 'General')}</span>
          </div>
          <div class="flex items-center gap-2 text-gray-500 text-xs mb-3">
            <span>${fmtDate(post.data.date)}</span>
            ${post.data.reading_time ? `<span class="text-white/20">·</span><span class="flex items-center gap-1"><i class="fa fa-clock text-gold/50 text-[10px]"></i> ${esc(post.data.reading_time)}</span>` : ''}
          </div>
          <h3 class="font-serif text-lg font-bold text-white mb-3 leading-snug">${esc(post.data.title)}</h3>
          <p class="text-gray-400 text-sm leading-relaxed mb-5">${esc(post.data.summary || '')}</p>
          <a href="article.html?post=${encodeURIComponent(post.slug)}"
             class="text-gold text-sm font-semibold hover:text-gold-light transition-colors inline-flex items-center gap-1.5">
            Read Article <i class="fa fa-arrow-right text-xs"></i>
          </a>
        </div>`;
      container.appendChild(div);
    });
  }

  // ── Success Stories ────────────────────────────────────────────────────────

  async function loadStories() {
    const grid = document.getElementById('cards-grid');
    if (!grid) return;

    const files = await listFiles('content/success-stories');
    if (!files.length) return;

    const stories = (await Promise.all(
      files.map(async f => {
        const text = await fetchMd(`content/success-stories/${f.name}`);
        if (!text) return null;
        const { data } = parseFrontmatter(text);
        return { data };
      })
    ))
      .filter(s => s && s.data.status === 'published')
      .sort((a, b) => new Date(b.data.date) - new Date(a.data.date));

    if (!stories.length) return;

    stories.forEach(story => {
      const catSlug = (story.data.category || 'immigration').toLowerCase().replace(/[\s&]+/g, '-');
      const icon = story.data.icon || 'fa-circle-check';
      const div = document.createElement('div');
      div.className = 'case-card p-7';
      div.setAttribute('data-category', `${catSlug} federal-court`);
      div.innerHTML = `
        <div class="w-11 h-11 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center mb-4">
          <i class="fa ${esc(icon)} text-gold text-base"></i>
        </div>
        <div class="text-gold text-[10px] font-semibold tracking-widest uppercase mb-3">${esc(story.data.category || '')}</div>
        <h3 class="font-serif font-bold text-2xl text-white leading-snug mb-3">${esc(story.data.title)}</h3>
        <p class="text-gray-400 text-sm leading-relaxed mb-4">${esc(story.data.summary || '')}</p>
        <div class="gold-divider"></div>
        <div class="flex items-center">
          <span class="outcome-badge"><i class="fa fa-circle-check text-[9px]"></i> ${esc(story.data.outcome || 'RESOLVED')}</span>
        </div>`;
      grid.appendChild(div);
    });
  }

  // ── Significant Cases ──────────────────────────────────────────────────────

  async function loadCases() {
    const container = document.getElementById('cms-cases-section');
    if (!container) return;

    const files = await listFiles('content/significant-cases');
    if (!files.length) return;

    const cases = (await Promise.all(
      files.map(async f => {
        const text = await fetchMd(`content/significant-cases/${f.name}`);
        if (!text) return null;
        const { data } = parseFrontmatter(text);
        return { data };
      })
    ))
      .filter(c => c && c.data.status === 'published')
      .sort((a, b) => new Date(b.data.date) - new Date(a.data.date));

    if (!cases.length) return;

    container.innerHTML = `
      <div class="max-w-7xl mx-auto">
        <div class="text-center mb-10">
          <p class="text-gold text-xs font-semibold tracking-widest uppercase mb-3">Additional Case Summaries</p>
          <div style="display:block;width:50px;height:3px;background:#c9a84c;margin:0 auto;"></div>
        </div>
        <div id="cms-cases-grid" class="grid grid-cols-1 lg:grid-cols-2 gap-8"></div>
      </div>`;

    const grid = container.querySelector('#cms-cases-grid');
    cases.forEach(c => {
      const year = c.data.date ? new Date(c.data.date).getFullYear() : '';
      const tags = Array.isArray(c.data.tags)
        ? c.data.tags.map(t => `<span class="tag-pill">${esc(t)}</span>`).join('')
        : '';
      const div = document.createElement('div');
      div.className = 'case-ref-card';
      div.innerHTML = `
        <div class="flex items-center gap-3">
          <span class="font-mono bg-navy border border-gold/20 text-gold/80 text-[10px] px-3 py-1 rounded">${esc(c.data.citation || '')}</span>
          ${year ? `<span class="bg-gold text-navy text-xs font-bold px-3 py-1 rounded">${year}</span>` : ''}
        </div>
        <h2 class="font-serif font-bold text-xl text-white mt-4 mb-2">${esc(c.data.title)}</h2>
        <p class="text-gray-500 text-xs mb-4">${esc(c.data.court || 'Federal Court of Canada')}</p>
        <div class="gold-rule"></div>
        <span class="label-upper">What Was Decided</span>
        <p class="text-white text-base mb-5 leading-snug">${esc(c.data.outcome || '')}</p>
        <span class="label-upper">What It Means For You</span>
        <p class="text-gray-300 text-sm leading-relaxed mb-3">${esc(c.data.summary || '')}</p>
        ${tags ? `<div class="mt-5 pt-4 border-t border-white/5">${tags}</div>` : ''}`;
      grid.appendChild(div);
    });
  }

  // ── Init ───────────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', function () {
    loadBlog();
    loadStories();
    loadCases();
  });
})();
