(() => {
  const RAW = 'https://raw.githubusercontent.com/ohmi69/osms_datamine_dashboard/main/data/current/';
  let timer = null;
  let mapsPromise = null;
  let cashResultsObserver = null;
  let cashResultsRoot = null;

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
        .catch(() => []);
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

  function setNavButtonCopy(button, text) {
    if (!button) return;
    const node = [...button.childNodes].find(n => n.nodeType === Node.TEXT_NODE);
    if (node) node.textContent = ` ${text}`;
    else button.append(` ${text}`);
    button.setAttribute('aria-label', text);
    button.title = text;
  }

  function cleanNavigation() {
    const nav = document.getElementById('nav');
    if (!nav) return;
    nav.querySelectorAll('.nav-section-label').forEach(label => {
      const text = String(label.textContent || '').trim().toUpperCase();
      if (text === 'PLAY' || text === 'DATABASE') label.remove();
    });
    nav.querySelector('.nav-btn[data-page="formulas"]')?.remove();
    setNavButtonCopy(nav.querySelector('.nav-btn[data-page="classicdb"]'), 'Database');
    document.documentElement.classList.add('navigation-cleanup-ready');
  }

  function decorateCashShop() {
    const page = document.querySelector('[data-page="cashshop"]');
    const results = document.getElementById('cash-results');
    if (!page || !results) return;
    const cards = [...results.querySelectorAll('.cash-card')];
    let unavailable = 0;
    cards.forEach(card => {
      const price = card.querySelector('.cash-meta b');
      const priceText = String(price?.textContent || '').trim();
      const isUnavailable = card.classList.contains('cash-unavailable') || /^0\s*NX$/i.test(priceText);
      if (!isUnavailable) return;
      unavailable += 1;
      card.classList.add('cash-unavailable');
      card.dataset.cashAvailability = 'unavailable';
      if (price && priceText.toUpperCase() !== 'UNAVAILABLE') {
        price.textContent = 'UNAVAILABLE';
        price.setAttribute('aria-label', 'Unavailable in the current COT2 Cash Shop catalog');
      }
    });
    if (cards.length) {
      document.documentElement.classList.add('cash-shop-unavailable-ready');
      document.documentElement.dataset.cashUnavailableCount = String(unavailable);
      results.dataset.cashUnavailableDecorated = '1';
    }
  }

  function wireCashShopObserver() {
    const results = document.getElementById('cash-results');
    if (!results) return;
    if (cashResultsRoot !== results) {
      cashResultsObserver?.disconnect();
      cashResultsRoot = results;
      cashResultsObserver = new MutationObserver(() => decorateCashShop());
      cashResultsObserver.observe(results, { childList: true, subtree: true });
      results.dataset.cashObserverReady = '1';
    }
    decorateCashShop();
  }

  function watchVisualAssets() {
    document.querySelectorAll('img').forEach(img => {
      if (img.dataset.visualAuditHooked) return;
      img.dataset.visualAuditHooked = '1';
      img.addEventListener('load', () => { delete img.dataset.visualAuditFailed; });
      img.addEventListener('error', () => { img.dataset.visualAuditFailed = '1'; });
    });
    document.documentElement.classList.add('visual-asset-audit-ready');
  }

  function etcTargetParts(row) {
    const held = row.querySelector('input[data-held]');
    if (!held) return null;
    const children = [...row.children];
    const heldIndex = children.indexOf(held);
    const before = children.slice(0, heldIndex).reverse();
    const after = children.slice(heldIndex + 1);
    const minEl = before.find(el => /\bmin\b/i.test(el.textContent || '')) || null;
    const allInEl = after.find(el => /\ball-in\b/i.test(el.textContent || '')) || null;
    const minMatch = minEl?.textContent?.match(/\d+/);
    const allInMatch = allInEl?.textContent?.match(/\d+/);
    const min = minMatch ? Number(minMatch[0]) : 0;
    const allIn = allInMatch ? Number(allInMatch[0]) : NaN;
    const target = Number.isFinite(allIn) ? allIn : min;
    return { held, minEl, allInEl, target };
  }

  function setFilterCopy() {
    const label = document.getElementById('etc-hide-done')?.closest('label');
    if (!label) return;
    const textNode = [...label.childNodes].find(node => node.nodeType === Node.TEXT_NODE);
    if (textNode) textNode.textContent = ' Hide checked / satisfied';
  }

  function decorateEtcPlanner() {
    const page = document.querySelector('[data-page="etc"]');
    const list = document.getElementById('etc-list');
    if (!page || !list) return;

    document.documentElement.classList.add('etc-planner-fixed-ready');
    const heading = page.querySelector('.section-head h2');
    if (heading) heading.textContent = 'ETC Keep Checklist';

    const sectionHead = page.querySelector('.section-head');
    if (sectionHead && !page.querySelector('.etc-guidance')) {
      const guide = document.createElement('div');
      guide.className = 'etc-guidance';
      guide.innerHTML = '<b>One number. One checkbox.</b><span>KEEP is the exact cumulative target this build recommends. Bank that amount, then check the item off. There is no quantity entry.</span>';
      sectionHead.insertAdjacentElement('afterend', guide);
    }
    setFilterCopy();

    [...list.querySelectorAll('.etc-row')].forEach(row => {
      const parts = etcTargetParts(row);
      if (!parts) return;
      const { held, minEl, allInEl, target } = parts;
      const itemName = row.querySelector('.etc-name')?.textContent?.trim() || 'ETC item';
      const done = row.querySelector('input[data-etc-done]');

      row.classList.add('etc-fixed-target');
      row.dataset.recommendedKeep = String(target);
      held.hidden = true;
      held.tabIndex = -1;
      held.setAttribute('aria-hidden', 'true');
      if (minEl) minEl.hidden = true;
      if (allInEl) allInEl.hidden = true;

      let rec = row.querySelector('.etc-recommended');
      if (!rec) {
        rec = document.createElement('div');
        rec.className = 'etc-recommended';
        const anchor = allInEl || held.nextElementSibling;
        if (anchor) row.insertBefore(rec, anchor);
        else row.appendChild(rec);
      }
      rec.innerHTML = `<span>KEEP</span><b>${target}</b><small>recommended total</small>`;
      rec.title = `${itemName}: keep ${target}`;

      if (done) {
        done.classList.add('etc-done-control');
        done.setAttribute('aria-label', `Mark ${itemName} handled`);
        done.title = `Mark ${itemName} handled`;
        let wrap = done.closest('.etc-check-wrap');
        if (!wrap) {
          wrap = document.createElement('label');
          wrap.className = 'etc-check-wrap';
          done.parentNode.insertBefore(wrap, done);
          wrap.appendChild(done);
          const copy = document.createElement('span');
          copy.textContent = 'DONE';
          wrap.appendChild(copy);
        }
        wrap.classList.toggle('is-checked', done.checked);
        row.classList.toggle('is-done', done.checked);
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

    const pageBroken = page.scrollWidth > page.clientWidth + 3 || html.scrollWidth > html.clientWidth + 3;
    html.classList.add(pageBroken ? 'dashboard-page-overflow-detected' : 'dashboard-page-layout-ok');
  }

  function enhance() {
    document.documentElement.classList.add('dashboard-polish-ready');
    cleanNavigation();
    decorateActions();
    wireCashShopObserver();
    decorateEtcPlanner();
    watchVisualAssets();
    upgradeTrainMap().finally(() => requestAnimationFrame(() => requestAnimationFrame(verifyLayout)));
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(enhance, 80);
  }

  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  window.addEventListener('resize', schedule, { passive: true });
  document.addEventListener('change', schedule, true);
  document.addEventListener('click', schedule, true);
  enhance();
})();