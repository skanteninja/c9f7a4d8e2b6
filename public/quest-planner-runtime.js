// Included inside the main app closure, sharing its build-scoped saved state.
function normalizeQuestProgress(progress) {
  const out = {...progress};
  for (const q of D.quests) {
    const key = `quest-${q['Quest ID']}`;
    if (!(key in out)) {
      const legacy = (q['Legacy Keys'] || []).find(k => k in progress);
      if (legacy) out[key] = !!progress[legacy];
    }
  }
  return out;
}
function questState(q) {
  if (state.quests[questId(q)]) return 'done';
  if (q.Lv > state.level) return 'upcoming';
  if ((q.Prerequisites || []).some(r => !state.quests[`quest-${r.id}`])) return 'blocked';
  if (q.Rotation || q.Conditions?.length || ['Citizenship','Event'].includes(q.Region)) return 'check';
  return 'ready';
}
function questReady(q) { return questState(q) === 'ready'; }
function questRelevant() { return true; }
const questOpen = new Set();
const questStateLabels = {ready:'Ready to start', blocked:'Prerequisites needed', upcoming:'Upcoming', check:'Check requirements', done:'Completed'};
function renderQuestFilters() {
  const regions = [...new Set(D.quests.map(q => q.Region).filter(Boolean))].sort();
  const select = document.getElementById('quest-region');
  if (select.options.length <= 1) regions.forEach(r => select.add(new Option(r, r)));
  const filters = select.parentElement;
  if (!document.getElementById('quest-town')) {
    const town = document.createElement('label'); town.className = 'quest-town-filter';
    town.innerHTML = 'Citizenship town<select id="quest-town"><option value="all">All towns</option><option value="1">Henesys</option><option value="2">Kerning City</option></select>';
    filters.appendChild(town);
    town.querySelector('select').addEventListener('input',e => {
      state.questTown=e.target.value; save(); renderQuests(); renderEtc(); renderDashboard();
    });
  }
  document.getElementById('quest-town').value=state.questTown;
  if (!document.getElementById('quest-status')) {
    const holder = document.createElement('div'); holder.className = 'quest-extra-filters';
    holder.innerHTML = `<label>Status<select id="quest-status"><option value="all">All statuses</option><option value="ready">Ready to start</option><option value="blocked">Prerequisites needed</option><option value="check">Check requirements</option><option value="upcoming">Upcoming</option><option value="done">Completed</option></select></label><label>Quest type<select id="quest-type"><option value="all">All types</option><option value="Once">One-time quests</option><option value="Daily">Daily quests</option><option value="Weekly">Weekly quests</option><option value="Repeatable">Repeatable quests</option><option value="rotation">Rotation pool</option></select></label><label>Sort<select id="quest-sort"><option value="route">Availability</option><option value="level">Level</option><option value="exp">EXP reward</option><option value="name">Name</option></select></label><button class="mini-btn" id="quest-clear" type="button">Clear filters</button>`;
    filters.after(holder);
    ['quest-status','quest-type','quest-sort'].forEach(id => document.getElementById(id).addEventListener('input', renderQuests));
    document.getElementById('quest-clear').addEventListener('click', () => {
      document.getElementById('quest-search').value = '';
      ['quest-priority','quest-region','quest-status','quest-type'].forEach(id => document.getElementById(id).value = 'all');
      document.getElementById('quest-sort').value = 'route';
      document.getElementById('quest-available').checked = false;
      document.getElementById('quest-hide-done').checked = false;
      state.questTown='all'; save();
      renderQuests();
    });
    const available = document.getElementById('quest-available');
    available.parentElement.lastChild.textContent = ' Unlocked by level';
    const heading = document.querySelector('[data-page="quests"] .eyebrow');
    if (heading) heading.textContent = 'YOUR QUEST JOURNAL';
    const intro = document.createElement('p'); intro.className = 'quest-intro';
    intro.textContent = 'Follow the chain, gather the right items, and see exactly what you earn. Completion is saved separately for each build. Town, crafting, and rotation conditions may need an in-game check.';
    filters.before(intro);
  }
  [['quest-search','Search quest names, NPCs, objectives, and rewards'],['quest-priority','Quest priority'],['quest-region','Quest region']].forEach(([id,label]) => document.getElementById(id).setAttribute('aria-label',label));
}
['quest-search','quest-priority','quest-region','quest-available','quest-hide-done'].forEach(id => document.getElementById(id).addEventListener('input', renderQuests));
function questItem(r, extra = '') {
  return `<li>${r.id ? `<img loading="lazy" src="/game-data/data/current/images/items/${String(r.id).padStart(8,'0')}.png" alt="" width="28" height="28">` : ''}<span>${esc(r.name)}${Number(r.count) > 1 ? ` ×${Number(r.count)}` : ''}${extra ? `<small>${esc(extra)}</small>` : ''}</span></li>`;
}
function questRewardGroups(groups, random) {
  return (groups || []).map(g => `<ul class="quest-item-list">${g.items.map(r => questItem(r, random ? `${Number(r.chance_pct)}% chance` : 'Choose one')).join('')}</ul>`).join('');
}
function questLink(id, name) {
  const target = D.quests.find(q => q['Quest ID'] === String(id));
  return target ? `<button type="button" class="quest-chain-link" data-quest-jump="${esc(id)}">${esc(name || target.Quest)}</button>` : `<span>${esc(name || `Quest #${id}`)} <small>(#${esc(id)} · check in-game; not listed in this journal)</small></span>`;
}
function renderQuestDetails(x) {
  const prerequisites = (x.Prerequisites || []).map(r => `<li><span class="quest-dependency ${state.quests[`quest-${r.id}`] ? 'complete' : ''}">${state.quests[`quest-${r.id}`] ? '✓ Completed' : 'Needed'}</span>${questLink(r.id, r.name)}</li>`).join('');
  const objectives = (x.Objectives || []).map(r => {
    if (r.type === 'item') return questItem(r, (x['Start Items'] || []).some(s => Number(s.id) === Number(r.id)) ? 'Given when starting this quest; still required for turn-in' : 'Collect for turn-in');
    return `<li><span>${esc(r.label || (r.type === 'mob' ? `Defeat ${r.name} ×${r.count}` : r.name || 'Check the quest requirement in-game'))}</span></li>`;
  }).join('');
  const rotation = x.Rotation;
  return `<div class="quest-detail-grid">
    <section><h3>Before you begin</h3><p><b>Talk to:</b> ${esc(x.NPC)} · ${esc(x.Region)}</p>${prerequisites ? `<ul class="quest-dependencies">${prerequisites}</ul>` : '<p>No prerequisite quest listed.</p>'}${x.Region === 'Event' ? '<p class="quest-condition">Check that this event is currently active in-game.</p>' : ''}${x.Region === 'Citizenship' ? '<p class="quest-condition">Check town residency and grade in-game.</p>' : ''}${rotation ? `<p class="quest-condition">${esc(rotation.group)}: ${Number(rotation.select_count)} of ${Number(rotation.pool_size)} quests selected ${esc(rotation.cadence)}.${rotation.one_time ? ' This introductory quest is completed once.' : ' Availability depends on the current rotation.'}</p>` : ''}${(x.Objectives || []).some(r => r.type === 'skill') ? '<p class="quest-condition">Check the required crafting skill level in-game.</p>' : ''}</section>
    <section><h3>Objectives</h3>${objectives ? `<ul class="quest-item-list">${objectives}</ul>` : `<p>Talk to the quest giver and follow the dialogue. No collection or kill objective listed.</p>`}${x['Start Items'].length ? `<h4>Given on start</h4><ul class="quest-item-list">${x['Start Items'].map(r => questItem(r)).join('')}</ul>` : ''}${x.Gather.length ? `<p class="quest-save"><b>Gather:</b> ${esc(x['Save Guidance'])}</p>` : ''}</section>
    <section><h3>Rewards</h3><div class="quest-reward-stats"><span><b>${Number(x.EXP).toLocaleString()}</b> EXP</span><span><b>${Number(x.Mesos).toLocaleString()}</b> mesos</span></div>${x['Guaranteed Rewards'].length ? `<h4>Guaranteed items</h4><ul class="quest-item-list">${x['Guaranteed Rewards'].map(r => questItem(r)).join('')}</ul>` : ''}${x['Choice Rewards'].length ? `<h4>Choose one reward</h4>${questRewardGroups(x['Choice Rewards'], false)}` : ''}${x['Random Rewards'].length ? `<h4>Random reward · one draw per group</h4>${questRewardGroups(x['Random Rewards'], true)}` : ''}${x.Contribution ? `<p><b>${esc(x.Contribution.town_name)} contribution:</b> ${esc(x.Contribution.formula || x.Contribution.label)}</p>` : ''}${!x['Guaranteed Rewards'].length && !x['Choice Rewards'].length && !x['Random Rewards'].length ? '<p>No item reward listed.</p>' : ''}</section>
    <section><h3>Quest chain</h3>${x.Chain ? `<p>${esc(x.Chain)}</p>` : ''}${x['Next Quest ID'] ? `<p>Next: ${questLink(x['Next Quest ID'], x['Next Quest'])}</p>` : '<p>No next quest listed.</p>'}<p class="quest-journal-copy">${esc(x.Journal[1] || x.Journal[0] || x['Why Do It'])}</p><a class="quest-reference" href="https://osmsdataexplorer.com/#quests?q=id%3A${encodeURIComponent(x['Quest ID'])}" target="_blank" rel="noopener noreferrer">View quest reference ↗</a></section>
  </div>`;
}
function renderQuests() {
  renderQuestFilters();
  const value = id => document.getElementById(id).value;
  const query = value('quest-search').trim().toLowerCase();
  const rows = D.quests.filter(x => {
    if (!questTownMatches(x)) return false;
    const status = questState(x);
    if (query.startsWith('#') ? x['Quest ID'] !== query.slice(1) : query && ![x.Quest,x['Quest ID'],x.Region,x.NPC,x.Chain,x['Reward / Unlock'],x.Requirements,x.Repeatable].join(' ').toLowerCase().includes(query)) return false;
    if (value('quest-priority') !== 'all' && x.Priority !== value('quest-priority')) return false;
    if (value('quest-region') !== 'all' && x.Region !== value('quest-region')) return false;
    if (value('quest-status') !== 'all' && status !== value('quest-status')) return false;
    if (value('quest-type') !== 'all' && (value('quest-type') === 'rotation' ? !x.Rotation : x.Repeatable !== value('quest-type'))) return false;
    if (document.getElementById('quest-available').checked && x.Lv > state.level) return false;
    if (document.getElementById('quest-hide-done').checked && status === 'done') return false;
    return true;
  });
  const rank = {ready:0,check:1,blocked:2,upcoming:3,done:4};
  rows.sort((a,b) => value('quest-sort') === 'exp' ? b.EXP-a.EXP || a.Lv-b.Lv : value('quest-sort') === 'name' ? a.Quest.localeCompare(b.Quest) : value('quest-sort') === 'level' ? a.Lv-b.Lv || a.Quest.localeCompare(b.Quest) : rank[questState(a)]-rank[questState(b)] || a.Lv-b.Lv || a.Quest.localeCompare(b.Quest));
  const done = D.quests.filter(x => questState(x) === 'done').length;
  const ready = D.quests.filter(questReady).length;
  document.getElementById('quest-summary').innerHTML = `<div class="quest-summary-main"><b>${rows.length} quests shown</b><span>Lv ${state.level} · ${esc(D.catalog?.builds?.find(b => b.id === window.TCW_ACTIVE_BUILD_ID)?.name || 'Current build')}</span></div><div class="quest-summary-counts"><span><b>${ready}</b> ready to start</span><span><b>${done}/${D.quests.length}</b> completed</span></div><progress value="${done}" max="${D.quests.length}" aria-label="Quest completion"></progress>`;
  const root = document.getElementById('quest-list');
  root.innerHTML = rows.length ? rows.map(x => {
    const status = questState(x), id = questId(x);
    const repeat = x.Rotation?.one_time ? `Once · ${x.Rotation.cadence} rotation` : x.Repeatable;
    return `<article class="quest-journal-card ${status === 'done' ? 'done' : ''}" data-quest-id="${esc(x['Quest ID'])}"><div class="quest-card-top"><label class="quest-complete-control"><input class="check quest-check" data-id="${esc(id)}" type="checkbox" ${status === 'done' ? 'checked' : ''} aria-label="Mark ${esc(x.Quest)} completed"><span>${status === 'done' ? 'Done' : 'Done?'}</span></label><span class="quest-level">Lv ${x.Lv}+</span><span class="quest-priority-tag">${esc(x.Priority)}</span><span class="quest-state ${status === 'check' ? 'requires-check' : status}">${questStateLabels[status]}</span><span class="quest-cadence">${esc(repeat)}</span></div><details ${questOpen.has(x['Quest ID']) ? 'open' : ''}><summary><span class="quest-title-copy"><span class="quest-name">${esc(x.Quest)}</span><span class="quest-location">${esc(x.Region)} · ${esc(x.NPC)}${x.Chain ? ` · ${esc(x.Chain)}` : ''}</span></span><span class="quest-preview-reward">${x.EXP ? `${Number(x.EXP).toLocaleString()} EXP` : 'Quest dialogue'}${x.Gather.length ? `<small>${x.Gather.length} item ${x.Gather.length === 1 ? 'type' : 'types'} to gather</small>` : ''}</span><span class="quest-expand-label">Details</span></summary>${renderQuestDetails(x)}</details></article>`;
  }).join('') : '<div class="quest-empty"><h3>No quests match these filters</h3><p>Try another region or status, or clear filters to explore the whole journal.</p></div>';
  root.querySelectorAll('details').forEach(el => el.addEventListener('toggle', () => {if (!el.isConnected) return; const id = el.closest('[data-quest-id]').dataset.questId; el.open ? questOpen.add(id) : questOpen.delete(id);}));
  root.querySelectorAll('.quest-check').forEach(el => el.addEventListener('change', () => {
    state.quests[el.dataset.id] = el.checked; save(); renderQuests(); renderEtc(); renderDashboard();
    const restored = root.querySelector(`[data-id="${el.dataset.id}"]`); (restored || document.getElementById('quest-hide-done')).focus();
  }));
  root.querySelectorAll('[data-quest-jump]').forEach(el => el.addEventListener('click', () => {
    const target = el.dataset.questJump;
    document.getElementById('quest-clear').click();
    document.getElementById('quest-search').value = `#${target}`;
    questOpen.add(target); renderQuests();
    const card = root.querySelector(`[data-quest-id="${target}"]`); card?.scrollIntoView({block:'center',behavior:'smooth'}); card?.querySelector('summary')?.focus();
  }));
  root.querySelectorAll('img').forEach(img => img.addEventListener('error', () => {img.hidden = true;}, {once:true}));
  document.documentElement.classList.add('quest-planner-ready');
}
