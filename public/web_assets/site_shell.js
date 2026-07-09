/* Shared site shell: global nav + basic auth helpers */

(function () {
  const SUPABASE_URL = window.DM_SUPABASE_URL;
  const SUPABASE_ANON_KEY = window.DM_SUPABASE_ANON_KEY;

  // Supabase will be wired back in later (accounts/library). Keep optional support in place.
  const hasSupabase = !!(SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase);
  const supabaseClient = hasSupabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

  function normPath(p) {
    try {
      const u = new URL(p, window.location.origin);
      return u.pathname.replace(/\/index\.html$/, '/');
    } catch (_) {
      return p;
    }
  }

  function getActiveKey() {
    const p = normPath(window.location.pathname);
    if (p.startsWith('/play')) return 'play';
    if (p.startsWith('/console')) return 'console';
    if (p.startsWith('/builder')) return 'builder';
    if (p.startsWith('/ai')) return 'ai';
    if (p.startsWith('/tools')) return 'tools';
    if (p.startsWith('/guides')) return 'guides';
    return 'home';
  }

  function getNextParam() {
    const p = normPath(window.location.pathname);
    return encodeURIComponent(p);
  }

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.entries(attrs).forEach(([k, v]) => {
        if (k === 'class') node.className = v;
        else if (k === 'html') node.innerHTML = v;
        else node.setAttribute(k, v);
      });
    }
    (children || []).forEach((c) => node.appendChild(c));
    return node;
  }

  async function getSession() {
    if (!supabaseClient) return null;
    const { data } = await supabaseClient.auth.getSession();
    return data && data.session ? data.session : null;
  }

  function renderNav(container, state) {
    const active = getActiveKey();

    const isFile = window.location && window.location.protocol === 'file:';
    const rootPrefix = (() => {
      if (!isFile) return '';
      const p = (window.location && window.location.pathname) ? window.location.pathname : '';
      // If we are inside a known section folder (e.g. /play/index.html), links should point back to the project root.
      return /\/(play|console|builder|ai|tools|guides)(\/|$)/.test(p) ? '../' : '';
    })();

    const links = [
      { key: 'builder', label: 'Create', href: isFile ? `${rootPrefix}builder/index.html` : '/builder/' },
      { key: 'play', label: 'Play', href: isFile ? `${rootPrefix}play/index.html` : '/play/' },
      { key: 'console', label: 'Console', href: isFile ? `${rootPrefix}console/index.html` : '/console/' },
      { key: 'ai', label: 'AI Companion', href: isFile ? `${rootPrefix}ai/index.html` : '/ai/' },
      { key: 'tools', label: 'Tools', href: isFile ? `${rootPrefix}tools/index.html` : '/tools/' },
      { key: 'guides', label: 'Guides', href: isFile ? `${rootPrefix}guides/` : '/guides/' },
    ];

    const linksEl = el('div', { class: 'links' }, links.map((l) => {
      const a = el('a', { href: l.href }, []);
      a.textContent = l.label;
      if (l.key === active) a.classList.add('active');
      return a;
    }));

    const brand = el('div', { class: 'brand' }, []);
    const pre = el('pre', { class: 'ascii' }, []);
    pre.textContent = [
      '  ___  _   _ _  _  ___ ___ ___  _  _    __  __   _   ___ _____ ___  ___  _  _ ',
      ' |   \\| | | | \\| |/ __| __/ _ \\| \\| |  |  \\/  | /_\\ / __|_   _| _ \\/ _ \\| \\| |',
      ' | |) | |_| | .` | (_ | _| (_) | .` |  | |\\/| |/ _ \\\\__ \\ | | |   / (_) | .` |',
      ' |___/ \\___/|_|\\_|\\___|___\\___/|_|\\_|  |_|  |_/_/ \\_\\___/ |_| |_|_\\\\___/|_|\\_|',
    ].join('\n');
    brand.appendChild(pre);

    const brandLink = el('a', { class: 'brand-link', href: isFile ? `${rootPrefix}index.html` : '/' }, [brand]);

    const nav = el('nav', { class: 'site-nav' }, [
      el('div', { class: 'inner' }, [
        brandLink,
        linksEl,
      ]),
    ]);

    container.innerHTML = '';
    container.appendChild(nav);
  }

  async function bootstrap() {
    const container = document.getElementById('site-nav');
    if (!container) return;

    // For community-first rollout, nav is static. If Supabase is configured, we still
    // keep session watchers for later features (no visible UI here yet).
    renderNav(container, { authed: false, user: null });
    if (supabaseClient) {
      supabaseClient.auth.onAuthStateChange(() => {
        renderNav(container, { authed: false, user: null });
      });
    }
  }

  window.DM = window.DM || {};
  window.DM.supabase = supabaseClient;
  window.DM.getSession = getSession;
  window.DM.normPath = normPath;
  window.DM.getNextParam = getNextParam;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootstrap);
  else bootstrap();
})();
