(() => {
  const D = window.GUIDE_DATA;

  function level() {
    return Math.max(1, Math.min(70, Number(document.getElementById('level-select')?.value || document.getElementById('hero-level')?.textContent || 1)));
  }

  function gearBreakpoint(levelValue) {
    const levels = D?.gearPresets?.efficient?.levels || [];
    const eligible = levels.map(x => Number(x.min)).filter(x => Number.isFinite(x) && x <= levelValue);
    return eligible.length ? Math.max(...eligible) : 1;
  }

  function mark(levelValue) {
    document.documentElement.dataset.autoGearLevel = String(levelValue);
    document.documentElement.classList.add('auto-gear-synced');
    document.querySelectorAll('.auto-gear-badge').forEach(badge => {
      const next = `AUTO RECOMMENDED · LV${levelValue}`;
      if (badge.textContent !== next) badge.textContent = next;
    });
  }

  const initialBreakpoint = gearBreakpoint(level());
  document.documentElement.dataset.autoGearAppliedBreakpoint = String(initialBreakpoint);

  function installSyntheticPresetGuard() {
    const button = document.getElementById('preset-efficient');
    if (!button || button.dataset.tcwSyntheticPresetGuard) return;
    button.dataset.tcwSyntheticPresetGuard = '1';

    button.addEventListener('click', event => {
      if (event.isTrusted || button.dataset.tcwAutoGearAllowOnce === '1') return;
      const currentBreakpoint = String(gearBreakpoint(level()));
      if (document.documentElement.dataset.autoGearAppliedBreakpoint === currentBreakpoint) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);

    button.addEventListener('click', event => {
      if (!event.isTrusted) return;
      document.documentElement.dataset.autoGearAppliedBreakpoint = String(gearBreakpoint(level()));
      mark(level());
    });
  }

  function apply(levelValue) {
    const breakpoint = gearBreakpoint(levelValue);
    if (document.documentElement.dataset.autoGearAppliedBreakpoint === String(breakpoint)) {
      mark(levelValue);
      return;
    }
    const button = document.getElementById('preset-efficient');
    if (!button) return;
    button.dataset.tcwAutoGearAllowOnce = '1';
    button.click();
    delete button.dataset.tcwAutoGearAllowOnce;
    document.documentElement.dataset.autoGearAppliedBreakpoint = String(breakpoint);
    mark(levelValue);
  }

  let queuedLevel = null;
  let microtaskQueued = false;
  function queue(levelValue) {
    queuedLevel = levelValue;
    if (microtaskQueued) return;
    microtaskQueued = true;
    queueMicrotask(() => {
      microtaskQueued = false;
      const next = Number.isFinite(Number(queuedLevel)) ? Number(queuedLevel) : level();
      queuedLevel = null;
      apply(next);
    });
  }

  function hook(id, eventName, readLevel) {
    const el = document.getElementById(id);
    if (!el || el.dataset.progressionLevelHook) return;
    el.dataset.progressionLevelHook = '1';
    el.addEventListener(eventName, () => {
      const next = readLevel ? Number(el.value) : level();
      queue(Number.isFinite(next) ? next : level());
    });
  }

  installSyntheticPresetGuard();
  hook('level-select','change',true);
  hook('hero-level-select','change',true);
  hook('level-range','input',true);
  hook('level-prev','click',false);
  hook('level-next','click',false);
  mark(level());
  document.documentElement.classList.add('progression-level-hook-ready');
})();

/* Dashboard composition: keep the existing compact Skill Tree intact, but place it inside Active Build. */
(() => {
  let timer = null;

  function mergeSkillTreeIntoHero() {
    const dashboard = document.querySelector('.dashboard-v72');
    const character = dashboard?.querySelector('.v5-character-hero');
    const skillTree = dashboard?.querySelector('.v6-skills-panel');
    const secondary = dashboard?.querySelector('.v72-secondary-content');
    if (!dashboard || !character || !skillTree) return;

    if (skillTree.parentElement !== character) character.appendChild(skillTree);
    skillTree.classList.add('tcw-hero-skill-tree');

    if (secondary) {
      const remainingPublicPanels = [...secondary.children].filter(el =>
        el !== skillTree && !el.classList.contains('v6-stats-panel')
      );
      secondary.classList.toggle('tcw-secondary-vacated', remainingPublicPanels.length === 0);
    }

    document.documentElement.classList.add('dashboard-skill-in-hero-ready');
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(mergeSkillTreeIntoHero, 40);
  }

  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  document.addEventListener('click', schedule, true);
  document.addEventListener('change', schedule, true);
  document.addEventListener('input', schedule, true);
  mergeSkillTreeIntoHero();
})();

/* Preserve decoded image nodes across renderer innerHTML swaps so level changes do not flash artwork. */
(() => {
  const root = document.getElementById('app');
  if (!root) return;

  const detached = new Map();
  let reuseCount = 0;

  function normalizedSrc(img) {
    const raw = img.getAttribute('src') || '';
    if (!raw) return '';
    try {
      const url = new URL(raw, location.href);
      return `${url.pathname}${url.search}`;
    } catch {
      return raw;
    }
  }

  function imageRole(img) {
    const skill = img.closest('[data-skill-name],[data-progress-skill]');
    if (skill) return `skill:${skill.dataset.skillName || skill.dataset.progressSkill || img.alt || ''}`;
    const slot = img.closest('[data-slot]');
    if (slot) return `slot:${slot.dataset.slot || img.alt || ''}`;
    return img.alt || '';
  }

  function key(img) {
    return `${normalizedSrc(img)}¦${imageRole(img)}`;
  }

  function imagesIn(node) {
    if (!(node instanceof Element)) return [];
    const out = [];
    if (node.tagName === 'IMG') out.push(node);
    node.querySelectorAll?.('img').forEach(img => out.push(img));
    return out;
  }

  function stash(img) {
    if (img.dataset.tcwContinuityDiscard === '1') {
      delete img.dataset.tcwContinuityDiscard;
      return;
    }
    if (img.isConnected || !img.complete || img.naturalWidth <= 0 || !normalizedSrc(img)) return;
    const k = key(img);
    const pool = detached.get(k) || [];
    if (!pool.includes(img)) pool.push(img);
    while (pool.length > 6) pool.shift();
    detached.set(k, pool);
  }

  function copyPresentation(from, to) {
    to.className = from.className;
    to.alt = from.alt;
    for (const name of ['title','loading','decoding','width','height','aria-hidden']) {
      if (from.hasAttribute(name)) to.setAttribute(name, from.getAttribute(name));
      else to.removeAttribute(name);
    }
    for (const attr of from.attributes) {
      if (!attr.name.startsWith('data-')) continue;
      if (/hooked|failed|continuity/i.test(attr.name)) continue;
      to.setAttribute(attr.name, attr.value);
    }
  }

  const observer = new MutationObserver(records => {
    const added = [];
    for (const record of records) {
      if (record.type !== 'childList') continue;
      record.removedNodes.forEach(node => imagesIn(node).forEach(stash));
      record.addedNodes.forEach(node => imagesIn(node).forEach(img => added.push(img)));
    }

    for (const img of added) {
      if (!img.isConnected) continue;
      const k = key(img);
      const pool = detached.get(k);
      if (!pool?.length) continue;
      let old = null;
      while (pool.length && !old) {
        const candidate = pool.shift();
        if (candidate && candidate !== img && candidate.complete && candidate.naturalWidth > 0 && !candidate.isConnected) old = candidate;
      }
      if (!pool.length) detached.delete(k);
      if (!old) continue;
      copyPresentation(img, old);
      img.dataset.tcwContinuityDiscard = '1';
      img.replaceWith(old);
      reuseCount += 1;
    }

    document.documentElement.dataset.stableImageReuses = String(reuseCount);
  });

  observer.observe(root, { childList: true, subtree: true });
  document.documentElement.classList.add('tcw-ui-stability-ready');
})();
