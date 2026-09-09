(() => {
  const D = window.GUIDE_DATA;
  const preset = D?.gearPresets?.efficient;
  if (!D) return;

  let timer = null;
  let decisionsVerified = null;

  function level() {
    const select = Number(document.getElementById('level-select')?.value);
    const heroSelect = Number(document.getElementById('hero-level-select')?.value);
    const hero = Number(document.getElementById('hero-level')?.textContent);
    return Math.max(1, Math.min(Number(D.meta?.maxLevel) || 70, select || heroSelect || hero || 1));
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
    if (window.TCW_ACTIVE_BUILD_ID && window.TCW_ACTIVE_BUILD_ID !== 'magician-il-fresh') {
      decisionsVerified = true;
      return decisionsVerified;
    }
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

  function ensureLevelHead(controls) {
    let head = controls.querySelector('.progression-avatar-level-head');
    if (!head) {
      head = document.createElement('div');
      head.className = 'progression-avatar-level-head';
      const label = document.createElement('span');
      label.textContent = 'LEVEL PROGRESSION';
      const badge = document.createElement('b');
      badge.className = 'progression-avatar-current-level';
      badge.append('Lv');
      head.append(label, badge);
      controls.insertBefore(head, controls.firstChild);
    }
    return head;
  }

  function ensureLevelTrack(controls, lv) {
    const range = controls.querySelector('#level-range, .v5-level-range');
    const milestones = controls.querySelector('.v5-milestones');
    if (!range || !milestones) return null;

    let track = controls.querySelector('.progression-level-track');
    if (!track) {
      track = document.createElement('div');
      track.className = 'progression-level-track';
      controls.appendChild(track);
    }
    if (range.parentElement !== track) track.appendChild(range);

    let readout = track.querySelector('.progression-level-slider-value');
    if (!readout) {
      readout = document.createElement('output');
      readout.className = 'progression-level-slider-value';
      readout.setAttribute('aria-hidden','true');
      track.appendChild(readout);
    }
    if (milestones.parentElement !== track) track.appendChild(milestones);

    const min = Number(range.min || 1);
    const max = Number(range.max || D.meta?.maxLevel || 70);
    const bounded = Math.max(min, Math.min(max, Number(lv) || min));
    const pct = max > min ? ((bounded - min) / (max - min)) * 100 : 0;
    track.style.setProperty('--level-pct', `${pct}%`);
    readout.textContent = `LV ${bounded}`;
    document.documentElement.classList.add('progression-level-scale-correct-ready');
    return track;
  }

  function unwrapOldAvatarColumn(character) {
    const column = character.querySelector('.progression-avatar-column');
    if (!column) return;
    const avatar = column.querySelector('.v5-avatar');
    const controls = column.querySelector('.progression-avatar-level-controls');
    if (avatar) character.insertBefore(avatar, character.firstChild);
    if (controls) character.appendChild(controls);
    column.remove();
  }

  function mergeAvatarAndLevel() {
    const dashboard = document.querySelector('.dashboard-v72');
    const character = dashboard?.querySelector('.v5-character-hero');
    if (!dashboard || !character) return false;

    const lv = level();
    const syncedLevel = Number(document.documentElement.dataset.autoGearLevel || 0);
    if (syncedLevel && syncedLevel !== lv) return false;

    unwrapOldAvatarColumn(character);

    let controls = character.querySelector(':scope > .progression-avatar-level-controls');
    const oldLevelPanel = dashboard.querySelector('.v5-level-hero, .v72-level-hero');
    if (oldLevelPanel) {
      if (!controls) {
        controls = document.createElement('div');
        controls.className = 'progression-avatar-level-controls progression-character-footer';
        character.appendChild(controls);
      }

      const head = ensureLevelHead(controls);
      const badge = head.querySelector('.progression-avatar-current-level');
      const heroLevel = oldLevelPanel.querySelector('#hero-level');
      const jobLine = oldLevelPanel.querySelector('#atlas-job-line');
      const stepper = oldLevelPanel.querySelector('.v5-level-stepper');
      const range = oldLevelPanel.querySelector('.v5-level-range');
      const milestones = oldLevelPanel.querySelector('.v5-milestones');

      if (heroLevel && badge && heroLevel.parentElement !== badge) badge.appendChild(heroLevel);
      if (stepper) controls.appendChild(stepper);
      if (range) controls.appendChild(range);
      if (milestones) controls.appendChild(milestones);
      if (jobLine) {
        jobLine.classList.add('progression-core-job-line');
        jobLine.hidden = true;
        jobLine.style.display = 'none';
        controls.appendChild(jobLine);
      }
      oldLevelPanel.remove();
    }
    if (!controls) return false;

    controls.classList.add('progression-character-footer');
    if (controls.parentElement !== character) character.appendChild(controls);
    const head = ensureLevelHead(controls);
    const badge = head.querySelector('.progression-avatar-current-level');
    const heroLevel = document.getElementById('hero-level');
    if (heroLevel && badge && heroLevel.parentElement !== badge) badge.appendChild(heroLevel);
    ensureLevelTrack(controls, lv);

    document.documentElement.classList.add('progression-avatar-level-merged-ready','progression-level-footer-ready');
    document.documentElement.classList.remove('progression-avatar-level-merge-missing');
    document.documentElement.dataset.progressionAvatarLevel = String(lv);
    return true;
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
    const merged = mergeAvatarAndLevel();
    document.documentElement.classList.add('progression-gear-visual-ready','progression-compact-dashboard-ready');
    if (!merged && document.querySelector('.dashboard-v72') && Number(document.documentElement.dataset.autoGearLevel || 0) === level()) {
      document.documentElement.classList.add('progression-avatar-level-merge-missing');
    }
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
