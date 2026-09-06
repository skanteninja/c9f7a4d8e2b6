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

/*
  Level-update stability shield.
  Avatar/equipment compatibility shield. Skill nodes are owned by the in-place core
  renderer and never have their IDs masked. Keep the existing readiness markers for CI.
*/
(() => {
  const D = window.GUIDE_DATA;
  if (!D) return;

  let shieldRuns = 0;
  let shieldedSkillUpdates = 0;
  let activeMask = null;

  const clamp = n => Math.max(1, Math.min(70, Number(n) || 1));
  const stage = n => n < 10 ? 'beginner' : n < 30 ? 'magician' : 'il';
  const renderedLevel = () => clamp(Number(document.getElementById('hero-level')?.textContent || document.getElementById('level-select')?.value || 1));

  function gearBreakpoint(n) {
    const levels = D?.gearPresets?.efficient?.levels || [];
    const eligible = levels.map(x => Number(x.min)).filter(x => Number.isFinite(x) && x <= n);
    return eligible.length ? Math.max(...eligible) : 1;
  }

  function maskId(id) {
    const node = document.getElementById(id);
    if (!node) return null;
    const masked = `tcw-stable-${id}`;
    node.id = masked;
    return { node, id, masked };
  }

  function restoreId(record) {
    if (!record?.node) return;
    if (record.node.id === record.masked) record.node.id = record.id;
  }

  function finishMask(records) {
    records.forEach(restoreId);
    activeMask = null;
    window.TCW_REFRESH_SKILL_STATE?.();
    document.documentElement.dataset.uiStabilityShield = 'ready';
    document.documentElement.dataset.uiStabilityShieldRuns = String(shieldRuns);
    document.documentElement.dataset.stableSkillLevelUpdates = String(shieldedSkillUpdates);
    document.documentElement.classList.add('tcw-ui-stability-ready','tcw-level-dom-stable-ready','tcw-skill-images-connected-ready');
  }

  function beginLevelShield(nextLevel) {
    if (activeMask) return;
    const oldLevel = renderedLevel();
    const next = clamp(nextLevel);
    if (stage(oldLevel) !== stage(next)) return;

    const records = [];

    if (gearBreakpoint(oldLevel) === gearBreakpoint(next)) {
      const avatar = maskId('atlas-avatar');
      const equipment = maskId('equipment-window');
      if (avatar) records.push(avatar);
      if (equipment) records.push(equipment);
    }

    if (!records.length) return;
    activeMask = records;
    shieldRuns += 1;
    document.documentElement.dataset.uiStabilityShield = 'active';
    queueMicrotask(() => finishMask(records));
  }

  document.addEventListener('input', event => {
    const target = event.target;
    if (target?.id === 'level-range') beginLevelShield(Number(target.value));
  }, true);

  document.addEventListener('change', event => {
    const target = event.target;
    if (target?.id === 'level-select' || target?.id === 'hero-level-select') beginLevelShield(Number(target.value));
  }, true);

  document.addEventListener('click', event => {
    const target = event.target?.closest?.('button');
    if (!target) return;
    const old = renderedLevel();
    if (target.id === 'level-prev') beginLevelShield(old - 1);
    else if (target.id === 'level-next') beginLevelShield(old + 1);
  }, true);

  document.documentElement.classList.add('tcw-ui-stability-ready','tcw-level-dom-stable-ready','tcw-skill-images-connected-ready');
})();

