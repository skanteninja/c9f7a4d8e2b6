(() => {
  const RAW = 'https://raw.githubusercontent.com/ohmi69/osms_datamine_dashboard/main/data/current/';
  let timer = null;
  let mapsPromise = null;

  const norm = value => String(value ?? '').toLowerCase().replace(/\[[^\]]*\]/g,' ').replace(/[^a-z0-9]+/g,' ').trim();

  function collectMaps(value, out = [], depth = 0) {
    if (depth > 6 || value == null) return out;
    if (Array.isArray(value)) { value.forEach(v => collectMaps(v, out, depth + 1)); return out; }
    if (typeof value !== 'object') return out;
    const name = value.name || value.map_name || value.title || '';
    const id = Number(value.id);
    if (name && Number.isFinite(id)) out.push({ ...value, id: Math.trunc(id), name });
    Object.values(value).forEach(v => { if (v && typeof v === 'object') collectMaps(v, out, depth + 1); });
    return out;
  }

  function maps() {
    if (!mapsPromise) {
      mapsPromise = fetch(`${RAW}maps.json`, { cache: 'force-cache' })
        .then(r => { if (!r.ok) throw new Error(`maps HTTP ${r.status}`); return r.json(); })
        .then(data => collectMaps(data || {}))
        .catch(() => []));
    }
    return mapsPromise;
  }

  function currentRouteText() {
    const D = window.GUIDE_DATA;
    const level = Number(document.getElementById('hero-level')?.textContent || document.getElementById('level-select')?.value || 1);
    const row = D?.leveling?.find(x => Number(x.Lv) === level);
    return row ? `${row['Primary Route'] || ''} ${row.Region || ''}`.trim() : '';
  }

  function bestMap(rows, text) {
    const hay = ` ${norm(text)} `;
    let best = null;
    let bestLen = 0;
    for (const row of rows) {
      const name = norm(row.name);
      if (name.length < 5 || name.length <= bestLen) continue;
      if (hay.includes(` ${name} `) || hay.includes(name)) { best = row; bestLen = name.length; }
    }
    return best;
  }

  function removeBrokenPreview(row, preview) {
    preview?.remove();
    row?.classList.remove('has-route-map');
    verifyLayout();
  }

  async function upgradeTrainMap() {
    const row = document.querySelector('#dashboard-actions .train-action');
    if (!row) return;
    const routeText = currentRouteText();
    if (!routeText) return;

    const allMaps = await maps();
    if (!document.body.contains(row)) return;
    const match = bestMap(allMaps, routeText);
    let preview = row.querySelector('.route-minimap');

    if (match) {
      if (!preview) {
        preview = document.createElement('span');
        preview.className = 'route-minimap';
        row.prepend(preview);
      }
      const wanted = `${RAW}images/maps/${String(match.id).padStart(9,'0')}.png`;
      let img = preview.querySelector('img');
      if (!img) { img = document.createElement('img'); preview.appendChild(img); }
      if (img.src !== wanted) img.src = wanted;
      img.alt = `${match.name} current COT2 map`;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.dataset.dashboardMapSource = 'osms-current-cot2';
      img.onerror = () => removeBrokenPreview(row, preview);
      preview.title = `${match.name} · current COT2 map`;
      row.classList.add('has-route-map');
      return;
    }

    if (preview) {
      row.classList.add('has-route-map');
      const img = preview.querySelector('img');
      if (img && !img.dataset.dashboardMapHooked) {
        img.dataset.dashboardMapHooked = '1';
        img.addEventListener('error', () => removeBrokenPreview(row, preview), { once: true });
      }
    }
  }

  function actionKind(row) {
    const label = [...row.children].find(el => el.tagName === 'SPAN' && !el.classList.contains('route-minimap'))?.textContent?.trim().toLowerCase();
    return label || '';
  }

  function decorateActions() {
    const rows = [...document.querySelectorAll('#dashboard-actions .atlas-action-row')];
    rows.forEach(row => {
      ['train','sp','quest','bank'].forEach(kind => row.classList.remove(`action-kind-${kind}`));
      const kind = actionKind(row);
      if (['train','sp','quest','bank'].includes(kind)) row.classList.add(`action-kind-${kind}`);
      if (row.classList.contains('train-action')) {
        const preview = row.querySelector('.route-minimap');
        row.classList.toggle('has-route-map', !!preview && getComputedStyle(preview).display !== 'none');
      }
    });
  }

  function verifyLayout() {
    const html = document.documentElement;
    const page = document.querySelector('.dashboard-v72');
    const panel = document.querySelector('.dashboard-v72 .v72-now-panel');
    const rows = [...document.querySelectorAll('.dashboard-v72 #dashboard-actions .atlas-action-row')];
    html.classList.remove('dashboard-action-layout-ok','dashboard-overflow-detected','dashboard-page-layout-ok','dashboard-page-overflow-detected');
    if (!page || !panel || !rows.length) return;

    const panelRect = panel.getBoundingClientRect();
    const actionBroken = rows.some(row => {
      const r = row.getBoundingClientRect();
      return row.scrollWidth > row.clientWidth + 3 || r.right > panelRect.right + 3 || r.left < panelRect.left - 3;
    });
    html.classList.add(actionBroken ? 'dashboard-overflow-detected' : 'dashboard-action-layout-ok');

    const pageRect = page.getBoundingClientRect();
    const visibleChildren = [...page.querySelectorAll(':scope > *, :scope > * > *')].filter(el => {
      const style = getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
    const pageBroken = page.scrollWidth > page.clientWidth + 3 || visibleChildren.some(el => {
      const r = el.getBoundingClientRect();
      return r.right > pageRect.right + 4 || r.left < pageRect.left - 4;
    });
    html.classList.add(pageBroken ? 'dashboard-page-overflow-detected' : 'dashboard-page-layout-ok');
  }

  function enhance() {
    document.documentElement.classList.add('dashboard-polish-ready');
    decorateActions();
    upgradeTrainMap().finally(() => requestAnimationFrame(() => requestAnimationFrame(verifyLayout)));
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(enhance, 90);
  }

  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  window.addEventListener('resize', schedule, { passive: true });
  document.addEventListener('change', schedule, true);
  document.addEventListener('click', schedule, true);
  enhance();
})();
