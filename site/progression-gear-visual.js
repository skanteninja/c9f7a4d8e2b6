(() => {
  const D = window.GUIDE_DATA;
  const preset = D?.gearPresets?.efficient;
  if (!D || !preset?.levels?.length) return;

  const RAW = 'https://raw.githubusercontent.com/ohmi69/osms_datamine_dashboard/main/data/current/';
  let timer = null;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function level() {
    const select = Number(document.getElementById('level-select')?.value);
    const hero = Number(document.getElementById('hero-level')?.textContent);
    return Math.max(1, Math.min(Number(D.meta?.maxLevel) || 70, select || hero || 1));
  }

  function item(name) {
    return (D.gear || []).find(row => row.Item === name) || null;
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

  function nextStage(lv) {
    return [...preset.levels].sort((a,b) => Number(a.min)-Number(b.min)).find(stage => Number(stage.min) > lv) || null;
  }

  function upgradeDecisionAt(lv) {
    return (D.upgrades || []).find(row => Number(row.Lv) === lv) || null;
  }

  function currentItemImage(row) {
    const id = Number(row?.['Item ID'] || 0);
    if (!id) return '';
    return `${RAW}images/items/${String(Math.trunc(id)).padStart(8,'0')}.png`;
  }

  function weaponNameFromLabel(label) {
    const raw = String(label || '').split(/\s+[—-]\s+/)[0].trim();
    if (/^job wand$/i.test(raw)) return "Beginner's Wooden Wand / job wand";
    return raw;
  }

  function decisionTone(action) {
    const text = String(action || '').toUpperCase();
    if (text.includes('SKIP')) return 'skip';
    if (text.includes('BUY')) return 'buy';
    if (text.includes('HOLD')) return 'hold';
    return 'review';
  }

  function decisionVerb(action) {
    const text = String(action || '').toUpperCase();
    if (text.includes('SKIP')) return 'SKIP';
    if (text.includes('BUY')) return 'BUY';
    if (text.includes('HOLD')) return 'HOLD';
    return 'REVIEW';
  }

  function decisionCard(decision, lv) {
    if (!decision) return '';
    const currentName = weaponNameFromLabel(decision['Current Weapon']);
    const candidateName = weaponNameFromLabel(decision.Candidate);
    const currentRow = item(currentName);
    const candidateRow = item(candidateName);
    const currentSrc = currentItemImage(currentRow);
    const candidateSrc = currentItemImage(candidateRow);
    const action = String(decision['Default Action'] || 'REVIEW');
    const tone = decisionTone(action);
    const verb = decisionVerb(action);
    const gain = Number(decision['M.ATK Gain']);
    const exactInstruction = tone === 'skip'
      ? `KEEP ${currentName.toUpperCase()}`
      : tone === 'buy'
        ? `EQUIP ${candidateName.toUpperCase()}`
        : `${verb} ${candidateName.toUpperCase()}`;
    return `<section class="progression-upgrade-decision ${tone}" data-upgrade-decision-level="${lv}" data-upgrade-action="${verb}" data-upgrade-candidate="${esc(candidateName)}">
      <div class="progression-upgrade-kicker"><span>LV${lv} WEAPON DECISION</span><strong>${verb}</strong></div>
      <div class="progression-upgrade-flow">
        <div class="progression-upgrade-weapon current"><span>${currentSrc?`<img src="${esc(currentSrc)}" alt="${esc(currentName)}" loading="lazy" decoding="async">`:''}</span><div><small>KEEPING NOW</small><b>${esc(currentName)}</b></div></div>
        <i>→</i>
        <div class="progression-upgrade-weapon candidate"><span>${candidateSrc?`<img src="${esc(candidateSrc)}" alt="${esc(candidateName)}" loading="lazy" decoding="async">`:''}</span><div><small>UNLOCKED OPTION</small><b>${esc(candidateName)}</b>${Number.isFinite(gain)?`<em>+${gain} M.ATK</em>`:''}</div></div>
      </div>
      <div class="progression-upgrade-answer"><b>${esc(exactInstruction)}</b><p>${esc(decision.Why || '')}</p></div>
    </section>`;
  }

  function tile(slot, name, newNow, lv) {
    const row = item(name);
    const src = currentItemImage(row);
    const highly = !!row?.['Highly Recommended'];
    return `<div class="progression-loadout-item ${newNow?'new-at-level':''} ${highly?'highly-recommended':''}" data-loadout-slot="${esc(slot)}" data-loadout-item="${esc(name)}">
      <span class="progression-loadout-icon">${src?`<img src="${esc(src)}" alt="${esc(name)}" loading="lazy" decoding="async">`:'+'}</span>
      <span class="progression-loadout-copy"><small>${esc(slot)}</small><b>${esc(name)}</b><em>${newNow?`NEW AT LV ${lv}`:highly?'HIGHLY RECOMMENDED':'RECOMMENDED HOLD'}</em></span>
    </div>`;
  }

  function renderStrip(root) {
    if (!root?.parentElement) return;
    const lv = level();
    const loadout = loadoutAt(lv);
    const changed = changesAt(lv);
    const next = nextStage(lv);
    const decision = upgradeDecisionAt(lv);
    const entries = Object.entries(loadout).filter(([,name]) => name && name !== 'None');
    const id = `progression-loadout-${root.id}`;
    let strip = document.getElementById(id);
    if (!strip) {
      strip = document.createElement('section');
      strip.id = id;
      strip.className = 'progression-loadout-strip';
      root.parentElement.insertBefore(strip, root);
    }
    const changeCount = Object.keys(changed).length;
    const signature = JSON.stringify({lv,loadout,changed,next:Number(next?.min||0),decision:decision?{a:decision['Default Action'],c:decision.Candidate}:null});
    if (strip.dataset.signature === signature) return;
    strip.dataset.signature = signature;
    strip.innerHTML = `<div class="progression-loadout-head"><div><span>LEVEL-SYNCED EQUIPMENT</span><b>Recommended loadout · Lv${lv}</b><small>${changeCount?`${changeCount} recommended ${changeCount===1?'piece changes':'pieces change'} at this level.`:next?`Hold this set. Next recommended equipment change: Lv${Number(next.min)}.`:'Current recommended end-of-plan loadout.'}</small></div><strong>${changeCount?`NEW ×${changeCount}`:'HOLD'}</strong></div>${decisionCard(decision,lv)}<div class="progression-loadout-items">${entries.map(([slot,name]) => tile(slot,name,changed[slot]===name,lv)).join('')}</div>`;
    strip.querySelectorAll('img').forEach(img => img.addEventListener('error',()=>img.remove(),{once:true}));
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
      slot.classList.toggle('progression-recommended-equipped',recommended);
      slot.classList.toggle('progression-new-equipped',newNow);
      slot.classList.toggle('progression-target-mismatch',!!target && target !== 'None' && equipped !== target);
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
      const markerText = newNow ? `NEW LV${lv}` : 'REC';
      if (marker.textContent !== markerText) marker.textContent = markerText;
      marker.title = newNow ? `New recommended ${slotName} at level ${lv}` : `Recommended ${slotName} for level ${lv}`;
    });
  }

  function enhance() {
    ['equipment-window','equipment-window-page'].forEach(id => {
      const root = document.getElementById(id);
      if (!root) return;
      annotateEquipment(root);
      renderStrip(root);
    });
    document.documentElement.classList.add('progression-gear-visual-ready');
    document.documentElement.dataset.progressionGearVisualLevel = String(level());
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(enhance,70);
  }

  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-item-name','class']});
  document.addEventListener('change',schedule,true);
  document.addEventListener('input',schedule,true);
  document.addEventListener('click',schedule,true);
  enhance();
})();
