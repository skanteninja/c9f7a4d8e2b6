(() => {
  const D = window.GUIDE_DATA;
  if (!D) return;
  // This richer board is the I/L route's synchronization layer. Fighter and
  // Hunter use the selected guide's native skill renderer instead of inheriting
  // Magician milestones and allocation labels.
  if ((window.TCW_ACTIVE_BUILD_ID || 'magician-il-fresh') !== 'magician-il-fresh') {
    document.documentElement.classList.add('progression-sync-build-aware');
    return;
  }

  const RAW = 'https://raw.githubusercontent.com/ohmi69/osms_datamine_dashboard/main/data/current/';
  const BEGINNER_PLAN = {
    1: { 'Nimble Feet': 0, 'Three Snails': 0, Recovery: 0 },
    2: { 'Nimble Feet': 1, 'Three Snails': 0, Recovery: 0 },
    3: { 'Nimble Feet': 2, 'Three Snails': 0, Recovery: 0 },
    4: { 'Nimble Feet': 3, 'Three Snails': 0, Recovery: 0 },
    5: { 'Nimble Feet': 3, 'Three Snails': 1, Recovery: 0 },
    6: { 'Nimble Feet': 3, 'Three Snails': 2, Recovery: 0 },
    7: { 'Nimble Feet': 3, 'Three Snails': 3, Recovery: 0 },
    8: { 'Nimble Feet': 3, 'Three Snails': 3, Recovery: 1 },
    9: { 'Nimble Feet': 3, 'Three Snails': 3, Recovery: 2 },
    10: { 'Nimble Feet': 3, 'Three Snails': 3, Recovery: 3 }
  };
  const TIERS = [
    { id: 'beginner', label: 'Beginner', opens: 1, names: ['Nimble Feet','Three Snails','Recovery'] },
    { id: 'magician', label: 'Magician · 1st Job', opens: 10, names: ['Energy Bolt','Magic Claw','Magic Guard','Improved MP Recovery','Max MP Increase','Magic Armor'] },
    { id: 'il', label: 'Wizard (I/L) · 2nd Job', opens: 30, names: ['Teleport','Cold Beam','Thunder Bolt','MP Eater','Meditation','Slow'] }
  ];
  const ABBR = {
    magician: { EB:'Energy Bolt', MC:'Magic Claw', MG:'Magic Guard', MPR:'Improved MP Recovery', MaxMP:'Max MP Increase', Armor:'Magic Armor' },
    il: { TP:'Teleport', CB:'Cold Beam', TB:'Thunder Bolt', 'MP Eater':'MP Eater', Med:'Meditation', Slow:'Slow' }
  };

  let skillPromise = null;
  let timer = null;
  let gearTimer = null;
  let lastLevel = null;
  let booted = false;

  const norm = value => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function currentLevel() {
    const hero = Number(document.getElementById('hero-level')?.textContent);
    const select = Number(document.getElementById('level-select')?.value);
    return Math.max(1, Math.min(Number(D.meta?.maxLevel)||70, hero || select || 1));
  }

  function collectSkills(value, out=[]) {
    if (Array.isArray(value)) { value.forEach(v => collectSkills(v,out)); return out; }
    if (!value || typeof value !== 'object') return out;
    if (value.id !== undefined && value.name && value.thumbnail) out.push(value);
    Object.values(value).forEach(v => { if (v && typeof v === 'object') collectSkills(v,out); });
    return out;
  }

  function skillIndex() {
    if (!skillPromise) {
      skillPromise = fetch(`${RAW}skills.json`, {cache:'force-cache'})
        .then(r => { if(!r.ok) throw new Error(`skills ${r.status}`); return r.json(); })
        .then(data => {
          const byName = new Map();
          collectSkills(data).forEach(skill => {
            const key = norm(skill.name);
            if (key && !byName.has(key)) byName.set(key,skill);
          });
          return byName;
        }).catch(() => new Map());
    }
    return skillPromise;
  }

  function parseAllocation(text, kind) {
    const out = {};
    const map = ABBR[kind] || {};
    String(text || '').split('|').forEach(part => {
      const match = part.trim().match(/^(.+?)\s+(\d+)$/);
      if (!match) return;
      const name = map[match[1].trim()];
      if (name) out[name] = Number(match[2]);
    });
    return out;
  }

  function latestAllocation(kind, level) {
    if (kind === 'beginner') return BEGINNER_PLAN[Math.min(10,Math.max(1,level))] || BEGINNER_PLAN[1];
    const token = kind === 'magician' ? /\bEB\s+\d+/ : /\bTP\s+\d+/;
    const rows = (D.skills || []).filter(row => Number(row.Level) <= level && token.test(String(row['Result After Level'] || '')));
    if (!rows.length) return {};
    return parseAllocation(rows[rows.length - 1]['Result After Level'], kind);
  }

  function maxLevel(skill, fallback) {
    const value = Number(skill?.max_level);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  function fallbackMax(name) {
    if (['Nimble Feet','Three Snails','Recovery'].includes(name)) return 3;
    const first = { 'Energy Bolt':20,'Magic Claw':20,'Magic Guard':15,'Improved MP Recovery':16,'Max MP Increase':15,'Magic Armor':20 };
    const second = { Teleport:20,'Cold Beam':30,'Thunder Bolt':30,'MP Eater':20,Meditation:20,Slow:20 };
    return first[name] || second[name] || 20;
  }

  function localSkillUrl(name) {
    return String(D.skillIcons?.[name]?.url || '').trim();
  }

  function skillIcon(skill, name) {
    const current = skill?.thumbnail ? `${RAW}${String(skill.thumbnail).replace(/^\/+/, '')}` : '';
    const fallback = localSkillUrl(name);
    const src = current || fallback;
    if (!src) return '<span class="progress-skill-fallback">✦</span>';
    const fallbackAttr = current && fallback && fallback !== current ? ` data-skill-fallback="${esc(fallback)}"` : '';
    return `<img src="${esc(src)}"${fallbackAttr} alt="${esc(name)}" loading="lazy" decoding="async">`;
  }

  function wireSkillImages(root) {
    root?.querySelectorAll('img').forEach(img => {
      if (img.dataset.progressionSkillHooked) return;
      img.dataset.progressionSkillHooked = '1';
      img.addEventListener('error',()=>{
        const fallback = img.dataset.skillFallback;
        if (fallback && !img.dataset.skillFallbackUsed) {
          img.dataset.skillFallbackUsed = '1';
          img.src = fallback;
          return;
        }
        const wrap = img.closest('.skill-img-wrap,.progress-skill-icon');
        if (wrap && !wrap.querySelector('.progress-skill-fallback')) {
          const mark = document.createElement('span');
          mark.className = 'progress-skill-fallback';
          mark.textContent = '✦';
          wrap.appendChild(mark);
        }
        img.remove();
      },{once:false});
    });
  }

  function tierCard(name, level, skill, tierLocked=false) {
    const max = maxLevel(skill, fallbackMax(name));
    const learned = level > 0;
    return `<article class="progress-skill-card ${learned?'learned':'unlearned'} ${tierLocked?'tier-locked':''}" data-progress-skill="${esc(name)}">
      <span class="progress-skill-icon">${skillIcon(skill,name)}</span>
      <div><b>${esc(name)}</b><small>Lv ${level}/${max}</small></div>
      <span class="progress-skill-state">${tierLocked?'LOCKED':learned?'ACTIVE':'0 SP'}</span>
    </article>`;
  }

  async function renderMasteryBoard() {
    const list = document.getElementById('skill-list');
    if (!list) return;
    const level = currentLevel();
    const idx = await skillIndex();
    if (!document.body.contains(list)) return;

    let board = document.getElementById('skill-progression-board');
    if (!board) {
      board = document.createElement('section');
      board.id = 'skill-progression-board';
      board.className = 'skill-progression-board';
      list.parentNode.insertBefore(board,list);
    }
    if (board.dataset.progressionLevel === String(level) && board.querySelector('.progress-skill-tier')) {
      wireSkillImages(board);
      document.documentElement.classList.add('skill-progression-board-ready');
      return;
    }

    board.dataset.progressionLevel = String(level);
    board.innerHTML = `<div class="skill-progression-head"><div><span>LEVEL-SYNCED SKILL TREE</span><h3>Skill Mastery at Lv${level}</h3><small>Grey = 0 points. A skill returns to full color the moment this progression begins investing in it.</small></div><b>Lv${level}</b></div>` + TIERS.map(tier => {
      const alloc = latestAllocation(tier.id,level);
      const locked = level < tier.opens;
      return `<section class="progress-skill-tier ${locked?'locked':''}"><div class="progress-tier-title"><b>${esc(tier.label)}</b><small>${tier.id==='beginner'?'Recommended order: Nimble Feet → Three Snails → Recovery':`Opens at Lv${tier.opens}`}</small></div><div class="progress-skill-grid">${tier.names.map(name => tierCard(name,Number(alloc[name]||0),idx.get(norm(name)),locked)).join('')}</div></section>`;
    }).join('');

    wireSkillImages(board);
    document.documentElement.classList.add('skill-progression-board-ready');
  }

  function renderBeginnerDashboard(idx = null) {
    const active = document.querySelector('#atlas-skill-tabs [data-skill-tab="beginner"].active');
    const grid = document.getElementById('atlas-skill-grid');
    const detail = document.getElementById('atlas-skill-detail');
    if (!active || !grid || !detail) return false;
    const level = currentLevel();
    const enriched = !!(idx && idx.size);
    const alreadyCards = grid.querySelectorAll('.beginner-skill-card').length === 3 && !grid.querySelector('.beginner-milestone-grid');
    const currentMode = grid.dataset.beginnerRenderMode || '';
    if (alreadyCards && (currentMode === 'cot2' || !enriched)) {
      const allocation = latestAllocation('beginner',level);
      grid.querySelectorAll('[data-skill-name]').forEach(card => {
        const lv = Number(allocation[card.dataset.skillName] || 0);
        card.classList.toggle('learned',lv > 0);
        card.classList.toggle('unlearned',lv === 0);
        const small = card.querySelector('small'), text = `Lv. ${lv}/3`;
        if(small && small.textContent !== text) small.firstChild.data = text;
      });
      grid.dataset.beginnerRenderLevel = String(level);
      wireSkillImages(grid);
      wireSkillImages(detail);
      document.documentElement.classList.add('beginner-skill-tree-ready','dashboard-skill-immediate-ready');
      return true;
    }

    const alloc = latestAllocation('beginner',level);
    const names = TIERS[0].names;
    const getSkill = name => idx?.get?.(norm(name)) || null;
    grid.dataset.beginnerRenderLevel = String(level);
    grid.dataset.beginnerRenderMode = enriched ? 'cot2' : 'fallback';
    grid.innerHTML = names.map(name => {
      const skill = getSkill(name);
      const lv = Number(alloc[name]||0);
      const max = maxLevel(skill,3);
      return `<button class="atlas-skill-card beginner-skill-card ${lv>0?'learned':'unlearned'}" data-skill-name="${esc(name)}"><span class="skill-img-wrap">${skillIcon(skill,name)}</span><b>${esc(name)}</b><small>Lv. ${lv}/${max}</small></button>`;
    }).join('');

    const firstNext = names.find(name => Number(alloc[name]||0) < 3) || 'Recovery';
    function show(name) {
      const skill = getSkill(name);
      const lv = Number(alloc[name]||0);
      const max = maxLevel(skill,3);
      const stats = Array.isArray(skill?.all_level_stats) && lv > 0 ? String(skill.all_level_stats[Math.min(lv-1,skill.all_level_stats.length-1)]||'') : '';
      detail.innerHTML = `<span class="skill-img-wrap">${skillIcon(skill,name)}</span><div><span class="detail-kicker">BEGINNER · CURRENT COT2 SKILL</span><b>${esc(name)} · Lv ${lv}/${max}</b><p>${esc(skill?.description || (lv ? 'Active in the recommended Beginner progression.' : 'Not invested yet; this icon stays grey until its first recommended point.'))}</p>${stats?`<small>${esc(stats)}</small>`:''}<small class="evidence-inline">Recommended planner order: Nimble Feet 3 → Three Snails 3 → Recovery 3. Beginner skill acquisition is still rechecked against live/tutorial behavior.</small></div>`;
      wireSkillImages(detail);
    }
    grid.querySelectorAll('[data-skill-name]').forEach(btn => btn.addEventListener('click',()=>{
      grid.querySelectorAll('.atlas-skill-card').forEach(x=>x.classList.remove('selected'));
      btn.classList.add('selected');
      show(btn.dataset.skillName);
    }));
    wireSkillImages(grid);
    show(firstNext);
    document.documentElement.classList.add('beginner-skill-tree-ready','dashboard-skill-immediate-ready');
    return true;
  }

  function decorateExistingSkillCards() {
    document.querySelectorAll('.atlas-skill-card').forEach(card => {
      const text = card.querySelector('small')?.textContent || '';
      const match = text.match(/Lv\.?\s*(\d+)/i);
      const lv = Number(match?.[1] || 0);
      card.classList.toggle('learned',lv > 0);
      card.classList.toggle('unlearned',lv <= 0);
    });
  }

  function addGearBadges() {
    const level = currentLevel();
    const wanted = `AUTO RECOMMENDED · LV${level}`;
    const targets = [
      document.querySelector('.dashboard-v72 .v5-equipment-hero .v5-panel-heading'),
      document.getElementById('equipment-window-page')?.parentElement?.querySelector('.section-head')
    ].filter(Boolean);
    targets.forEach(root => {
      let badge = root.querySelector('.auto-gear-badge');
      if (!badge) { badge=document.createElement('span');badge.className='auto-gear-badge';root.appendChild(badge); }
      if (badge.textContent !== wanted) badge.textContent = wanted;
    });
  }

  function applyRecommendedGear(level) {
    const button = document.getElementById('preset-efficient');
    if (!button) return;
    button.click();
    document.documentElement.dataset.autoGearLevel = String(level);
    document.documentElement.classList.add('auto-gear-synced');
    addGearBadges();
  }

  function syncLevel() {
    const level = currentLevel();
    if (lastLevel === null) {
      lastLevel = level;
      addGearBadges();
      return;
    }
    if (level === lastLevel) return;
    lastLevel = level;
    clearTimeout(gearTimer);
    gearTimer = setTimeout(()=>applyRecommendedGear(level),120);
  }

  async function enhance() {
    document.documentElement.classList.add('progression-sync-ready');
    syncLevel();
    addGearBadges();
    renderBeginnerDashboard();
    decorateExistingSkillCards();
    const idxPromise = skillIndex();
    await Promise.allSettled([
      renderMasteryBoard(),
      idxPromise.then(idx => renderBeginnerDashboard(idx))
    ]);
  }

  function schedule() { clearTimeout(timer); timer=setTimeout(enhance,55); }
  new MutationObserver(()=>{
    if (document.querySelector('#atlas-skill-tabs [data-skill-tab="beginner"].active') && document.querySelector('#atlas-skill-grid .beginner-milestone-grid')) {
      renderBeginnerDashboard();
    }
    schedule();
  }).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',schedule,true);
  document.addEventListener('change',schedule,true);
  document.addEventListener('input',schedule,true);
  window.addEventListener('resize',schedule,{passive:true});

  if (!booted) { booted=true; enhance(); }
})();
