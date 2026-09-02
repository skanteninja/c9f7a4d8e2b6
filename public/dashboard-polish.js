(() => {
  let timer = null;

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
        const img = preview?.querySelector('img');
        if (img && !img.dataset.dashboardMapHooked) {
          img.dataset.dashboardMapHooked = '1';
          img.addEventListener('error', () => {
            preview.remove();
            row.classList.remove('has-route-map');
            verifyLayout();
          }, { once: true });
        }
      }
    });
  }

  function verifyLayout() {
    const panel = document.querySelector('.dashboard-v72 .v72-now-panel');
    const rows = [...document.querySelectorAll('.dashboard-v72 #dashboard-actions .atlas-action-row')];
    document.documentElement.classList.remove('dashboard-action-layout-ok','dashboard-overflow-detected');
    if (!panel || !rows.length) return;
    const panelRect = panel.getBoundingClientRect();
    const broken = rows.some(row => {
      const r = row.getBoundingClientRect();
      return row.scrollWidth > row.clientWidth + 3 || r.right > panelRect.right + 3 || r.left < panelRect.left - 3;
    });
    document.documentElement.classList.add(broken ? 'dashboard-overflow-detected' : 'dashboard-action-layout-ok');
  }

  function enhance() {
    document.documentElement.classList.add('dashboard-polish-ready');
    decorateActions();
    requestAnimationFrame(() => requestAnimationFrame(verifyLayout));
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
