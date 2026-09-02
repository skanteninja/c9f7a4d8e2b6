(() => {
  let timer = null;

  function level() {
    return Math.max(1, Math.min(70, Number(document.getElementById('level-select')?.value || document.getElementById('hero-level')?.textContent || 1)));
  }

  function mark(levelValue) {
    document.documentElement.dataset.autoGearLevel = String(levelValue);
    document.documentElement.classList.add('auto-gear-synced');
    document.querySelectorAll('.auto-gear-badge').forEach(badge => badge.textContent = `AUTO RECOMMENDED · LV${levelValue}`);
  }

  function apply(levelValue) {
    if (document.documentElement.dataset.autoGearLevel === String(levelValue)) return;
    const button = document.getElementById('preset-efficient');
    if (!button) return;
    button.click();
    mark(levelValue);
  }

  function queue(levelValue) {
    clearTimeout(timer);
    timer = setTimeout(() => apply(levelValue), 180);
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

  hook('level-select','change',true);
  hook('hero-level-select','change',true);
  hook('level-range','input',true);
  hook('level-prev','click',false);
  hook('level-next','click',false);
  document.documentElement.classList.add('progression-level-hook-ready');
})();
