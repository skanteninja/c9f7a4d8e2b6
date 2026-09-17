/* Apply the page-level town backdrop without changing the app's existing layout. */
(() => {
  const THEMES = Object.freeze({
    'warrior-fighter': Object.freeze({theme: 'warrior', town: 'perion'}),
    'archer-hunter': Object.freeze({theme: 'hunter', town: 'henesys'}),
    'magician-il-fresh': Object.freeze({theme: 'mage', town: 'ellinia'})
  });
  const FALLBACK = THEMES['magician-il-fresh'];
  let lastSignature = '';

  function activeTheme() {
    const app = document.getElementById('app');
    const id = String(window.TCW_ACTIVE_BUILD_ID || app?.dataset.buildId || 'magician-il-fresh');
    return {id, ...(THEMES[id] || FALLBACK)};
  }

  function apply() {
    const html = document.documentElement;
    const body = document.body;
    if (!html || !body) return;
    const selected = activeTheme();
    const signature = `${selected.id}:${selected.theme}:${selected.town}`;
    html.classList.add('royal-maple-theme');
    html.dataset.mapleBuild = selected.id;
    html.dataset.mapleTheme = selected.theme;
    html.dataset.mapleTown = selected.town;
    html.classList.add('royal-theme-ready');
    body.classList.add('royal-maple-theme', `maple-town-${selected.theme}`);
    body.dataset.mapleBuild = selected.id;
    body.dataset.mapleTown = selected.town;
    const app = document.getElementById('app');
    if (app) {
      app.dataset.mapleBuild = selected.id;
      app.dataset.mapleTown = selected.town;
    }
    if (signature !== lastSignature) {
      document.documentElement.dataset.royalThemeReady = '1';
      lastSignature = signature;
    }
  }

  apply();
  window.setTimeout(apply, 0);
  window.setTimeout(apply, 600);
  window.addEventListener('pageshow', apply);
  window.addEventListener('popstate', apply);
  window.TCW_APPLY_CLASS_THEME = apply;

  const app = document.getElementById('app');
  if (app && window.MutationObserver) {
    new MutationObserver(apply).observe(app, {
      attributes: true,
      attributeFilter: ['data-build-id']
    });
  }
})();
