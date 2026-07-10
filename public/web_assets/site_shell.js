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
    if (p.startsWith('/blog')) return 'blog';
    if (p.startsWith('/faq')) return 'faq';
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
      return /\/(play|console|builder|ai|tools|guides|blog|faq)(\/|$)/.test(p) ? '../' : '';
    })();

    const links = [
      { key: 'builder', label: 'Create', href: isFile ? `${rootPrefix}builder/index.html` : '/builder/' },
      { key: 'play', label: 'Play', href: isFile ? `${rootPrefix}play/index.html` : '/play/' },
      { key: 'console', label: 'Console', href: isFile ? `${rootPrefix}console/index.html` : '/console/' },
      { key: 'ai', label: 'AI Companion', href: isFile ? `${rootPrefix}ai/index.html` : '/ai/' },
      { key: 'tools', label: 'Tools', href: isFile ? `${rootPrefix}tools/index.html` : '/tools/' },
      { key: 'guides', label: 'Guides', href: isFile ? `${rootPrefix}guides/` : '/guides/' },
      { key: 'blog', label: 'Blog', href: isFile ? `${rootPrefix}blog/index.html` : '/blog/' },
      { key: 'faq', label: 'FAQ', href: isFile ? `${rootPrefix}faq/index.html` : '/faq/' },
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

  // Shared social icons (inline SVG, currentColor). Keeps footer identical on every page.
  const ICONS = {
    x: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16Zm0 1.62c-3.15 0-3.52.01-4.76.07-.9.04-1.39.2-1.71.32-.43.17-.74.37-1.06.69-.32.32-.52.63-.69 1.06-.12.32-.28.81-.32 1.71-.06 1.24-.07 1.61-.07 4.76s.01 3.52.07 4.76c.04.9.2 1.39.32 1.71.17.43.37.74.69 1.06.32.32.63.52 1.06.69.32.12.81.28 1.71.32 1.24.06 1.61.07 4.76.07s3.52-.01 4.76-.07c.9-.04 1.39-.2 1.71-.32.43-.17.74-.37 1.06-.69.32-.32.52-.63.69-1.06.12-.32.28-.81.32-1.71.06-1.24.07-1.61.07-4.76s-.01-3.52-.07-4.76c-.04-.9-.2-1.39-.32-1.71a2.85 2.85 0 0 0-.69-1.06 2.85 2.85 0 0 0-1.06-.69c-.32-.12-.81-.28-1.71-.32-1.24-.06-1.61-.07-4.76-.07Zm0 2.76a5.3 5.3 0 1 1 0 10.6 5.3 5.3 0 0 1 0-10.6Zm0 1.62a3.68 3.68 0 1 0 0 7.36 3.68 3.68 0 0 0 0-7.36Zm5.5-2.9a1.24 1.24 0 1 1 0 2.48 1.24 1.24 0 0 1 0-2.48Z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14Zm1.78 13.02H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z"/></svg>',
    indiehackers: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M2 2h20v20H2V2Zm4.4 4.4v11.2h2.36v-4.42h2.96v4.42h2.36V6.4h-2.36v4.42H8.76V6.4H6.4Zm10.28 0v11.2h2.32V6.4h-2.32Z"/></svg>',
    github: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.39-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z"/></svg>',
    kofi: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M23.88 7.86c-.35-1.9-1.63-2.8-4.06-2.8H2.4c-.6 0-.9.3-.94.94-.02.3 0 4.02.28 7.2.4 4.3 2.5 6.6 6.6 6.86 2.2.14 4.72.14 6.9-.02 2.5-.18 4.3-1.5 5.1-3.86 2.6-.1 4.06-1.7 3.9-4.42-.06-1.5-.98-2.9-.46-3.9ZM7.9 15.9c-2.66-.2-3.98-1.72-4.28-4.9-.16-1.8-.24-4.2-.26-5.44h14.9c.02 1.66.1 4.44-.1 6.5-.22 2.3-1.4 3.6-3.7 3.76-1.96.14-4.34.16-6.26.08Zm14.06-6.2c-.1 1.36-.86 2.02-2.1 2.06.14-1.34.2-3.2.22-4.66.98.08 1.42.6 1.5 1.5.02.36.02.72.02 1.1Zm-11.4-.34c.6.66 1.36 1.06 2.2 1.14.1 0 .18-.02.26-.1.66-.66 1.32-1.32 1.96-2 .5-.52.56-1.2.18-1.76-.36-.54-1.02-.78-1.66-.6-.28.08-.5.24-.72.44-.22-.2-.44-.36-.72-.44a1.44 1.44 0 0 0-1.66.6c-.38.56-.32 1.24.18 1.76.06.06.12.12.18.18l.02.02c.16.14.32.28.48.42.34.3.68.6 1.02.9Z"/></svg>',
  };

  function renderFooter(container) {
    const isFile = window.location && window.location.protocol === 'file:';
    const rootPrefix = (() => {
      if (!isFile) return '';
      const p = (window.location && window.location.pathname) ? window.location.pathname : '';
      return /\/(play|console|builder|ai|tools|guides|blog|faq)(\/|$)/.test(p) ? '../' : '';
    })();
    const licenseHref = isFile ? `${rootPrefix}LICENSE.txt` : '/LICENSE.txt';
    const mascotSrc = isFile ? `${rootPrefix}web_assets/mascot/mascot-sm.webp?v=4` : '/web_assets/mascot/mascot-sm.webp?v=4';

    const socials = [
      { key: 'x', label: 'X', href: 'https://x.com/DungeonMastron' },
      { key: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/dungeonmastron/' },
      { key: 'linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/company/dungeon-mastron' },
      { key: 'indiehackers', label: 'Indie Hackers', href: 'https://www.indiehackers.com/product/dungeon-mastron' },
      { key: 'github', label: 'GitHub', href: 'https://github.com/coburn2716/dungeonmastron_app' },
      { key: 'kofi', label: 'Support on Ko-fi', href: 'https://ko-fi.com/dungeonmastron' },
    ];
    const iconsEl = el('div', { class: 'footer-socials' }, socials.map((s) => {
      const a = el('a', {
        href: s.href, target: '_blank', rel: 'noopener noreferrer',
        'aria-label': s.label, title: s.label, html: ICONS[s.key] || '',
      }, []);
      return a;
    }));

    const licenseEl = el('div', { class: 'footer-license' }, []);
    const la = el('a', { href: licenseHref, target: '_blank', rel: 'noopener noreferrer' }, []);
    la.textContent = 'MIT License';
    licenseEl.appendChild(la);

    const copy = el('div', { class: 'footer-copy' }, []);
    copy.textContent = '\u00A9 2026 Artifextron \u00B7 Dungeon Mastron';

    // End-card wordmark: ghost serif brand + mascot sign-off.
    const wm = el('div', { class: 'footer-wordmark', 'aria-hidden': 'true' }, []);
    const wmText = el('div', { class: 'wm', html: 'Dungeon <em>Mastron</em>' }, []);
    const wmMascot = el('img', {
      class: 'footer-mascot', src: mascotSrc, alt: '',
      loading: 'lazy', decoding: 'async',
    }, []);
    wm.appendChild(wmText);
    wm.appendChild(wmMascot);

    const footer = el('footer', { class: 'site-footer' }, [
      wm,
      el('div', { class: 'inner' }, [copy, iconsEl, licenseEl]),
    ]);
    container.innerHTML = '';
    container.appendChild(footer);
  }

  // Scroll-reveal: pages opt in by putting data-reveal on elements.
  function initReveal() {
    const els = document.querySelectorAll('[data-reveal]');
    if (!els.length) return;
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !('IntersectionObserver' in window)) {
      els.forEach((e) => e.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -36px 0px' });
    els.forEach((e) => io.observe(e));
  }

  async function bootstrap() {
    const container = document.getElementById('site-nav');
    if (container) {
      // For community-first rollout, nav is static. If Supabase is configured, we still
      // keep session watchers for later features (no visible UI here yet).
      renderNav(container, { authed: false, user: null });
      if (supabaseClient) {
        supabaseClient.auth.onAuthStateChange(() => {
          renderNav(container, { authed: false, user: null });
        });
      }
    }
    const footerContainer = document.getElementById('site-footer');
    if (footerContainer) renderFooter(footerContainer);
    initReveal();
  }

  window.DM = window.DM || {};
  window.DM.supabase = supabaseClient;
  window.DM.getSession = getSession;
  window.DM.normPath = normPath;
  window.DM.getNextParam = getNextParam;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootstrap);
  else bootstrap();
})();
