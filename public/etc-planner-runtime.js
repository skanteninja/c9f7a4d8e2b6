// Included in the main app closure: quantities use the same build-scoped progress as quests.
function normalizeEtcProgress(progress) {
  const out = {...progress}, counts = {};
  for (const e of D.etc) counts[e.Item] = (counts[e.Item] || 0) + 1;
  for (const e of D.etc) {
    const key = `etc-${e['Item ID']}`;
    if (key in out || counts[e.Item] !== 1) continue;
    const aliases = [slug(e.Item), ...(e.Item === "Pig's Head" ? ['pig-head'] : []),
      ...(e.Item === "Arwen's Glass Shoe" ? ['glass-shoe'] : [])];
    const old = aliases.find(k => k in progress);
    if (old) out[key] = progress[old];
  }
  return out;
}
function questTownMatches(q) {
  return !state.questTown || state.questTown === 'all' || (q.Conditions || q.conditions || [])
    .filter(c => c.type === 'citizenship').every(c => String(c.town) === state.questTown);
}
function etcPlan(e) {
  const once = (e['Once Uses'] || []).filter(u => questTownMatches(u) && !state.quests[`quest-${u.questId}`]);
  const crafts = (e['Craft Uses'] || []).filter(u => state.craftPlans.includes(u.recipeId));
  const repeats = (e['Repeat Uses'] || []).filter(questTownMatches);
  const quest = once.reduce((n,u) => n + u.count,0), craft = crafts.reduce((n,u) => n + u.count,0);
  const base = quest + craft, keep = e['Buffer Eligible'] && base > 1 ? Math.ceil(base * 1.15) : base;
  const held = Number(state.etcHeld[etcId(e)] || 0);
  return {once, crafts, repeats, quest, craft, base, keep, held, left:Math.max(0,keep-held),
    start:Math.min(101,...once.map(u => u.level),...crafts.map(u => u.level))};
}
function etcDashboardNeeded(e) {
  const p = etcPlan(e);
  return e.Category === 'Etc' && !e['Quest Item'] && p.keep > 0 && p.left > 0 && p.start <= state.level + 5;
}
function renderEtcFilters() {
  const filters = document.getElementById('etc-search').parentElement;
  if (document.getElementById('etc-kind')) return;
  const bar = document.createElement('div'); bar.className = 'etc-planner-filters';
  bar.innerHTML = `<label>Materials<select id="etc-kind"><option value="bank">Bank targets</option><option value="quest">Quest-specific items</option><option value="craft">Crafting materials</option><option value="repeat">Recurring requests</option><option value="all">All requirements</option></select></label><label>Citizenship town<select id="etc-town"><option value="all">All towns</option><option value="1">Henesys</option><option value="2">Kerning City</option></select></label><span id="etc-summary" role="status"></span>`;
  filters.after(bar);
  const recipes = document.createElement('details'); recipes.className = 'etc-craft-plans panel';
  recipes.innerHTML = `<summary>Optional weapon crafts · ${D.etcCraftPlans.length} recipes for this build</summary><p>Select only the weapons you plan to craft. Shop purchases and drops need no crafting reserve. Quantities below are for one craft each.</p><div class="etc-craft-grid">${D.etcCraftPlans.map(p => `<label><input type="checkbox" data-craft-plan="${esc(p.id)}"><span><b>${esc(p.name)}</b><small>Character Lv${p.level} · ${esc(p.discipline)} Lv${p.craftLevel} · ${Number(p.mesos || 0).toLocaleString()} mesos</small></span></label>`).join('')}</div>${D.etcCraftPlans.length ? '' : '<p>No recipe is listed for the current weapon checkpoints.</p>'}`;
  bar.after(recipes);
  recipes.querySelectorAll('[data-craft-plan]').forEach(input => input.addEventListener('change', () => {
    state.craftPlans = [...recipes.querySelectorAll('[data-craft-plan]:checked')].map(el => el.dataset.craftPlan);
    save(); renderEtc(); renderDashboard();
  }));
  document.getElementById('etc-kind').addEventListener('input',renderEtc);
  document.getElementById('etc-town').addEventListener('input',e => {
    state.questTown = e.target.value; save(); renderEtc(); renderQuests(); renderDashboard();
  });
  document.getElementById('etc-search').setAttribute('aria-label','Search materials, quests, and crafts');
  document.getElementById('etc-hide-done').closest('label').lastChild.textContent = ' Hide banked / finished';
  const section = document.querySelector('section[data-page="etc"]');
  section.querySelector('.section-head h2').textContent = 'Quest & ETC Planner';
  section.querySelector('.section-head .eyebrow').textContent = 'YOUR BUILD’S MATERIALS';
  const intro = document.createElement('p'); intro.className = 'etc-planner-intro';
  intro.textContent = 'Bank targets cover remaining one-time quests and selected crafts. Ordinary ETC stacks include a 15% buffer; quest-specific items use exact quantities. Daily, weekly, and repeatable requests are shown per run. Held counts are your current inventory; update them after turn-ins.';
  filters.before(intro);
}
function etcUseMarkup(u, repeat = false) {
  const conditions = (u.conditions || []).map(c => c.label).filter(Boolean);
  if (u.region === 'Event') conditions.push('Event must be active');
  if (u.rotation) conditions.push(u.rotation.one_time ? 'One-time rotation quest' : 'Only when selected by the rotation');
  return `<li><button type="button" data-material-quest="${esc(u.questId)}">${esc(u.name)}</button><b>×${u.count}</b><small>Lv${u.level}+${repeat ? ` · ${esc(u.cadence)} · per run` : ''}${u.job !== 'Any class' ? ` · ${esc(u.job)}` : ''}${conditions.length ? ` · ${esc(conditions.join(' · '))}` : ''}</small></li>`;
}
function renderEtc() {
  renderEtcFilters();
  document.getElementById('etc-town').value = state.questTown;
  document.querySelectorAll('[data-craft-plan]').forEach(el => el.checked = state.craftPlans.includes(el.dataset.craftPlan));
  const search = document.getElementById('etc-search').value.trim().toLowerCase();
  const kind = document.getElementById('etc-kind').value;
  const current = document.getElementById('etc-current-only').checked, hide = document.getElementById('etc-hide-done').checked;
  const rows = D.etc.map(e => ({e,p:etcPlan(e)})).filter(({e,p}) => {
    if (search && !JSON.stringify(e).toLowerCase().includes(search)) return false;
    if (hide && state.etcDone[etcId(e)]) return false;
    const start = kind === 'repeat' ? Math.min(101,...p.repeats.map(u => u.level)) : p.start;
    if (current && start > state.level) return false;
    if (kind === 'bank') return !e['Quest Item'] && e.Category === 'Etc' && p.base > 0;
    if (kind === 'quest') return (e['Quest Item'] || e.Category !== 'Etc') && p.once.length > 0;
    if (kind === 'craft') return e['Craft Uses'].length > 0;
    if (kind === 'repeat') return p.repeats.length > 0;
    return p.base > 0 || p.repeats.length > 0 || e['Craft Uses'].length > 0;
  });
  const branch = D.quests.find(q => q['Job Family'] !== 'Any class')?.['Job Family'] || 'Current build';
  document.getElementById('etc-summary').textContent = `${branch} · ${rows.length} ${rows.length === 1 ? 'material' : 'materials'} · ${state.craftPlans.length} ${state.craftPlans.length === 1 ? 'craft' : 'crafts'} selected`;
  const root = document.getElementById('etc-list');
  root.innerHTML = rows.map(({e,p}) => {
    const id = etcId(e), done = !!state.etcDone[id], repeated = kind === 'repeat';
    const perRun = Math.max(0,...p.repeats.map(u => u.count));
    const oneOff = e['Quest Item'] || e.Category !== 'Etc';
    return `<article class="etc-row etc-planner-card ${done ? 'done' : ''}" data-item-id="${e['Item ID']}" data-etc-target="${p.keep}"><div class="etc-card-head"><img src="/game-data/data/current/images/items/${String(e['Item ID']).padStart(8,'0')}.png" width="32" height="32" loading="lazy" alt=""><div><h3 class="etc-name">${esc(e.Item)}</h3><p>${oneOff ? 'Exact quest turn-in item' : 'ETC material'} · #${e['Item ID']}</p></div><div class="etc-recommended"><b>${repeated ? perRun : p.keep}</b><small>${repeated ? 'largest single request' : p.keep ? 'remaining target' : 'optional'}</small></div></div><div class="etc-audit-breakdown"><span><small>QUESTS LEFT</small><b>${p.quest}</b></span><span><small>SELECTED CRAFTS</small><b>${p.craft}</b></span><span><small>${e['Buffer Eligible'] ? 'WITH 15% BUFFER' : 'EXACT QUANTITY'}</small><b>${p.keep}</b></span>${p.repeats.length ? '<span class="weekly"><small>RECURRING</small><b>per run below</b></span>' : ''}</div><div class="etc-stock-controls"><label>Currently held<input type="number" min="0" step="1" value="${p.held}" data-held="${esc(id)}" aria-label="Currently held ${esc(e.Item)}"></label><span><b>${p.left}</b> left to bank</span><label><input class="check" type="checkbox" data-etc-done="${esc(id)}" ${done ? 'checked' : ''}> Banked / finished</label></div><details><summary>Quests & crafting requirements</summary>${p.once.length ? `<h4>Remaining one-time quests</h4><ul class="etc-use-list">${p.once.map(u => etcUseMarkup(u)).join('')}</ul>` : '<p>No remaining one-time quest demand.</p>'}${p.crafts.length ? `<h4>Selected crafts</h4><ul class="etc-use-list">${p.crafts.map(u => `<li><span>${esc(u.name)}</span><b>×${u.count}</b><small>Weapon checkpoint Lv${u.level}</small></li>`).join('')}</ul>` : ''}${p.repeats.length ? `<h4>Recurring requests · collect for the active quest</h4><ul class="etc-use-list">${p.repeats.map(u => etcUseMarkup(u,true)).join('')}</ul>` : ''}${oneOff ? '<p>Quest items may be obtained during the quest or its chain. Do not farm spare copies.</p>' : ''}</details></article>`;
  }).join('') || '<div class="quest-empty"><h3>No materials match these filters</h3><p>Try another material type, clear the search, or select a craft.</p></div>';
  root.querySelectorAll('[data-held]').forEach(input => input.addEventListener('change', () => {
    state.etcHeld[input.dataset.held] = Math.max(0,Math.floor(Number(input.value)||0)); save(); renderEtc(); renderDashboard();
  }));
  root.querySelectorAll('[data-etc-done]').forEach(input => input.addEventListener('change', () => {
    state.etcDone[input.dataset.etcDone] = input.checked; save(); renderEtc(); renderDashboard();
  }));
  root.querySelectorAll('[data-material-quest]').forEach(button => button.addEventListener('click', () => {
    const town = state.questTown;
    document.getElementById('quest-clear').click(); state.questTown = town; save();
    document.getElementById('quest-search').value = `#${button.dataset.materialQuest}`;
    questOpen.add(button.dataset.materialQuest); renderQuests();
    document.querySelector('#nav [data-page="quests"]').click();
  }));
  root.querySelectorAll('img').forEach(img => img.addEventListener('error', () => {img.hidden=true;},{once:true}));
  document.documentElement.classList.add('etc-lifetime-audit-ready','etc-planner-ready');
}
