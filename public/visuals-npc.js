(() => {
  const REPO_RAW = 'https://raw.githubusercontent.com/ohmi69/osms_datamine_dashboard/main/';
  const RAW = `${REPO_RAW}data/current/`;
  let lookupsPromise = null;
  let questsPromise = null;
  let timer = null;

  const norm = value => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function loadJson(file) {
    return fetch(`${RAW}${file}`, {cache:'force-cache'})
      .then(r => { if (!r.ok) throw new Error(`${file} HTTP ${r.status}`); return r.json(); })
      .catch(() => null);
  }

  function lookups() {
    if (!lookupsPromise) {
      lookupsPromise = loadJson('lookups.json').then(data => {
        const byName = new Map();
        Object.entries(data?.npc_names || {}).forEach(([id,name]) => {
          const key = norm(name);
          if (key && !byName.has(key)) byName.set(key, {id:Number(id),name});
        });
        return {byName};
      });
    }
    return lookupsPromise;
  }

  function quests() {
    if (!questsPromise) {
      questsPromise = loadJson('quests.json').then(data => {
        const exact = new Map();
        (data?.quests || []).forEach(q => {
          const key = norm(q?.name);
          if (key && !exact.has(key)) exact.set(key,q);
        });
        return exact;
      });
    }
    return questsPromise;
  }

  function npcUrl(id) {
    return `${RAW}images/npcs/${String(Math.trunc(Number(id))).padStart(7,'0')}.png`;
  }

  function npcCard(npc, note='Quest giver') {
    const wrap = document.createElement('div');
    wrap.className = 'visual-npc-card';
    const img = document.createElement('img');
    img.src = npcUrl(npc.id); img.alt = npc.name; img.loading = 'lazy'; img.decoding = 'async';
    img.addEventListener('error', () => wrap.remove());
    const copy = document.createElement('span');
    copy.innerHTML = `<b>${esc(npc.name)}</b><small>${esc(note)}</small>`;
    wrap.append(img,copy);
    return wrap;
  }

  function resolveNpc(byName, quest) {
    const name = String(quest?.npc_name || '').trim();
    if (!name) return null;
    return byName.get(norm(name)) || null;
  }

  async function enhanceQuestTracker() {
    const rows = [...document.querySelectorAll('#quest-list .quest-row')];
    if (!rows.length) return;
    const [{byName},questIndex] = await Promise.all([lookups(),quests()]);
    rows.forEach(row => {
      if (row.querySelector('.visual-npc-card')) return;
      const title = row.querySelector('.quest-name')?.textContent?.trim();
      const quest = questIndex.get(norm(title)); if (!quest) return;
      const npc = resolveNpc(byName,quest); if (!npc) return;
      const card = npcCard(npc,'COT2 quest giver');
      const name = row.querySelector('.quest-name');
      name?.parentElement?.insertBefore(card,name);
      row.classList.add('visualized-npc-quest');
    });
  }

  async function enhanceDashboardQueue() {
    const root = document.getElementById('atlas-quest-queue');
    if (!root) return;
    const cards = [...root.children].filter(x => !x.classList.contains('queue-empty'));
    if (!cards.length) return;
    const [{byName},questIndex] = await Promise.all([lookups(),quests()]);
    cards.forEach(card => {
      if (card.querySelector('.visual-npc-mini')) return;
      const text = norm(card.textContent);
      let quest = null;
      for (const [name,row] of questIndex.entries()) {
        if (name.length >= 5 && text.includes(name)) { quest = row; break; }
      }
      if (!quest) return;
      const npc = resolveNpc(byName,quest); if (!npc) return;
      const holder = document.createElement('span'); holder.className = 'visual-npc-mini'; holder.title = `${npc.name} · COT2 quest giver`;
      const img = document.createElement('img'); img.src=npcUrl(npc.id); img.alt=npc.name; img.loading='lazy';
      img.addEventListener('error',()=>holder.remove()); holder.appendChild(img); card.prepend(holder);
    });
  }

  async function enhanceClassicDbQuests() {
    if (document.getElementById('db-dataset')?.value !== 'quests') return;
    const cards = [...document.querySelectorAll('#db-results .db-card')];
    if (!cards.length) return;
    const [{byName},questIndex] = await Promise.all([lookups(),quests()]);
    cards.forEach(card => {
      if (card.querySelector('.visual-db-npc')) return;
      const title = card.querySelector('h3')?.textContent?.trim();
      const quest = questIndex.get(norm(title)); if (!quest) return;
      const npc = resolveNpc(byName,quest); if (!npc) return;
      const cardNpc = npcCard(npc,'Current COT2 NPC'); cardNpc.classList.add('visual-db-npc');
      const relations = card.querySelector('.visual-db-relations');
      relations ? card.insertBefore(cardNpc,relations) : card.appendChild(cardNpc);
    });
  }

  async function enhance() {
    document.documentElement.classList.add('visual-npc-layer-ready');
    await Promise.allSettled([enhanceQuestTracker(),enhanceDashboardQueue(),enhanceClassicDbQuests()]);
  }

  function schedule(){ clearTimeout(timer); timer=setTimeout(enhance,110); }
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',schedule,true);
  document.addEventListener('change',schedule,true);
  document.addEventListener('input',schedule,true);
  enhance();
})();
