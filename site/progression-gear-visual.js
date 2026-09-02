(() => {
  const D = window.GUIDE_DATA;
  const preset = D?.gearPresets?.efficient;
  if (!D || !preset?.levels?.length) return;

  let timer = null;
  let decisionsVerified = null;

  function level() {
    const select = Number(document.getElementById('level-select')?.value);
    const hero = Number(document.getElementById('hero-level')?.textContent);
    return Math.max(1, Math.min(Number(D.meta?.maxLevel) || 70, select || hero || 1));
  }

  function loadoutAt(lv) {
    const out = {};
    [...preset.levels].sort((a,b) => Number(a.min)-Number(b.min)).forEach(stage => {
      if (Number(stage.min) <= lv) Object.assign(out, stage.gear || {});
    });
    return out;
  }

  function changesAt(lv) {
    return {...(preset.levels.find(stage => Number(stage.min) === lv)?.gear || {})};
  }

  function upgradeDecisionAt(lv) {
    return (D.upgrades || []).find(row => Number(row.Lv) === lv) || null;
  }

  function weaponNameFromLabel(label) {
    const raw = String(label || '').split(/\s+[—-]\s+/)[0].trim();
    if (/^job wand$/i.test(raw)) return "Beginner's Wooden Wand / job wand";
    return raw;
  }

  function actionVerb(action) {
    const text = String(action || '').toUpperCase();
    if (text.includes('SKIP')) return 'SKIP';
    if (text.includes('BUY')) return 'BUY';
    if (text.includes('HOLD')) return 'HOLD';
    return 'REVIEW';
  }

  function verifyDecisionData() {
    if (decisionsVerified !== null) return decisionsVerified;
    const checks = [
      {lv:20,action:'SKIP',candidate:'Metal Wand',weapon:'Hardwood Wand'},
      {lv:25,action:'SKIP',candidate:'Ice Wand',weapon:'Hardwood Wand'},
      {lv:30,action:'BUY',candidate:'Mithril Wand',weapon:'Mithril Wand'}
    ];
    decisionsVerified = checks.every(check => {
      const decision = upgradeDecisionAt(check.lv);
      const loadout = loadoutAt(check.lv);
      return !!decision
        && actionVerb(decision['Default Action']) === check.action
        && weaponNameFromLabel(decision.Candidate) === check.candidate
        && loadout.Weapon === check.weapon;
    });
    document.documentElement.classList.toggle('progression-gear-decision-verified', decisionsVerified);
    document.documentElement.classList.toggle('progression-gear-decision-verification-failed', !decisionsVerified);
    return decisionsVerified;
  }

  function removeDuplicateGearUi() {
    document.querySelectorAll('.progression-loadout-strip').forEach(node => node.remove());
    document.querySelectorAll('.v5-avatar .avatar-equipped-icons').forEach(node => node.remove());
  }

  function annotateEquipment(root) {
    if (!root) return;
    const lv = level();
    const loadout = loadoutAt(lv);
    const changed = changesAt(lv);
    root.querySelectorAll('.gear-slot[data-slot]').forEach(slot => {
      const slotName = slot.dataset.slot;
      const target = loadout[slotName];
      const equipped = slot.dataset.itemName;
      const recommended = !!target && target !== 'None' && equipped === target;
      const newNow = recommended && changed[slotName] === target;
      slot.classList.toggle('progression-recommended-equipped', recommended);
      slot.classList.toggle('progression-new-equipped', newNow);
      slot.classList.toggle('progression-target-mismatch', !!target && target !== 'None' && equipped !== target);
      let marker = slot.querySelector('.progression-slot-marker');
      if (!recommended) {
        marker?.remove();
        return;
      }
      if (!marker) {
        marker = document.createElement('span');
        marker.className = 'progression-slot-marker';
        slot.appendChild(marker);
      }
      marker.textContent = newNow ? `NEW LV${lv}` : 'REC';
      marker.title = newNow ? `New recommended ${slotName} at level ${lv}` : `Recommended ${slotName} for level ${lv}`;
    });
  }

  function enhance() {
    if (!verifyDecisionData()) return;
    removeDuplicateGearUi();
    ['equipment-window','equipment-window-page'].forEach(id => annotateEquipment(document.getElementById(id)));
    document.documentElement.classList.add('progression-gear-visual-ready','progression-compact-dashboard-ready');
    document.documentElement.dataset.progressionGearVisualLevel = String(level());
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(enhance, 60);
  }

  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-item-name']});
  document.addEventListener('change',schedule,true);
  document.addEventListener('input',schedule,true);
  document.addEventListener('click',schedule,true);
  enhance();
})();