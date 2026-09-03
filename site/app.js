
(() => {
  const D = window.GUIDE_DATA;
  const KEY = 'ultimateILGuideState.v1';
  const defaultGear = {
    Hat:'None',Face:'None',Eye:'None',Earrings:'None',Pendant:'None',Medal:'None',
    Top:'None',Overall:'None',Bottom:'None',Cape:'None',Shield:'None',Gloves:'None',
    Weapon:'None',Shoes:'None',Ring1:'None',Ring2:'None',
    Pet:'None',Mount:'None'
  };
  const STATE_UPDATED_KEY = `${KEY}.updatedAt`;
  let state = loadState();
  let activeSlot = null;
  let launcherStateReady = false;
  let launcherSaveTimer = null;
  const UNDO_MS = 10000;
  const pendingQuestUndo = new Map();
  const pendingEtcUndo = new Map();
  const OSMS_RAW_BASE = '/game-origin/data/current/';
  let osmsItemIndexPromise = null;
  const osmsDataCache = new Map();
  const osmsRenderLimit = { classicdb: 80 };

  function osmsItemIndex(){
    if(osmsItemIndexPromise) return osmsItemIndexPromise;
    osmsItemIndexPromise = fetch(`${OSMS_RAW_BASE}items.json`,{cache:'force-cache'})
      .then(r=>{if(!r.ok) throw new Error(`OSMS items ${r.status}`); return r.json();})
      .then(j=>{
        const rows=[...(Array.isArray(j?.items)?j.items:[]),...(Array.isArray(j?.scrolls)?j.scrolls:[])];
        return new Map(rows.filter(x=>x?.name).map(x=>[String(x.name).trim().toLowerCase(),x]));
      })
      .catch(()=>new Map());
    return osmsItemIndexPromise;
  }
  async function hydrateEtcIcons(root){
    if(!root) return;
    const nodes=[...root.querySelectorAll('[data-etc-icon-name]')];
    if(!nodes.length) return;
    const idx=await osmsItemIndex();
    nodes.forEach(node=>{
      const item=idx.get(String(node.dataset.etcIconName||'').trim().toLowerCase());
      if(!item?.id) return;
      const id=String(item.id).padStart(8,'0');
      node.innerHTML=`<img src="${OSMS_RAW_BASE}images/items/${id}.png" alt="${esc(item.name)}">`;
    });
  }
  function pendingActive(map,id){ return Number(map.get(id)||0) > Date.now(); }
  function schedulePendingExpiry(map,id,render){
    const expires=Date.now()+UNDO_MS;
    map.set(id,expires);
    setTimeout(()=>{ if(Number(map.get(id)||0)===expires){ map.delete(id); render(); } },UNDO_MS+60);
  }

  function normalizeState(raw={}){
    const level=Math.max(1,Math.min(Number(D.meta?.maxLevel)||70,Number(raw.level)||1));
    const gear={...defaultGear,...(raw.gear||{})};
    Object.keys(gear).forEach(slot=>{
      const name=gear[slot];
      if(name && name!=='None' && !D.gear.some(g=>g.Item===name)) gear[slot]='None';
    });
    if(level<10 && gear.Weapon==="Beginner's Wooden Wand / job wand") gear.Weapon='None';
    return {
      level,
      page:['research','data','formulas'].includes(raw.page)?'dashboard':(raw.page||'dashboard'),
      activeBuildId:raw.activeBuildId||D.catalog?.activeBuildId||'magician-il-fresh',
      quests:raw.quests||{},
      skills:raw.skills||{},
      etcHeld:raw.etcHeld||{},
      etcDone:raw.etcDone||{},
      levelChecks:raw.levelChecks||{},
      skillTab:raw.skillTab||'auto',
      targetUpgrade:raw.targetUpgrade||'auto',
      gear
    };
  }
  function loadState(){
    try { return normalizeState(JSON.parse(localStorage.getItem(KEY)||'{}')); }
    catch(e){ return normalizeState({}); }
  }
  function hasMeaningfulProgress(s=state){
    return Number(s.level)>1 || Object.values(s.quests||{}).some(Boolean) || Object.values(s.skills||{}).some(Boolean) || Object.values(s.etcHeld||{}).some(v=>Number(v)>0) || Object.values(s.etcDone||{}).some(Boolean) || Object.values(s.gear||{}).some(v=>v&&v!=='None');
  }
  function scheduleLauncherStateSave(updatedAt=Date.now()){
    if(!launcherStateReady || !/^https?:$/.test(location.protocol)) return;
    clearTimeout(launcherSaveTimer);
    launcherSaveTimer=setTimeout(()=>{
      fetch('/__builder_state',{
        method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({schema:1,project:'Top Classic World Maplestory',updatedAt,state})
      }).catch(()=>{});
    },120);
  }
  function save(){
    const updatedAt=Date.now();
    localStorage.setItem(KEY,JSON.stringify(state));
    localStorage.setItem(STATE_UPDATED_KEY,String(updatedAt));
    scheduleLauncherStateSave(updatedAt);
  }
  async function hydrateLauncherState(){
    if(!/^https?:$/.test(location.protocol)) return;
    try{
      const response=await fetch('/__builder_state',{cache:'no-store'});
      if(!response.ok) return;
      launcherStateReady=true;
      const disk=await response.json();
      const localUpdated=Number(localStorage.getItem(STATE_UPDATED_KEY)||0);
      const diskUpdated=Number(disk?.updatedAt||0);
      const localMeaningful=hasMeaningfulProgress(state);
      if(disk?.state && (!localMeaningful || (localUpdated>0 && diskUpdated>localUpdated))){
        state=normalizeState(disk.state);
        localStorage.setItem(KEY,JSON.stringify(state));
        localStorage.setItem(STATE_UPDATED_KEY,String(diskUpdated||Date.now()));
        renderAll();
        toast('Progress restored from this PC');
      }else if(localMeaningful){
        scheduleLauncherStateSave(localUpdated||Date.now());
      }
      renderData();
    }catch(e){ /* localStorage remains the fallback when not launched by launcher.py */ }
  }
  function esc(s){ return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
  function isBeta(s){ return /BETA|COT2|PRE-LAUNCH|VERIFY/i.test(String(s||'')); }
  function isHighlyRecommended(item){ return !!(item && item['Highly Recommended']); }
  function recommendationBadge(item, cls=''){ return isHighlyRecommended(item) ? `<span class="highly-recommended-badge ${cls}">HIGHLY RECOMMENDED</span>` : ''; }
  function priorityClass(p){ return String(p||'').startsWith('Low')?'Low':String(p||''); }
  function slug(s){ return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }
  function questId(q,i){ return `${slug(q.Region)}-${slug(q.Quest)}-${q.Lv??'x'}`; }
  function etcId(e){ return slug(e.Item); }
  function skillId(s){ return `lv${s.Level}-${slug(s.Spend)}`; }

  // Visual assets and game-data evidence are intentionally separate concerns.
  // Legacy GMS/v83 sprites are acceptable as artwork when the item/monster itself has
  // been confirmed against MapleStory Classic data. They are never used as proof of stats,
  // availability, quests, drops, recipes, or mechanics.
  function meowIcon(id){ return id ? `/game-art/meow/icons/${Math.trunc(Number(id))}` : ''; }
  function dreamItemIcon(id, resize=2){ return id ? `/game-art/dream/item/${Math.trunc(Number(id))}/icon?format=png&resize=${resize}` : ''; }
  function mapleIoItemIcon(id){ return id ? `/game-art/mapleio/item/${Math.trunc(Number(id))}/icon` : ''; }
  function dreamPetIcon(id, resize=2){ return id ? `/game-art/dream/pet/${Math.trunc(Number(id))}/move/0?format=png&resize=${resize}` : ''; }
  function visualCandidates(item){
    if(!item || !item['Item ID'] || Number(item['Item ID'])===0) return [];
    const id=item['Item ID'];
    const dream=item.Slot==='Pet'?dreamPetIcon(id):dreamItemIcon(id);
    const listed=String(item['Icon URL']||'').trim();
    return [...new Set([dream,item.Slot==='Pet'?'':mapleIoItemIcon(id),listed,meowIcon(id)].filter(Boolean))];
  }
  function imgTag(item, cls=''){
    const urls=visualCandidates(item);
    if(!urls.length) return '';
    const [primary,...fallbacks]=urls;
    return `<img class="${cls}" src="${esc(primary)}" data-asset-fallbacks="${esc(fallbacks.join('|'))}" data-visual-source="legacy-sprite-classic-verified-entity" alt="${esc(item.Item)}">`;
  }
  function hookImageFallback(root=document){
    root.querySelectorAll('img').forEach(img=>{
      if(img.dataset.assetHooked) return;
      img.dataset.assetHooked='1';
      img.onerror=()=>{
        const rest=String(img.dataset.assetFallbacks||'').split('|').filter(Boolean);
        if(rest.length){
          const next=rest.shift();
          img.dataset.assetFallbacks=rest.join('|');
          img.src=next;
          return;
        }
        img.classList.add('asset-missing');
        img.parentElement?.classList.add('asset-failed');
        img.removeAttribute('src');
        img.alt=img.alt||'Asset unavailable';
      };
    });
  }

  function skillNameFromSpend(spend){
    const names=Object.keys(D.skillIcons).sort((a,b)=>b.length-a.length);
    return names.find(n=>String(spend||'').includes(n)) || '';
  }
  function mapleIoSkillIcon(skill){
    const id=Number(skill?.id||0); if(!id) return '';
    const book=Math.trunc(id/10000);
    return `/game-art/mapleio/skill/${book}.img/skill/${id}/icon`;
  }
  function skillVisualCandidates(skill){
    if(!skill) return [];
    return [...new Set([String(skill.url||'').trim(),mapleIoSkillIcon(skill)].filter(Boolean))];
  }
  function skillImgTag(name, cls='skill-icon'){
    const skill=D.skillIcons[name], urls=skillVisualCandidates(skill);
    if(!urls.length) return '';
    const [primary,...fallbacks]=urls;
    return `<img class="${cls}" src="${esc(primary)}" data-asset-fallbacks="${esc(fallbacks.join('|'))}" data-visual-source="verified-skill-id-legacy-sprite-fallback" alt="${esc(name)}">`;
  }
  function skillIcon(spend){
    const n=skillNameFromSpend(spend);
    return n ? skillImgTag(n) : '';
  }

  function activeBuild(){
    return D.catalog?.builds?.find(b=>b.id===state.activeBuildId)||D.catalog?.builds?.find(b=>b.status==='active')||null;
  }
  function classForBuild(build=activeBuild()){
    return D.catalog?.classes?.find(c=>c.id===build?.classId)||null;
  }

  function rangeContains(range,level){
    if(!range) return false;
    const nums=String(range).match(/\d+/g)?.map(Number)||[];
    if(nums.length===1) return level===nums[0];
    if(nums.length>=2) return level>=nums[0] && level<=nums[1];
    return false;
  }
  function currentLevelRow(){ return D.leveling.find(x=>Number(x.Lv)===state.level); }
  function currentSkillRow(){ const rows=D.skills.filter(x=>Number(x.Level)===state.level); return state.level>=30?(rows.at(-1)||rows[0]):rows[0]; }
  function currentAP(){ return D.apPlan.find(x=>rangeContains(x['Level Range'],state.level)); }
  function baseLukTarget(){ const a=currentAP(); return Number(a?.['Base LUK Target'] ?? (state.level>50?30:5)); }
  function currentRoute(){ return D.routes.find(r=>rangeContains(r.Levels,state.level)); }
  function recommendedWeaponName(level=state.level){
    if(level<10) return 'Beginner weapon / Maple Island';
    if(level<15) return "Beginner's Wooden Wand / job wand";
    if(level<30) return 'Hardwood Wand';
    if(level<50) return 'Mithril Wand';
    if(level<70) return 'Cromi';
    return 'Angel Wings';
  }

  function getGear(name){ return D.gear.find(g=>g.Item===name); }
  function gearItemsForSlot(slot){
    const map={Ring1:'Ring',Ring2:'Ring'};
    const s=map[slot]||slot;
    // Old-school artwork is fine; old-school-only DATA is not. A row stays out of the
    // actionable picker until the entity is confirmed in Classic/COT2.
    return D.gear.filter(g=>g.Item==='None'||(g.Slot===s && !['HISTORICAL ONLY','UNVERIFIED'].includes(String(g['Evidence Class']||''))));
  }
  function evidenceLabel(){ return ''; }

  function computeBuild(){
    let chosen=[];
    for(const [slot,name] of Object.entries(state.gear)){
      if(!name||name==='None') continue;
      if(state.gear.Overall!=='None' && (slot==='Top'||slot==='Bottom')) continue;
      const item=getGear(name); if(item) chosen.push(item);
    }
    const sum=k=>chosen.reduce((a,x)=>a+Number(x[k]||0),0);
    const weapon=getGear(state.gear.Weapon);
    const totalLuk=sum('LUK');
    const base=baseLukTarget();
    const effective=base+totalLuk;
    const req=Number(weapon?.['Req LUK']||0);
    return {
      chosen,int:sum('INT'),luk:totalLuk,matk:sum('M.ATK'),
      crit:sum('Crit%'),critDmg:sum('Crit DMG'),speed:sum('Speed'),
      baseLuk:base,effectiveLuk:effective,reqLuk:req,ready:effective>=req,weapon
    };
  }

  function preserveLoadedImages(root,render){
    const pool=new Map();
    if(root) root.querySelectorAll('img[src]').forEach(img=>{
      const key=[img.getAttribute('src')||'',img.alt||'',img.className||''].join('¦');
      if(!pool.has(key))pool.set(key,[]);
      pool.get(key).push(img);
    });
    render();
    if(!root)return;
    root.querySelectorAll('img[src]').forEach(img=>{
      const key=[img.getAttribute('src')||'',img.alt||'',img.className||''].join('¦');
      const old=pool.get(key)?.shift();
      if(old&&old!==img&&old.complete&&old.naturalWidth>0)img.replaceWith(old);
    });
  }
  function renderLevelPage(){
    const p=state.page;
    const root=document.querySelector('.page[data-page="'+p+'"]');
    preserveLoadedImages(root,()=>{
      if(p==='dashboard')renderDashboard();
      else if(p==='builds')renderBuildLibrary();
      else if(p==='leveling')renderRoutes();
      else if(p==='quests')renderQuests();
      else if(p==='equipment'){renderWeapons();renderEquipment('equipment-window-page','build-summary-page');}
      else if(p==='skills')renderSkills();
      else if(p==='etc')renderEtc();
      else if(p==='formulas')renderFormulas();
    });
  }
  function setLevel(level){
    const next=Math.max(1,Math.min(Number(D.meta.maxLevel)||70,Number(level)||1));
    if(next===state.level)return;
    state.level=next;
    save();
    const a=document.getElementById('level-select'),b=document.getElementById('hero-level-select'),r=document.getElementById('level-range');
    if(a)a.value=String(next);if(b)b.value=String(next);if(r)r.value=String(next);
    document.documentElement.dataset.levelUpdate='1';
    renderLevelPage();
    requestAnimationFrame(()=>document.documentElement.removeAttribute('data-level-update'));
  }
  function fillLevelSelect(sel){
    if(!sel)return;
    sel.innerHTML='';
    for(let i=1;i<=Number(D.meta.maxLevel);i++){
      const o=document.createElement('option');o.value=String(i);o.textContent=`Lv ${i}`;sel.appendChild(o);
    }
    sel.value=String(state.level);
    sel.addEventListener('change',()=>setLevel(sel.value));
  }
  function initLevelSelect(){
    fillLevelSelect(document.getElementById('level-select'));
    fillLevelSelect(document.getElementById('hero-level-select'));
    const range=document.getElementById('level-range');
    if(range) range.addEventListener('input',()=>setLevel(range.value));
    document.getElementById('level-prev')?.addEventListener('click',()=>setLevel(state.level-1));
    document.getElementById('level-next')?.addEventListener('click',()=>setLevel(state.level+1));
  }

  const pageMeta={
    dashboard:['Top Classic World Maplestory','Your personalized Ice / Lightning build workspace.'],
    builds:['Build Library','Multi-class infrastructure with your I/L build active and personalized right now.'],
    leveling:['Leveling Route','One clean route, with exact per-level instructions when you need them.'],
    quests:['Quest Tracker','Prioritized for an Ice / Lightning Mage and saved forever in your browser.'],
    equipment:['Equipment & Crafting','Breakpoint-driven upgrades and a real slot-based build builder.'],
    skills:['Skill Tree','One definitive SP path built around efficient I/L progression.'],
    etc:['ETC Master Planner','Know the full future requirement before you vendor the first drop.'],
    classicdb:['Classic Database','Broad current COT2 client-export metadata, kept separate from curated guide decisions.'],
    cashshop:['Cash Shop','COT2 client catalog with beta pricing and availability warnings.'],
    beauty:['Beauty','Hair and face catalogs with exact exported IDs and artwork.'],
    formulas:['Formula Lab','Client-audited magical damage math for I/L planning.'],
    research:['Research & Sources','What is official, what is beta, and why each major decision exists.'],
    data:['Agent / Data','The canonical database stays attached; your personal progress stays yours.']
  };
  function setPage(p,persist=true){
    if(!pageMeta[p]) p='dashboard';
    state.page=p;if(persist)save();
    document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.dataset.page===p));
    document.querySelectorAll('.nav-btn').forEach(x=>x.classList.toggle('active',x.dataset.page===p));
    document.getElementById('page-title').textContent=pageMeta[p][0];
    document.getElementById('page-subtitle').textContent=pageMeta[p][1];
    const back=document.getElementById('page-back'); if(back) back.hidden=p==='dashboard';
    if(p==='dashboard') renderDashboard();
    if(p==='leveling') renderRoutes();
    if(p==='quests') renderQuests();
    if(p==='skills') renderSkills();
    if(p==='etc') renderEtc();
    if(p==='equipment'){renderWeapons();renderEquipment('equipment-window-page','build-summary-page');}
    if(p==='builds') renderBuildLibrary();
    if(p==='classicdb') renderClassicDb();
    if(p==='cashshop') renderCashShop();
    if(p==='beauty') renderBeauty();
    if(p==='formulas') renderFormulas();
    if(p!=='dashboard') window.scrollTo({top:0,behavior:'instant'});
  }
  document.querySelectorAll('[data-page]').forEach(()=>{});
  document.getElementById('nav').addEventListener('click',e=>{
    const b=e.target.closest('[data-page]'); if(b) setPage(b.dataset.page);
  });
  document.body.addEventListener('click',e=>{
    const b=e.target.closest('[data-goto]');if(b)setPage(b.dataset.goto);
  });
  document.getElementById('page-back')?.addEventListener('click',()=>setPage('dashboard'));
  document.addEventListener('keydown',e=>{
    if(e.key!=='Escape') return;
    const modal=document.getElementById('gear-modal');
    if(modal?.classList.contains('open')){ closeModal(); return; }
    if(state.page!=='dashboard') setPage('dashboard');
  });

  function metric(label,value,sub,beta=false,glow='rgba(115,217,255,.07)'){
    return `<div class="metric ${beta?'beta':''}" style="--glow:${glow}"><div class="metric-label">${esc(label)}</div><div class="metric-value">${esc(value||'—')}</div><div class="metric-sub">${esc(sub||'')}</div></div>`;
  }
  function nextMilestone(){
    const milestones=D.dashboardMilestones||[];
    return milestones.find(m=>Number(m.level)>state.level)||milestones[milestones.length-1]||{level:70,label:'Lv70',detail:''};
  }
  function previousMilestone(){
    const milestones=D.dashboardMilestones||[];
    return [...milestones].reverse().find(m=>Number(m.level)<=state.level)||{level:1,label:'Start',detail:''};
  }
  function nextCoreGear(){
    return D.gear
      .filter(g=>g.Item!=='None' && g.Plan==='CORE' && !['Pet','Mount'].includes(g.Slot) && Number(g['Req Lv']||0)>state.level)
      .sort((a,b)=>Number(a['Req Lv'])-Number(b['Req Lv']) || (a.Slot==='Weapon'?-1:1))[0] || null;
  }
  function currentCoreWeapon(level=state.level){
    const names=["Beginner's Wooden Wand / job wand",'Hardwood Wand','Mithril Wand','Cromi','Angel Wings'];
    return names.map(getGear).filter(Boolean).filter(x=>Number(x['Req Lv'])<=level).sort((a,b)=>Number(b['Req Lv'])-Number(a['Req Lv']))[0]||null;
  }
  function levelCheckId(kind){return `lv${state.level}-${kind}`;}
  function actionCard(icon,label,value,sub,beta=false){
    return `<article class="now-action ${beta?'beta':''}"><div class="now-icon">${icon}</div><div><span>${esc(label)}</span><b>${esc(value||'—')}</b><small>${esc(sub||'')}</small></div></article>`;
  }

  const atlasSkillInfo={
    'Energy Bolt':{abbr:'EB',max:20,role:'Starter projectile',desc:'Prerequisite-only in this guide. Cheaper clean casts, but the projectile can lose efficiency to platforms and terrain.'},
    'Magic Claw':{abbr:'MC',max:20,role:'1st-job main attack',desc:'The definitive early attack for this route: reliable direct-hit behavior through the platform-heavy maps we actually use.'},
    'Magic Guard':{abbr:'MG',max:15,role:'Core survival',desc:'Moves incoming HP pressure onto your much larger MP pool. A core safety skill for a low-HP Magician.'},
    'Improved MP Recovery':{abbr:'MPR',max:15,role:'MP economy',desc:'Prerequisite and sustain support. This build takes the minimum needed before Max MP Increase.'},
    'Max MP Increase':{abbr:'MaxMP',max:15,role:'Permanent MP pool',desc:'Flat percentage Max MP in Classic World; the guide maxes it after the main attack and Magic Guard.'},
    'Magic Armor':{abbr:'Armor',max:20,role:'Leftover defense',desc:'Uses the remaining first-job SP for straightforward defense without relying on rare gear.'},
    'Teleport':{abbr:'TP',max:20,role:'Mobility',desc:'One point immediately at second job, then finished late after damage and economy skills are established.'},
    'Cold Beam':{abbr:'CB',max:30,role:'Economy single-target',desc:'First second-job max in the efficient I/L route. Strong single-target efficiency and excellent elemental matchups.'},
    'Thunder Bolt':{abbr:'TB',max:30,role:'AoE / lightning',desc:'Maxed after Cold Beam. Becomes increasingly valuable on dense maps and lightning-weak targets such as Lorang.'},
    'MP Eater':{abbr:'MP Eater',max:20,role:'Potion economy',desc:'Reduces long-session MP spending after both attack skills are established.'},
    'Meditation':{abbr:'Med',max:20,role:'Magic Attack buff',desc:'Damage buff maxed after attacks and MP sustain, when its value applies across the established grind route.'},
    'Slow':{abbr:'Slow',max:20,role:'Utility',desc:'Receives the single leftover point in the current economy-first second-job plan.'}
  };
  function skillRows(kind){
    if(kind==='magician') return D.skills.filter(x=>/\bEB\s+\d/.test(String(x['Result After Level']||'')));
    if(kind==='il') return D.skills.filter(x=>/\bTP\s+\d/.test(String(x['Result After Level']||'')));
    return [];
  }
  function latestSkillResult(kind, level=state.level){
    const rows=skillRows(kind).filter(x=>Number(x.Level)<=level).sort((a,b)=>Number(a.Level)-Number(b.Level));
    return rows.at(-1)||null;
  }
  function parseSkillAllocation(result){
    const out={};
    String(result||'').split('|').map(x=>x.trim()).forEach(part=>{
      const m=part.match(/^(EB|MC|MG|MPR|MaxMP|Armor|TP|CB|TB|MP Eater|Med|Slow)\s+(\d+)/);
      if(m) out[m[1]]=Number(m[2]);
    });
    return out;
  }
  function atlasDefaultSkillTab(){ return state.level<10?'beginner':state.level<30?'magician':'il'; }
  function activeAtlasSkillTab(){ return state.skillTab==='auto'?atlasDefaultSkillTab():state.skillTab; }

  const atlasMobMap={
    'Green Mushroom':{id:1110100,name:'Green Mushroom',weak:'—'},
    'Horny Mushroom':{id:2110200,name:'Horny Mushroom',weak:'—'},
    'Zombie Mushroom':{id:2230101,name:'Zombie Mushroom',weak:'—'},
    'Jr. Wraith':{id:3230101,name:'Jr. Wraith',weak:'Fire / Holy'},
    'Wraith':{id:4230102,name:'Wraith',weak:'Holy'},
    'Lorang':{id:3230102,name:'Lorang',weak:'Lightning'}
  };
  function mobAsset(id){ return id?`https://api.dreamms.gg/api/GMS/latest/mob/${id}/render/stand?format=png&resize=2`:''; }
  function mapleIoMobAsset(id){ return id?`https://maplestory.io/api/GMS/83/mob/${id}/render/stand`:''; }
  const BASE_CHARACTER_IDS=['47077','21078']; // visual-only hair/face basis; never used as Classic game-data evidence
  function characterItemIds(){
    const visible=['Hat','Face','Eye','Earrings','Pendant','Cape','Shield','Gloves','Weapon','Shoes'];
    const bodySlots=state.gear.Overall!=='None' ? ['Overall'] : ['Top','Bottom'];
    const ids=[...BASE_CHARACTER_IDS];
    [...visible,...bodySlots].forEach(slot=>{
      const it=getGear(state.gear[slot]);
      if(it&&Number(it['Item ID'])>0 && !['HISTORICAL ONLY','UNVERIFIED'].includes(String(it['Evidence Class']||''))) ids.push(String(Math.trunc(Number(it['Item ID']))));
    });
    return ids;
  }
  function characterRenderUrl(){
    const ids=characterItemIds();
    return `https://api.dreamms.gg/api/GMS/latest/character/2000/${ids.join(',')}/stand1/0?resize=2&format=png`;
  }
  function mapleIoCharacterRenderUrl(ids=characterItemIds()){
    return `https://maplestory.io/api/GMS/83/Character/2000/${ids.join(',')}/stand1/0?resize=2`;
  }
  function baseCharacterRenderUrl(){
    return `https://api.dreamms.gg/api/GMS/latest/character/2000/${BASE_CHARACTER_IDS.join(',')}/stand1/0?resize=2&format=png`;
  }
  function baseMapleIoCharacterRenderUrl(){
    return mapleIoCharacterRenderUrl(BASE_CHARACTER_IDS);
  }
  function renderAtlasAvatar(){
    const root=document.getElementById('atlas-avatar'); if(!root)return;
    const equipped=['Hat','Overall','Weapon','Shield','Cape','Gloves','Shoes'].map(s=>getGear(state.gear[s])).filter(Boolean).filter(x=>x.Item!=='None').slice(0,5);
    root.innerHTML=`<div class="avatar-aura"></div><img class="avatar-character" src="${esc(characterRenderUrl())}" alt="Equipped I/L character"><div class="classic-avatar-placeholder avatar-render-fallback" hidden><span class="pixel-head">✦</span><b>LOADOUT PREVIEW</b><small>Renderer unavailable — gear icons shown below</small></div><div class="avatar-equipped-icons">${equipped.map(x=>`<span title="${esc(x.Item)}">${imgTag(x)}</span>`).join('')}</div><div class="avatar-job-badge">I/L</div>`;
    const img=root.querySelector('.avatar-character'), fallback=root.querySelector('.avatar-render-fallback');
    if(img){
      img.dataset.assetHooked='1';
      const fallbacks=[mapleIoCharacterRenderUrl(),baseCharacterRenderUrl(),baseMapleIoCharacterRenderUrl()];
      img.onerror=()=>{
        const next=fallbacks.shift();
        if(next){ img.src=next; return; }
        img.hidden=true; if(fallback) fallback.hidden=false;
      };
    }
    hookImageFallback(root);
  }
  function renderAtlasSkills(){
    const tabs=document.getElementById('atlas-skill-tabs'), grid=document.getElementById('atlas-skill-grid'), detail=document.getElementById('atlas-skill-detail');
    if(!tabs||!grid||!detail)return;
    const tab=activeAtlasSkillTab();
    tabs.innerHTML=[['beginner','Beginner'],['magician','Magician'],['il','Wizard (I/L)']].map(([id,label])=>`<button class="atlas-skill-tab ${tab===id?'active':''}" data-skill-tab="${id}">${label}${id==='il'&&state.level<30?'<small>Lv30</small>':''}</button>`).join('');
    tabs.querySelectorAll('[data-skill-tab]').forEach(b=>b.addEventListener('click',()=>{state.skillTab=b.dataset.skillTab;save();renderAtlasSkills()}));
    if(tab==='beginner'){
      grid.innerHTML=`<div class="beginner-milestone-grid"><div><span>AP</span><b>INT first</b><small>No STR/DEX investment. Preserve LUK only for the verified equipment route.</small></div><div><span>GEAR</span><b>Do not shop yet</b><small>Maple Island gear is not a meaningful spending checkpoint for this build.</small></div><div><span>QUESTS</span><b>Clear the island</b><small>Finish nearby quests while moving; protect useful ETCs surfaced in the queue.</small></div><div><span>LV10</span><b>Magician + free wand</b><small>Your first real build milestone. The job wand is a deliberate meso hold.</small></div></div>`;
      detail.innerHTML=`<span class="detail-kicker">NEXT MILESTONE</span><b>Lv10 · Path of the Magician</b><p>Advance, equip the free job wand, then put the prerequisite point into Energy Bolt before building Magic Claw. No filler purchase is required before that.</p><small class="evidence-inline">Plan status: current pre-launch route · recheck at launch</small>`;
      return;
    }
    const kind=tab==='magician'?'magician':'il';
    const result=latestSkillResult(kind, state.level) || skillRows(kind)[0];
    const alloc=parseSkillAllocation(result?.['Result After Level']);
    const names=kind==='magician'?['Energy Bolt','Magic Claw','Magic Guard','Improved MP Recovery','Max MP Increase','Magic Armor']:['Thunder Bolt','Teleport','MP Eater','Meditation','Slow','Cold Beam'];
    grid.innerHTML=names.map(name=>{
      const info=atlasSkillInfo[name], lv=alloc[info.abbr]||0;
      return `<button class="atlas-skill-card ${lv>0?'learned':''}" data-skill-name="${esc(name)}"><span class="skill-img-wrap">${skillImgTag(name,'skill-icon')}</span><b>${esc(name)}</b><small>Lv. ${lv}/${info.max}</small></button>`;
    }).join('');
    const next=(kind==='magician'?skillRows('magician'):skillRows('il')).find(x=>Number(x.Level)>=state.level && Number(x.Level)<=Math.max(state.level,kind==='magician'?30:70));
    const defaultName=skillNameFromSpend(next?.Spend)||names.find(n=>(alloc[atlasSkillInfo[n].abbr]||0)>0)||names[0];
    function show(name){
      const info=atlasSkillInfo[name], lv=alloc[info.abbr]||0;
      detail.innerHTML=`<span class="skill-img-wrap">${skillImgTag(name,'skill-icon')}</span><div><span class="detail-kicker">${esc(info.role)}</span><b>${esc(name)} · Lv ${lv}/${info.max}</b><p>${esc(info.desc)}</p>${next?`<small>Current/next SP instruction: <strong>${esc(next.Spend)}</strong></small>`:''}</div>`;
      hookImageFallback(detail);
    }
    grid.querySelectorAll('[data-skill-name]').forEach(b=>b.addEventListener('click',()=>{grid.querySelectorAll('.atlas-skill-card').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');show(b.dataset.skillName)}));
    show(defaultName);
    hookImageFallback(grid);
  }
  function currentTargetAnalysis(){
    if(state.targetUpgrade && state.targetUpgrade!=='auto') return D.upgrades.find(x=>String(x.Lv)===String(state.targetUpgrade))||null;
    return D.upgrades.filter(x=>Number(x.Lv)<=state.level).sort((a,b)=>Number(b.Lv)-Number(a.Lv))[0]||null;
  }
  function mobKeyFromText(text){
    const t=String(text||'');
    return Object.keys(atlasMobMap).find(k=>t.includes(k))||null;
  }
  function renderAtlasTarget(){
    const select=document.getElementById('atlas-mob-select'), card=document.getElementById('atlas-mob-card'), dmg=document.getElementById('atlas-damage');
    if(!select||!card||!dmg)return;
    const route=currentLevelRow()||{};
    const options=['<option value="auto">Auto · current breakpoint</option>'].concat(D.upgrades.map(x=>`<option value="${x.Lv}">Lv${x.Lv} · ${esc(x['Representative Next Mob'])}</option>`));
    select.innerHTML=options.join(''); select.value=state.targetUpgrade||'auto';
    select.onchange=()=>{state.targetUpgrade=select.value;save();renderAtlasTarget()};
    const a=currentTargetAnalysis();
    let targetText=a?.['Representative Next Mob']||String(route['Main Monsters']||'Current route target').split('/')[0].trim();
    let key=mobKeyFromText(targetText)||mobKeyFromText(route['Main Monsters']);
    const mob=key?atlasMobMap[key]:null;
    const hp=a?.HP??'Route-specific', mdef=a?.['M.DEF']??'Route-specific';
    card.innerHTML=`<div class="mob-art">${mob?`<img src="${esc(mobAsset(mob.id))}" data-asset-fallbacks="${esc(mapleIoMobAsset(mob.id))}" alt="${esc(mob.name)}" data-visual-source="legacy-sprite-classic-verified-entity">`:'<div class="mob-placeholder"><span>◈</span><small>Visual unavailable</small></div>'}</div><div class="mob-copy"><span class="detail-kicker">${a?`REFERENCE LV${a.Lv}`:'CURRENT ROUTE'}</span><h4>${esc(mob?.name||targetText)}</h4><p>${esc(route['Primary Route']||'Current training route')}</p><div class="mob-stat-grid"><div><small>HP</small><b>${esc(hp)}</b></div><div><small>M.DEF</small><b>${esc(mdef)}</b></div><div><small>Weakness</small><b>${esc(mob?.weak||'Verify')}</b></div><div><small>Guide status</small><b>${esc(a?.Status||route.Confidence||'Route')}</b></div></div></div>`;
    hookImageFallback(card);
    if(!a){dmg.innerHTML=`<div class="damage-empty"><b>No calibrated breakpoint row for this level yet.</b><p>The guide refuses to invent damage. Use the current route and equipment plan until a tested target row exists.</p></div>`;return;}
    const cur=String(a['Current Final Dmg / Cast']||'—'), cand=String(a['Candidate Final Dmg / Cast']||'—');
    dmg.innerHTML=`<div class="damage-choice"><span>${esc(a['Current Weapon'])}</span><i>vs</i><span>${esc(a.Candidate)}</span></div><div class="damage-ranges"><div><small>Current / cast</small><b>${esc(cur)}</b><span>Worst casts: ${esc(a['Worst Casts Current'])}</span></div><div class="candidate"><small>Candidate / cast</small><b>${esc(cand)}</b><span>Worst casts: ${esc(a['Worst Casts Candidate'])}</span></div></div><div class="damage-decision ${/SKIP/.test(String(a['Default Action']))?'skip':'buy'}"><span>${esc(a['Default Action'])}</span><p>${esc(a.Why)}</p></div><button class="mini-btn" data-goto="equipment">Open equipment</button>`;
  }
  function renderAtlasQueues(){
    const qr=document.getElementById('atlas-quest-queue'), er=document.getElementById('atlas-etc-queue');
    if(qr){
      const rank={'High':0,'Medium':1,'Low / Optional':2};
      const list=D.quests.map((q,i)=>({...q,_id:questId(q,i)}))
        .filter(q=>(!state.quests[q._id]||pendingActive(pendingQuestUndo,q._id))&&questRelevant(q)&&(q.Lv===''||q.Lv==null||Number(q.Lv)<=state.level))
        .sort((a,b)=>(rank[a.Priority]??9)-(rank[b.Priority]??9)||Number(a.Lv||0)-Number(b.Lv||0)).slice(0,8);
      qr.innerHTML=list.length?list.map(q=>{
        const pending=state.quests[q._id]&&pendingActive(pendingQuestUndo,q._id);
        return pending
          ? `<div class="atlas-queue-row pending-undo"><span class="queue-check done">✓</span><span><b>${esc(q.Quest)}</b><small>Completed · undo available</small></span><button class="undo-btn" data-undo-quest="${esc(q._id)}">Undo</button></div>`
          : `<label class="atlas-queue-row"><input type="checkbox" data-atlas-quest="${esc(q._id)}"><span><b>${esc(q.Quest)}</b><small>${esc(q.Priority)} · ${esc(q.Region)}</small></span></label>`;
      }).join(''):'<div class="queue-empty">No available I/L-relevant quests.</div>';
      qr.querySelectorAll('[data-atlas-quest]').forEach(c=>c.addEventListener('change',()=>{
        if(!c.checked) return;
        state.quests[c.dataset.atlasQuest]=true;save();
        schedulePendingExpiry(pendingQuestUndo,c.dataset.atlasQuest,()=>{renderDashboard();renderQuests();});
        renderDashboard();renderQuests();
      }));
      qr.querySelectorAll('[data-undo-quest]').forEach(b=>b.addEventListener('click',()=>{
        pendingQuestUndo.delete(b.dataset.undoQuest);state.quests[b.dataset.undoQuest]=false;save();renderDashboard();renderQuests();toast('Quest completion undone');
      }));
    }
    if(er){
      const list=D.etc.filter(x=>Number(x['Start Lv']||999)<=state.level+5 && (!state.etcDone[etcId(x)]||pendingActive(pendingEtcUndo,etcId(x))))
        .sort((a,b)=>Number(a['Start Lv']||99)-Number(b['Start Lv']||99)).slice(0,12);
      er.innerHTML=list.length?list.map(x=>{
        const id=etcId(x),base=Number(x['Core + Craft Minimum']||0),allIn=Number(x['All-In Total']||0);
        const need=Math.ceil((base||allIn||0)*1.15);
        const held=Number(state.etcHeld[id]||0),pending=state.etcDone[id]&&pendingActive(pendingEtcUndo,id);
        if(pending) return `<div class="v72-etc-chip pending-undo" title="${esc(x.Item)}"><span class="etc-icon-shell" data-etc-icon-name="${esc(x.Item)}">◌</span><b>✓</b><button class="undo-btn" data-undo-etc="${esc(id)}">Undo</button></div>`;
        return `<label class="v72-etc-chip" title="${esc(x.Item)} · safe target ${need||'optional'}"><span class="etc-icon-shell" data-etc-icon-name="${esc(x.Item)}">◌</span><b>${need?`×${need}`:'OPT'}</b><input class="check" type="checkbox" data-atlas-etc-done="${esc(id)}"></label>`;
      }).join(''):'<div class="queue-empty">No urgent ETC pressure.</div>';
      er.querySelectorAll('[data-atlas-etc-done]').forEach(c=>c.addEventListener('change',()=>{
        if(!c.checked) return;
        state.etcDone[c.dataset.atlasEtcDone]=true;save();
        schedulePendingExpiry(pendingEtcUndo,c.dataset.atlasEtcDone,()=>{renderDashboard();renderEtc();});
        renderDashboard();renderEtc();
      }));
      er.querySelectorAll('[data-undo-etc]').forEach(b=>b.addEventListener('click',()=>{
        pendingEtcUndo.delete(b.dataset.undoEtc);state.etcDone[b.dataset.undoEtc]=false;save();renderDashboard();renderEtc();toast('ETC completion undone');
      }));
      hydrateEtcIcons(er);
    }
  }
  function renderAtlasBuffs(){
    const root=document.getElementById('atlas-buffs');if(!root)return;
    const m=parseSkillAllocation(latestSkillResult('magician',state.level)?.['Result After Level']);
    const il=parseSkillAllocation(latestSkillResult('il',state.level)?.['Result After Level']);
    const items=[
      ['Magic Guard',m.MG||0,(m.MG||0)>0?'ACTIVE TOOL':'Not learned yet','Survival'],
      ['Meditation',il.Med||0,(il.Med||0)>0?'BUILDING':'Later second job','Damage'],
      ['MP Eater',il['MP Eater']||0,(il['MP Eater']||0)>0?'BUILDING':'Later second job','Potion economy']
    ];
    root.innerHTML=items.map(([name,lv,status,tag])=>`<div class="buff-chip"><span class="skill-img-wrap">${skillImgTag(name,'skill-icon')}</span><div><b>${esc(name)} <span>Lv${lv}</span></b><small>${esc(tag)} · ${esc(status)}</small></div></div>`).join('')+`<div class="economy-note"><b>Builder rule</b><span>Do not buy a gear tier unless it changes a breakpoint, solves a requirement, or is a meaningful long hold.</span></div>`;
    hookImageFallback(root);
  }
  function renderDashboard(){
    const l=currentLevelRow()||{}, srow=currentSkillRow()||{}, a=currentAP()||{};
    const build=computeBuild();
    const profile=activeBuild();
    document.getElementById('hero-level').textContent=state.level;
    document.getElementById('atlas-job-line').textContent=`Lv${state.level} ${l.Job||'Beginner'}`;
    document.getElementById('atlas-route-sub').textContent=l['Primary Route']||'Current route';
    const jt=document.getElementById('v5-job-title'); if(jt) jt.textContent=l.Job||'Beginner';
    const tr=document.getElementById('v5-training'); if(tr) tr.textContent=(l['Primary Route']||'—').replace(/\s*\[.*?\]/g,'');
    const sp=document.getElementById('v5-sp'); if(sp) sp.textContent=srow.Spend||'No SP action';
    const qready=D.quests.map((q,i)=>({...q,_id:questId(q,i)})).filter(q=>!state.quests[q._id]&&questRelevant(q)&&(q.Lv===''||q.Lv==null||Number(q.Lv)<=state.level)).length;
    const qe=document.getElementById('v5-quests'); if(qe) qe.textContent=`${qready} ready`;
    const urgent=D.etc.filter(x=>Number(x['Start Lv']||999)<=state.level+3&&!state.etcDone[etcId(x)]).length;
    const ee=document.getElementById('v5-etc'); if(ee) ee.textContent=`${urgent} urgent`;
    const range=document.getElementById('level-range'); if(range)range.value=String(state.level);
    const hsel=document.getElementById('hero-level-select'); if(hsel)hsel.value=String(state.level);
    const beta=document.getElementById('atlas-beta-pill'); if(beta) beta.textContent=isBeta(l.Confidence||srow.Status)?'COT2 / VERIFY':'CURRENT PLAN';
    const ev=D.gear||[]; const curr=ev.filter(x=>String(x['Evidence Class']||'').includes('CURRENT')).length, ver=ev.filter(x=>String(x['Evidence Class']||'').includes('PRE-LAUNCH')).length, hist=ev.filter(x=>String(x['Evidence Class']||'').includes('HISTORICAL')).length; [['audit-current',curr],['audit-verify',ver],['audit-historical',hist]].forEach(([id,v])=>{const e=document.getElementById(id);if(e)e.textContent=v});

    renderAtlasAvatar();
    renderEquipment('equipment-window','build-summary');
    renderAtlasSkills();
    renderAtlasTarget();
    renderAtlasQueues();
    renderAtlasBuffs();
    renderDashboardTimeline();

    const actions=[
      ['TRAIN',l['Primary Route']||'—',l['Main Monsters']||'Open route','leveling'],
      ['SP',srow.Spend||'No SP action',srow['Why This Is The Action']||'Follow the skill plan','skills'],
      ['AP',a['AP Action']||(state.level>50?'VERIFY BEFORE MORE LUK':'ONLY INT'),`Base LUK target ${baseLukTarget()}`,'equipment'],
      ['BANK',l['SAVE ETC / ITEM NOW']||'Nothing special',l['Target Qty']||'No target','etc']
    ];
    const ar=document.getElementById('dashboard-actions');
    if(ar){
      const mapId=state.level<=9?1000000:null;
      ar.innerHTML=actions.map(([k,v,sub,page])=>`<button class="atlas-action-row ${k==='TRAIN'?'train-action':''}" data-goto="${page}">${k==='TRAIN'&&mapId?`<span class="route-minimap"><img src="https://maplestory.io/api/GMS/83/map/${mapId}/render" alt="${esc(v)} map layout"></span>`:''}<span>${k}</span><div><b>${esc(v)}</b><small>${esc(sub)}</small></div><i>→</i></button>`).join('');
    }

    const currentW=currentCoreWeapon(), next=nextCoreGear();
    const nu=document.getElementById('next-upgrade');
    if(nu){nu.innerHTML=`<div class="atlas-panel-head"><div><h3>Next Upgrade</h3><small>Spend only when it matters</small></div></div><div class="next-upgrade-compact"><div>${currentW?imgTag(currentW):''}<span>Current</span><b>${esc(currentW?.Item||'None')}</b></div><i>→</i><div class="${isHighlyRecommended(next)?'highly-recommended':''}">${next?imgTag(next):''}<span>Next core</span><b>${esc(next?.Item||'Hold')}</b>${recommendationBadge(next,'compact')}</div></div><p>${esc(next?.Priority||'No forced upgrade right now.')}</p><button class="mini-btn" data-goto="equipment">Inspect progression</button>`;hookImageFallback(nu);}
  }

  function renderDashboardTimeline(){
    const root=document.getElementById('level-timeline'); if(!root)return;
    const rows=[];
    for(let lv=state.level;lv<=Math.min(Number(D.meta.maxLevel),state.level+4);lv++){
      const l=D.leveling.find(x=>Number(x.Lv)===lv)||{};
      const sk=D.skills.filter(x=>Number(x.Level)===lv).at(-1)||{};
      rows.push(`<button class="atlas-timeline-level ${lv===state.level?'current':''}" data-set-level="${lv}"><span>LV ${lv}</span><div><b>${esc((l['Primary Route']||'Continue route').replace(/\s*\[.*?\]/g,''))}</b><small>${esc(sk.Spend||'No new SP step')}</small></div></button>`);
    }
    root.innerHTML=rows.join('');
    root.querySelectorAll('[data-set-level]').forEach(b=>b.addEventListener('click',()=>setLevel(b.dataset.setLevel)));
  }

  function renderLoadoutSnapshot(){
    const root=document.getElementById('loadout-snapshot'); if(!root)return;
    const b=computeBuild();
    const showSlots=['Hat','Overall','Cape','Gloves','Weapon','Shield','Shoes','Earrings','Pet','Mount'];
    root.innerHTML=`<div class="snapshot-items">${showSlots.map(slot=>{const name=state.gear[slot]||'None';const item=getGear(name);return `<button data-snapshot-slot="${slot}" class="snapshot-slot ${name==='None'?'empty':''} ${isHighlyRecommended(item)?'highly-recommended':''}" title="${esc(slot)}: ${esc(name)}${isHighlyRecommended(item)?' · HIGHLY RECOMMENDED':''}"><span>${item&&name!=='None'?imgTag(item):'+'}</span><small>${slot}</small>${isHighlyRecommended(item)?'<i class="snapshot-rec-dot">★</i>':''}</button>`}).join('')}</div><div class="snapshot-footer"><b>${b.int} INT · ${b.luk} gear LUK · ${b.matk} M.ATK</b><span class="${b.ready?'equip-ready':'equip-blocked'}">${b.ready?'Weapon ready':`${Math.max(0,b.reqLuk-b.effectiveLuk)} effective LUK short`}</span></div>`;
    root.querySelectorAll('[data-snapshot-slot]').forEach(b=>b.addEventListener('click',()=>openGearModal(b.dataset.snapshotSlot)));
    hookImageFallback(root);
  }

  const slotDefs=[
    ['Ring1','RING','slot-ring1'],['Hat','HAT','slot-hat'],['Ring2','RING','slot-ring2'],
    ['Pendant','PENDANT','slot-pendant'],['Face','FACE','slot-face'],['Eye','EYE','slot-eye'],['Earrings','EARRINGS','slot-earrings'],
    ['Medal','MEDAL','slot-medal'],['Overall','OVERALL','slot-overall'],['Weapon','WEAPON','slot-weapon'],['Shield','SHIELD','slot-shield'],
    ['Cape','CAPE','slot-cape'],['Top','TOP','slot-top'],['Bottom','BOTTOM','slot-bottom'],['Gloves','GLOVES','slot-gloves'],
    ['Pet','PET','slot-pet'],['Mount','MOUNT','slot-mount'],['Shoes','SHOES','slot-shoes']
  ];
  function renderEquipment(windowId,summaryId){
    const root=document.getElementById(windowId); if(!root)return;
    const overall=state.gear.Overall!=='None';
    let slots=slotDefs.map(([slot,label,cls])=>{
      const name=state.gear[slot]||'None';const item=getGear(name);const inactive=overall&&(slot==='Top'||slot==='Bottom');
      const highly=isHighlyRecommended(item);
      return `<button class="gear-slot ${cls} ${name!=='None'?'selected':''} ${inactive?'inactive':''} ${highly?'highly-recommended':''}" data-slot="${esc(slot)}" data-item-name="${esc(name)}" title="${esc(slot)} · ${esc(name)}${highly?' · HIGHLY RECOMMENDED':''}">${item&&name!=='None'?imgTag(item):`<span class="slot-name">${label}</span>`}<em>${esc(label)}</em>${highly?'<span class="slot-rec-marker" aria-label="Highly recommended">★</span>':''}</button>`;
    }).join('');
    const core=skillImgTag('Cold Beam','core-skill-icon');
    root.innerHTML=`<div class="slot-grid">${slots}<div class="core-orb skill-img-wrap">${core}<span>ICE / LIGHTNING</span></div></div>`;
    root.querySelectorAll('[data-slot]').forEach(b=>b.addEventListener('click',()=>openGearModal(b.dataset.slot)));
    hookImageFallback(root);renderBuildSummary(summaryId);
  }

  function renderBuildSummary(id){
    const root=document.getElementById(id);if(!root)return;
    const b=computeBuild(), l=currentLevelRow()||{};
    const rows=[
      ['Job',l.Job||'Beginner'],['Gear INT',`+${b.int}`],['Base LUK target',b.baseLuk],['Gear LUK',`+${b.luk}`],['Effective LUK',b.effectiveLuk],['Magic Attack',b.matk],['Critical Rate',`${b.crit}%`],['Critical Damage',`${b.critDmg}%`],['Speed bonus',`+${b.speed}`],['Weapon Req. LUK',b.reqLuk]
    ];
    root.innerHTML=rows.map(([k,v])=>`<div class="atlas-stat-row"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')+`<div class="atlas-equip-check ${b.ready?'ready':'blocked'}"><span>Weapon requirement</span><b>${b.ready?'READY':`${Math.max(0,b.reqLuk-b.effectiveLuk)} LUK SHORT`}</b></div>${state.level>50?'<p class="atlas-beta-note">Lv51–70 LUK/equip behavior remains live-verification territory.</p>':''}`;
  }


  function openGearModal(slot){
    activeSlot=slot;
    document.getElementById('modal-title').textContent=`Choose ${slot}`;
    document.getElementById('gear-modal').classList.add('open');
    document.getElementById('gear-modal').setAttribute('aria-hidden','false');
    renderGearOptions();
  }
  function closeModal(){document.getElementById('gear-modal').classList.remove('open');document.getElementById('gear-modal').setAttribute('aria-hidden','true');}
  document.querySelectorAll('[data-close-modal]').forEach(x=>x.addEventListener('click',closeModal));
  document.getElementById('modal-show-future').addEventListener('change',renderGearOptions);
  document.getElementById('modal-show-optional').addEventListener('change',renderGearOptions);
  function renderGearOptions(){
    const root=document.getElementById('gear-options');
    const showFuture=document.getElementById('modal-show-future').checked;
    const showOptional=document.getElementById('modal-show-optional').checked;
    let items=gearItemsForSlot(activeSlot);
    const planRank={'CORE':0,'FREE / HOLD':1,'LUK BRIDGE':2,'OPTIONAL':3,'EMPTY':9};
    items.sort((a,b)=>(isHighlyRecommended(b)?1:0)-(isHighlyRecommended(a)?1:0) || (a.Item==='None'?99:(planRank[a.Plan]??8))-(b.Item==='None'?99:(planRank[b.Plan]??8)) || Number(a['Req Lv']||0)-Number(b['Req Lv']||0));
    if(!showFuture) items=items.filter(x=>x.Item==='None'||Number(x['Req Lv']||0)<=state.level);
    if(!showOptional) items=items.filter(x=>x.Item==='None'||['CORE','FREE / HOLD'].includes(String(x.Plan||'')));
    if(items.length===1 && items[0].Item==='None'){
      root.innerHTML=`<div class="empty-option">No meaningful ${esc(activeSlot)} target is in the curated Mage/I/L pool yet. That is deliberate: an empty slot is better than chasing filler gear.</div>`;
      return;
    }
    root.innerHTML=items.map(item=>{
      const none=item.Item==='None';
      const highly=isHighlyRecommended(item);
      return `<button class="gear-option ${highly?'highly-recommended':''}" data-item="${esc(item.Item)}">
        <div>${none?'—':imgTag(item)}</div>
        <div><h4>${esc(item.Item)}</h4><div class="gear-badges">${none?'':`<span class="plan-tag ${slug(item.Plan)}">${esc(item.Plan)}</span><span class="class-tag">${esc(item['Class Fit']||'Mage')}</span>`}</div><p>${esc(highly?(item['Recommendation Reason']||item.Notes||''):item.Notes||'Empty slot')}</p>${none?'':`<span class="evidence-tag ${String(item['Evidence Class']||'').includes('HISTORICAL')?'historical':String(item['Evidence Class']||'').includes('PRE-LAUNCH')?'verify':''}" title="${esc(item['Parity Check']||'Current Classic/COT2 cross-check status')}">${esc(evidenceLabel(item))}</span>`}</div>
        <div class="stats">${none?'':`Lv ${item['Req Lv']||0}<br>INT ${item.INT||0} · LUK ${item.LUK||0}<br>M.ATK ${item['M.ATK']||0}<br>Crit ${item['Crit%']||0}% · CDMG ${item['Crit DMG']||0}%`}</div>
        ${recommendationBadge(item,'bottom-left')}
      </button>`;
    }).join('');
    root.querySelectorAll('[data-item]').forEach(b=>b.addEventListener('click',()=>{
      const choice=b.dataset.item;
      state.gear[activeSlot]=choice;
      if(choice!=='None' && activeSlot==='Overall'){ state.gear.Top='None'; state.gear.Bottom='None'; }
      if(choice!=='None' && (activeSlot==='Top'||activeSlot==='Bottom')) state.gear.Overall='None';
      save();closeModal();renderDashboard();renderEquipment('equipment-window-page','build-summary-page');toast(`${activeSlot}: ${choice}`);
    }));
    hookImageFallback(root);
  }

  function presetAtLevel(type){
    const p=D.gearPresets?.[type]; if(!p)return {};
    let out={};
    (p.levels||[]).filter(x=>Number(x.min)<=state.level).sort((a,b)=>Number(a.min)-Number(b.min)).forEach(x=>Object.assign(out,x.gear||{}));
    return out;
  }
  function applyPreset(type){
    const p=D.gearPresets?.[type]; if(!p)return;
    const keep={Pet:state.gear.Pet,Mount:state.gear.Mount};
    state.gear={...defaultGear,...presetAtLevel(type),...keep};
    save();renderDashboard();renderEquipment('equipment-window-page','build-summary-page');
    toast(`${p.name} applied for Lv${state.level}`);
  }
  document.getElementById('preset-efficient')?.addEventListener('click',()=>applyPreset('efficient'));
  document.getElementById('preset-luk')?.addEventListener('click',()=>applyPreset('luk'));
  document.getElementById('clear-gear')?.addEventListener('click',()=>{
    state.gear={...defaultGear,Weapon:state.level>=10?"Beginner's Wooden Wand / job wand":'None'};save();renderDashboard();renderEquipment('equipment-window-page','build-summary-page');toast('Build cleared');
  });

  function renderDashboardEtc(){
    const root=document.getElementById('dashboard-etc');
    const list=D.etc.filter(x=>Number(x['Start Lv']||999)<=state.level+3 && !state.etcDone[etcId(x)])
      .sort((a,b)=>Number(a['Start Lv']||99)-Number(b['Start Lv']||99)).slice(0,6);
    root.innerHTML=list.length?list.map(x=>{
      const held=Number(state.etcHeld[etcId(x)]||0),need=Number(x['Core + Craft Minimum']||0),left=Math.max(0,need-held);
      return `<div class="stat-row"><span>${esc(x.Item)} <small style="color:#778196">(${esc(x['Used For'])})</small></span><b>${need?`${left} left`:'optional'}</b></div>`;
    }).join(''):`<div class="quest-meta">Nothing urgent in the current ETC queue.</div>`;
  }
  function renderDashboardQuests(){
    const root=document.getElementById('dashboard-quests');
    const rank={'High':0,'Medium':1,'Low / Optional':2};
    const list=D.quests.map((q,i)=>({...q,_i:i,_id:questId(q,i)}))
      .filter(q=>!state.quests[q._id] && !/only/i.test(String(q.Eligibility||'')) && (q.Lv===''||q.Lv==null||Number(q.Lv)<=state.level))
      .sort((a,b)=>(rank[a.Priority]??9)-(rank[b.Priority]??9)||Number(a.Lv||0)-Number(b.Lv||0)).slice(0,6);
    root.innerHTML=list.map(q=>`<div class="stat-row"><span>${esc(q.Quest)}</span><b style="color:${q.Priority==='High'?'#ff8f95':q.Priority==='Medium'?'#ffc07f':'#80dfaf'}">${esc(q.Priority)}</b></div>`).join('')||'<div class="quest-meta">No available quests left in the tracker.</div>';
  }

  function renderBuildLibrary(){
    const root=document.getElementById('build-library'); if(!root)return;
    const builds=D.catalog?.builds||[];
    const classes=D.catalog?.classes||[];
    document.getElementById('active-build-count').textContent=String(builds.filter(b=>b.status==='active').length);
    root.innerHTML=classes.filter(c=>c.id!=='beginner').map(cls=>{
      const list=builds.filter(b=>b.classId===cls.id);
      return `<section class="class-build-group ${cls.status==='active'?'active-class':''}"><div class="class-build-head"><div class="class-emblem">${esc(cls.icon||'◇')}</div><div><span class="eyebrow">${esc(cls.status==='active'?'ACTIVE CLASS':'READY FOR FUTURE BUILDS')}</span><h3>${esc(cls.name)}</h3><p>${esc((cls.branches||[]).join(' · '))}</p></div></div><div class="build-card-grid">${list.map(b=>{const active=b.id===state.activeBuildId&&b.status==='active';return `<article class="build-card ${active?'active-build':'planned-build'}"><div class="build-card-top"><span class="${active?'live-build-tag':'planned-tag'}">${active?'ACTIVE':'PLANNED'}</span>${b.levelMin?`<small>Lv ${b.levelMin}–${b.levelMax}</small>`:''}</div><h4>${esc(b.name)}</h4><p>${esc(b.description||b.subtitle||'Infrastructure reserved for a future researched build.')}</p><div class="build-tags">${(b.tags||[]).map(t=>`<span>${esc(t)}</span>`).join('')}</div>${active?`<button class="primary-btn" data-goto="dashboard">Open this build</button>`:`<button class="ghost-btn" disabled>Not researched yet</button>`}</article>`}).join('')}</div></section>`;
    }).join('');
  }

  function renderRoutes(){
    const current=currentRoute();
    document.getElementById('route-cards').innerHTML=D.routes.map(r=>{
      const cur=current===r;const beta=isBeta(r.Status);
      return `<article class="route-card ${cur?'current':''} ${beta?'beta':''}">
        <div class="route-level">LV ${esc(r.Levels)} ${beta?'<span class="beta-tag">verify</span>':''}</div>
        <h3>${esc(r['Primary Route'])}</h3>
        <p><b>Targets:</b> ${esc(r['Main Monsters'])}</p>
        <p><b>Method:</b> ${esc(r['Main Skill / Method'])}</p>
        <p>${esc(r['Why This Block'])}</p>
        <p><b>Bank:</b> ${esc(r['Major ETCs to Bank'])}</p>
      </article>`;
    }).join('');
    const l=currentLevelRow()||{};
    document.getElementById('level-detail').innerHTML=`<div class="kv-grid">
      ${[['Job',l.Job],['Primary route',l['Primary Route']],['Monsters',l['Main Monsters']],['I/L method',l['I/L Method']],['Alternative',l.Alternative],['Quest / PQ',l['Quest / PQ Tie-In']],['Gear hunt',l['Gear Hunt Tie-In']],['Save now',l['SAVE ETC / ITEM NOW']],['Quantity',l['Target Qty']],['Stop saving',l['When You Can Stop Saving']]].map(([k,v])=>`<div class="kv"><small>${esc(k)}</small><b>${esc(v||'—')}</b></div>`).join('')}
    </div>`;
  }

  function questRelevant(q){return !/only/i.test(String(q.Eligibility||''));}
  function renderQuestFilters(){
    const regions=[...new Set(D.quests.map(q=>q.Region).filter(Boolean))].sort();
    const sel=document.getElementById('quest-region');
    if(sel.options.length<=1) regions.forEach(r=>sel.add(new Option(r,r)));
  }
  ['quest-search','quest-priority','quest-region','quest-relevant','quest-available','quest-hide-done'].forEach(id=>document.getElementById(id).addEventListener('input',renderQuests));
  function renderQuests(){
    const q=document.getElementById('quest-search').value.trim().toLowerCase();
    const p=document.getElementById('quest-priority').value;
    const region=document.getElementById('quest-region').value;
    const relevant=document.getElementById('quest-relevant').checked;
    const available=document.getElementById('quest-available').checked;
    const hideDone=document.getElementById('quest-hide-done').checked;
    const rows=D.quests.map((x,i)=>({...x,_i:i,_id:questId(x,i)})).filter(x=>{
      if(q && !JSON.stringify(x).toLowerCase().includes(q)) return false;
      if(p!=='all'&&x.Priority!==p)return false;
      if(region!=='all'&&x.Region!==region)return false;
      if(relevant&&!questRelevant(x))return false;
      if(available&&x.Lv!==''&&x.Lv!=null&&Number(x.Lv)>state.level)return false;
      if(hideDone&&state.quests[x._id])return false;
      return true;
    });
    const doneCount=D.quests.filter((x,i)=>state.quests[questId(x,i)]).length;
    const coverage=D.meta.questCoverage||{};
    document.getElementById('quest-summary').innerHTML=`<span class="pill">${rows.length} shown</span><span class="pill">${doneCount}/${D.quests.length} completed</span><span class="pill">${D.quests.filter(x=>x.Priority==='High').length} high-priority total</span>${coverage.currentCot2DirectoryCount?`<span class="pill audit-pill" title="${esc(coverage.policy||'')}">Curated ${D.quests.length} / ${esc(coverage.currentCot2DirectoryCount)} COT2 quests</span>`:''}`;
    document.getElementById('quest-list').innerHTML=rows.map(x=>{
      const done=!!state.quests[x._id];
      return `<div class="quest-row ${done?'done':''}">
        <input class="check quest-check" data-id="${x._id}" type="checkbox" ${done?'checked':''}>
        <span class="priority ${priorityClass(x.Priority)}">${esc(x.Priority)}</span>
        <b class="quest-meta">Lv ${esc(x.Lv||'—')}</b>
        <div><div class="quest-name">${esc(x.Quest)}</div><div class="quest-meta">${esc(x.Region)} · ${esc(x.Eligibility)}</div>${isBeta(x.Status)?`<span class="beta-tag">${esc(x.Status)}</span>`:''}</div>
        <div class="quest-meta">${x['ETC / Item To Save']?`Save: ${esc(x['ETC / Item To Save'])} × ${esc(x.Qty||'')}`:esc(x['Reward / Unlock']||'')}</div>
        <div class="quest-why">${esc(x['Why Do It']||x['Save Guidance']||'')}</div>
      </div>`;
    }).join('');
    document.querySelectorAll('.quest-check').forEach(c=>c.addEventListener('change',()=>{state.quests[c.dataset.id]=c.checked;save();renderQuests();renderDashboard();}));
  }

  function actionClass(action){
    const s=String(action||'').toUpperCase();
    if(s.includes('BUY')||s.includes('HOLD'))return'buy';if(s.includes('SKIP'))return'skip';return'optional';
  }
  function renderWeapons(){
    document.getElementById('weapon-roadmap').innerHTML=D.weapons.filter(w=>w.Weapon!=='Beginner weapon / Maple Island').map(w=>{
      const g=getGear(w.Weapon);
      const highly=isHighlyRecommended(g);
      return `<div class="weapon-row ${highly?'highly-recommended':''}">
        <b style="color:#89ddff">Lv${esc(w.Lv)}</b>
        <div>${g?imgTag(g):''}</div>
        <b>${esc(w.Weapon)}</b>
        <span>${w['M.ATK']?`${w['M.ATK']} MA`:'—'}</span>
        <span class="weapon-action ${actionClass(w['Upgrade Priority'])}">${esc(w['Upgrade Priority'])}</span>
        <div><b style="font-size:10px">${esc(w.Why)}</b>${isBeta(w.Status)?`<div style="margin-top:5px"><span class="beta-tag">${esc(w.Status)}</span></div>`:''}</div>
        ${recommendationBadge(g,'bottom-left')}
      </div>`;
    }).join('');
    hookImageFallback(document.getElementById('weapon-roadmap'));
    document.getElementById('recipe-grid').innerHTML=D.recipes.map(r=>`<article class="recipe-card"><h3>${esc(r.Weapon)}</h3><p><b>${esc(r.CraftLevel)}</b> · Fee: ${esc(r.MesoFee||'verify')}</p><p><span class="item-chip">${esc(r.Ingredient1)} ×${esc(r.Qty1)}</span><span class="item-chip">${esc(r.Ingredient2)} ×${esc(r.Qty2)}</span></p><p>${esc(r.Ingredient3)} ${esc(r.Qty3||'')}</p><p>${esc(r.BuildOrder)}</p>${r.Verify?`<span class="beta-tag">${esc(r.Verify)}</span>`:''}</article>`).join('');
  }

  function renderSkills(){
    document.getElementById('skill-list').innerHTML=D.skills.map(s=>{
      const id=skillId(s),done=!!state.skills[id],cur=Number(s.Level)===state.level;
      return `<div class="skill-row ${done?'done':''} ${cur?'current':''}">
        <b style="color:#8bdfff">Lv${esc(s.Level)}</b>
        <b>${esc(s.SP)}</b>
        <div>${skillIcon(s.Spend)}</div>
        <div class="skill-spend">${esc(s.Spend)}</div>
        <div class="skill-why">${esc(s['Why This Is The Action'])}</div>
        <div>${isBeta(s.Status)?`<span class="beta-tag">verify</span>`:`<span class="status-tag">${esc(s.Status||'')}</span>`}</div>
        <input class="check skill-check" data-id="${esc(id)}" type="checkbox" ${done?'checked':''}>
        <div class="skill-result" style="grid-column:4/-1">${esc(s['Result After Level']||'')}</div>
      </div>`;
    }).join('');
    document.querySelectorAll('.skill-check').forEach(c=>c.addEventListener('change',()=>{state.skills[c.dataset.id]=c.checked;save();renderSkills();}));
  }

  ['etc-search','etc-current-only','etc-hide-done'].forEach(id=>document.getElementById(id).addEventListener('input',renderEtc));
  function renderEtc(){
    const q=document.getElementById('etc-search').value.trim().toLowerCase();
    const current=document.getElementById('etc-current-only').checked;
    const hide=document.getElementById('etc-hide-done').checked;
    const list=D.etc.filter(e=>{
      const id=etcId(e);if(q&&!JSON.stringify(e).toLowerCase().includes(q))return false;
      if(current&&Number(e['Start Lv']||999)>state.level)return false;
      if(hide&&state.etcDone[id])return false;return true;
    });
    document.getElementById('etc-list').innerHTML=list.map(e=>{
      const id=etcId(e),held=Number(state.etcHeld[id]||0),min=Number(e['Core + Craft Minimum']||0),pct=min?Math.min(100,held/min*100):0,done=!!state.etcDone[id];
      return `<div class="etc-row ${done?'done':''}">
        <div><div class="etc-name">${esc(e.Item)}</div><div class="etc-note">${esc(e['Used For'])}</div><div class="progress"><i style="width:${pct}%"></i></div></div>
        <div class="etc-note">Start ${esc(e['Start Saving'])}</div>
        <b>${min} min</b>
        <input type="number" min="0" value="${held}" data-held="${esc(id)}" title="Your held quantity">
        <div class="etc-note">${esc(e['All-In Total'])} all-in</div>
        <div class="etc-note">${esc(e['Stop Saving When'])}</div>
        <span class="${isBeta(e.Confidence)?'beta-tag':'status-tag'}">${esc(e.Confidence)}</span>
        <input class="check" type="checkbox" data-etc-done="${esc(id)}" ${done?'checked':''}>
      </div>`;
    }).join('');
    document.querySelectorAll('[data-held]').forEach(i=>i.addEventListener('change',()=>{state.etcHeld[i.dataset.held]=Math.max(0,Number(i.value)||0);save();renderEtc();renderDashboard();}));
    document.querySelectorAll('[data-etc-done]').forEach(i=>i.addEventListener('change',()=>{state.etcDone[i.dataset.etcDone]=i.checked;save();renderEtc();renderDashboard();}));
  }


  const OSMS_DATASETS = {
    items:{label:'Items',file:'items.json'},
    equipment:{label:'Equipment',file:'items.json'},
    monsters:{label:'Monsters',file:'monsters.json'},
    maps:{label:'Maps',file:'maps.json'},
    quests:{label:'Quests',file:'quests.json'},
    skills:{label:'Skills',file:'skills.json'},
    crafting:{label:'Crafting',file:'crafting.json'},
    portals:{label:'Portals',file:'portals.json'},
    patch_notes:{label:'Patch Notes',file:'patch_notes.json'}
  };
  function fetchOsms(key){
    const file=OSMS_DATASETS[key]?.file||key;
    if(osmsDataCache.has(file)) return osmsDataCache.get(file);
    const p=fetch(`${OSMS_RAW_BASE}${file}`,{cache:'force-cache'})
      .then(r=>{if(!r.ok) throw new Error(`${file} HTTP ${r.status}`);return r.json();});
    osmsDataCache.set(file,p);
    return p;
  }
  function osmsImage(path){
    if(!path) return '';
    const clean=String(path).replace(/^\.?\//,'');
    if(/^https?:/i.test(clean)) return clean;
    if(clean.startsWith('images/')) return `${OSMS_RAW_BASE}${clean}`;
    return `${OSMS_RAW_BASE}${clean}`;
  }
  function collectOsmsRows(value,group='',depth=0,out=[]){
    if(depth>5 || value==null) return out;
    if(Array.isArray(value)){
      value.forEach(v=>{
        if(v && typeof v==='object' && !Array.isArray(v)){
          const looksEntity=('id' in v)||('name' in v)||('title' in v)||('description' in v)||('quest' in v)||('map_name' in v);
          if(looksEntity) out.push({...v,__group:group});
          else collectOsmsRows(v,group,depth+1,out);
        }
      });
      return out;
    }
    if(typeof value==='object'){
      for(const [k,v] of Object.entries(value)){
        if(Array.isArray(v)) collectOsmsRows(v,group||k,depth+1,out);
        else if(v && typeof v==='object') collectOsmsRows(v,group||k,depth+1,out);
      }
    }
    return out;
  }
  function searchableRecord(row){
    try{return JSON.stringify(row).toLowerCase();}catch(e){return String(row).toLowerCase();}
  }
  function entityName(row){
    return row.name||row.title||row.quest_name||row.map_name||row.skill_name||row.item_name||row.description||`ID ${row.id??'—'}`;
  }
  function entityThumb(row,dataset){
    if(row.thumbnail) return osmsImage(row.thumbnail);
    const id=Number(row.id);
    if(!Number.isFinite(id)) return '';
    if(dataset==='items'||dataset==='equipment') return `${OSMS_RAW_BASE}images/items/${String(Math.trunc(id)).padStart(8,'0')}.png`;
    if(dataset==='skills') return `${OSMS_RAW_BASE}images/skills/${String(Math.trunc(id)).padStart(7,'0')}.png`;
    if(dataset==='maps') return `${OSMS_RAW_BASE}images/maps/${String(Math.trunc(id)).padStart(9,'0')}.png`;
    return '';
  }
  function recordFacts(row){
    const preferred=['level','req_level','job','class_name','category','sub_category','region','area','hp','mp','exp','price','count','period','on_sale','max_level','npc','reward','map','type'];
    const facts=[];
    preferred.forEach(k=>{
      if(row[k]!==undefined && row[k]!==null && row[k]!=='' && typeof row[k]!=='object') facts.push([k.replaceAll('_',' '),row[k]]);
    });
    if(!facts.length){
      for(const [k,v] of Object.entries(row)){
        if(k.startsWith('__')||['id','name','title','description','thumbnail'].includes(k)||typeof v==='object'||v===''||v==null) continue;
        facts.push([k.replaceAll('_',' '),v]);
        if(facts.length>=6) break;
      }
    }
    return facts.slice(0,8);
  }
  function renderOsmsCards(rows,dataset,limit){
    return rows.slice(0,limit).map(row=>{
      const name=entityName(row);
      const thumb=entityThumb(row,dataset);
      const facts=recordFacts(row);
      const desc=String(row.description||row.desc||row.summary||'').replace(/\\n/g,' ').trim();
      return `<article class="db-card">
        <div class="db-card-top">${thumb?`<div class="db-thumb"><img src="${esc(thumb)}" alt="${esc(name)}" loading="lazy"></div>`:'<div class="db-thumb db-thumb-empty">DB</div>'}
          <div class="db-card-title"><small>${esc(row.__group||OSMS_DATASETS[dataset]?.label||dataset)}</small><h3>${esc(name)}</h3>${row.id!==undefined?`<code>#${esc(row.id)}</code>`:''}</div>
        </div>
        ${desc?`<p>${esc(desc.slice(0,280))}${desc.length>280?'…':''}</p>`:''}
        ${facts.length?`<div class="db-facts">${facts.map(([k,v])=>`<span><small>${esc(k)}</small><b>${esc(v)}</b></span>`).join('')}</div>`:''}
        <details><summary>Full metadata</summary><pre>${esc(JSON.stringify(Object.fromEntries(Object.entries(row).filter(([k])=>!k.startsWith('__')&&!/(?:source|provider|origin|url|thumbnail|gif|hash)/i.test(k))),null,2))}</pre></details>
      </article>`;
    }).join('');
  }
  let classicDbWired=false;
  async function renderClassicDb(resetLimit=false){
    const select=document.getElementById('db-dataset'), input=document.getElementById('db-search'), results=document.getElementById('db-results'), status=document.getElementById('db-status');
    if(!select||!input||!results||!status) return;
    if(!classicDbWired){
      select.addEventListener('change',()=>{osmsRenderLimit.classicdb=80;renderClassicDb();});
      input.addEventListener('input',()=>{osmsRenderLimit.classicdb=80;renderClassicDb();});
      document.getElementById('db-more')?.addEventListener('click',()=>{osmsRenderLimit.classicdb+=80;renderClassicDb();});
      classicDbWired=true;
    }
    if(resetLimit) osmsRenderLimit.classicdb=80;
    const key=select.value, q=input.value.trim().toLowerCase();
    status.innerHTML='<span class="db-loading">Loading current COT2 metadata…</span>';
    try{
      const data=await fetchOsms(key);
      let rows=collectOsmsRows(data);
      if(key==='equipment') rows=rows.filter(r=>String(r.category||'').toLowerCase()==='equipment'||r.equip_slot||r.slot);
      if(q) rows=rows.filter(r=>searchableRecord(r).includes(q));
      const limit=osmsRenderLimit.classicdb;
      status.innerHTML=`<b>${rows.length.toLocaleString()}</b> matching records · showing ${Math.min(limit,rows.length).toLocaleString()} · <span>Top Classic World database</span>`;
      results.innerHTML=renderOsmsCards(rows,key,limit)||'<div class="db-empty">No matching records.</div>';
      const more=document.getElementById('db-more'); if(more) more.hidden=rows.length<=limit;
      hookImageFallback(results);
    }catch(err){
      status.innerHTML=`<span class="db-error">Could not load ${esc(OSMS_DATASETS[key]?.label||key)}. ${esc(err.message)}</span>`;
      results.innerHTML='';
    }
  }

  let cashWired=false;
  async function renderCashShop(){
    const cat=document.getElementById('cash-category'), input=document.getElementById('cash-search'), sale=document.getElementById('cash-sale-only'), status=document.getElementById('cash-status'), results=document.getElementById('cash-results');
    if(!cat||!input||!sale||!status||!results) return;
    if(!cashWired){
      [cat,input,sale].forEach(elm=>elm.addEventListener(elm===input?'input':'change',renderCashShop));
      cashWired=true;
    }
    status.innerHTML='<span class="db-loading">Loading Cash Shop catalog…</span>';
    try{
      const data=await fetchOsms('cash_shop.json');
      const categories=Array.isArray(data.categories)?data.categories:[];
      if(cat.options.length===1){
        categories.forEach(c=>{const o=document.createElement('option');o.value=c.category;o.textContent=c.category;cat.appendChild(o);});
      }
      const q=input.value.trim().toLowerCase();
      let rows=categories.flatMap(c=>(c.items||[]).map(x=>({...x,__group:c.category})));
      if(cat.value!=='all') rows=rows.filter(r=>r.__group===cat.value);
      if(sale.checked) rows=rows.filter(r=>r.on_sale);
      if(q) rows=rows.filter(r=>searchableRecord(r).includes(q));
      status.innerHTML=`<b>${rows.length.toLocaleString()}</b> items · <span>prices/availability are COT2 beta values, not launch promises</span>`;
      results.innerHTML=rows.slice(0,240).map(r=>{
        const thumb=osmsImage(r.thumbnail);
        return `<article class="cash-card">${thumb?`<img src="${esc(thumb)}" alt="${esc(r.name)}" loading="lazy">`:''}<div><small>${esc(r.__group)}${r.sub_category?` · ${esc(r.sub_category)}`:''}</small><h3>${esc(r.name)}</h3><code>#${esc(r.id)}</code><p>${esc(String(r.description||'').replace(/\\n/g,' ').slice(0,180))}</p><div class="cash-meta"><b>${Number(r.price||0).toLocaleString()} NX</b><span>${r.on_sale?'COT2 on sale':'Not marked on sale'}</span>${Number(r.period)>0?`<span>${esc(r.period)} days</span>`:''}</div></div></article>`;
      }).join('')||'<div class="db-empty">No matching Cash Shop items.</div>';
      hookImageFallback(results);
    }catch(err){status.innerHTML=`<span class="db-error">${esc(err.message)}</span>`;results.innerHTML='';}
  }

  let beautyWired=false;
  async function renderBeauty(){
    const type=document.getElementById('beauty-type'), gender=document.getElementById('beauty-gender'), input=document.getElementById('beauty-search'), status=document.getElementById('beauty-status'), results=document.getElementById('beauty-results');
    if(!type||!gender||!input||!status||!results) return;
    if(!beautyWired){
      [type,gender].forEach(elm=>elm.addEventListener('change',renderBeauty));
      input.addEventListener('input',renderBeauty);
      beautyWired=true;
    }
    status.innerHTML='<span class="db-loading">Loading beauty catalog…</span>';
    try{
      const data=await fetchOsms('beauty.json');
      let rows=Array.isArray(data[type.value])?data[type.value]:[];
      if(gender.value!=='all') rows=rows.filter(r=>String(r.gender).toLowerCase()===gender.value);
      const q=input.value.trim().toLowerCase();
      if(q) rows=rows.filter(r=>searchableRecord(r).includes(q));
      status.innerHTML=`<b>${rows.length.toLocaleString()}</b> ${esc(type.value)} styles · exact exported IDs`;
      results.innerHTML=rows.slice(0,360).map(r=>`<article class="beauty-card"><div class="beauty-image"><img src="${esc(osmsImage(r.thumbnail))}" alt="${esc(r.name)}" loading="lazy"></div><b>${esc(r.name)}</b><span>${esc(r.gender||'')}</span><code>#${esc(r.id)}</code></article>`).join('')||'<div class="db-empty">No matching styles.</div>';
      hookImageFallback(results);
    }catch(err){status.innerHTML=`<span class="db-error">${esc(err.message)}</span>`;results.innerHTML='';}
  }

  let formulaWired=false;
  function renderFormulas(){
    const ids=['formula-int','formula-matk','formula-basic','formula-mastery','formula-element'];
    if(!formulaWired){
      ids.forEach(id=>document.getElementById(id)?.addEventListener('input',renderFormulas));
      const build=computeBuild();
      const totalInt=Math.max(4,4+Number(build.int||0)+(state.level-1)*5);
      const intEl=document.getElementById('formula-int'), matkEl=document.getElementById('formula-matk');
      if(intEl) intEl.value=String(totalInt);
      if(matkEl) matkEl.value=String(Math.max(0,Number(build.matk||0)));
      formulaWired=true;
    }
    const num=id=>Number(document.getElementById(id)?.value||0);
    const totalInt=Math.max(0,num('formula-int')), matk=Math.max(0,num('formula-matk')), basic=Math.max(0,num('formula-basic')), mastery=Math.max(0,Math.min(100,num('formula-mastery'))), elem=Math.max(0,num('formula-element'));
    const magic=totalInt/2+matk;
    const min=(basic/100)*magic*(totalInt*mastery/100+1)*elem;
    const max=(basic/100)*magic*(totalInt/100+1)*elem;
    const avg=(min+max)/2;
    const result=document.getElementById('formula-result'); if(!result)return;
    result.innerHTML=`<span class="eyebrow">OUTPUT</span><h3>Magic ${magic.toFixed(1)}</h3><div class="formula-metrics"><div><small>MIN</small><b>${Math.floor(min).toLocaleString()}</b></div><div><small>AVG</small><b>${Math.round(avg).toLocaleString()}</b></div><div><small>MAX</small><b>${Math.floor(max).toLocaleString()}</b></div></div><p>Element modifier ×${elem.toFixed(2)} is applied after the audited base range.</p>`;
  }

  function renderResearch(){
    document.getElementById('decision-list').innerHTML=D.decisions.map(d=>`<article class="decision-card"><span class="eyebrow">${esc(d.Decision)}</span><div class="decision-action">${esc(d['Definitive Guide Action'])}</div><h3>${esc(d['Current Confidence'])} confidence</h3><p>${esc(d.Why)}</p>${isBeta(d.Status)?`<span class="beta-tag">${esc(d.Status)}</span>`:''}</article>`).join('');
    document.getElementById('source-list').innerHTML=D.sources.map(s=>`<div class="source-row"><div><b>${esc(s.Source)}</b><p>${esc(s.Type)}</p></div><b style="color:#8bdfff">${esc(s['Guide Weight'])}</b><p>${esc(s['What We Use It For'])}<br>${esc(s.Notes)}</p><a href="${esc(s.URL)}" target="_blank" rel="noreferrer">Open ↗</a></div>`).join('');
  }

  function renderData(){
    document.getElementById('data-status').innerHTML=`<div class="data-stat"><small>Headless maintenance source</small><b>Connected · backend swappable</b></div><div class="data-stat"><small>Website snapshot</small><b>v${esc(D.meta.version)} · ${new Date(D.meta.builtAt).toLocaleString()}</b></div><div class="data-stat"><small>Quest coverage</small><b>${esc(D.meta.questCoverage?.status||'Curated')} · ${D.quests.length}/${esc(D.meta.questCoverage?.currentCot2DirectoryCount||'—')}</b></div><div class="data-stat"><small>Progress persistence</small><b>${launcherStateReady?'Browser + PC mirror':'Browser localStorage'}</b></div><div class="data-stat"><small>Local state</small><b>${Object.values(state.quests).filter(Boolean).length} quests · Lv${state.level} · ${computeBuild().chosen.length} equipped items</b></div>`;
  }
  document.getElementById('export-progress').addEventListener('click',()=>{
    const blob=new Blob([JSON.stringify({project:D.meta.title,version:1,exportedAt:new Date().toISOString(),state},null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ultimate-il-guide-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  });
  document.getElementById('import-progress').addEventListener('change',async e=>{
    const file=e.target.files[0];if(!file)return;
    try{const j=JSON.parse(await file.text());state=normalizeState({...state,...j.state,gear:{...defaultGear,...(j.state?.gear||{})}});save();renderAll();toast('Progress imported');}
    catch(err){toast('Could not import that JSON file');}
    e.target.value='';
  });
  document.getElementById('reset-progress').addEventListener('click',()=>{
    if(confirm('Reset level, quests, ETC counts and equipped build on this browser?')){localStorage.removeItem(KEY);localStorage.removeItem(STATE_UPDATED_KEY);state=loadState();save();renderAll();toast('Local progress reset');}
  });
  document.getElementById('cache-assets').addEventListener('click',async()=>{
    const urls=[...new Set([
      ...D.gear.filter(g=>Number(g['Item ID'])>0&&!['HISTORICAL ONLY','UNVERIFIED'].includes(String(g['Evidence Class']||''))).flatMap(g=>visualCandidates(g)),
      ...Object.values(D.skillIcons).flatMap(skillVisualCandidates)
    ])];
    let ok=0,failed=0;
    const load=u=>new Promise(resolve=>{const im=new Image();im.onload=()=>{ok++;resolve()};im.onerror=()=>{failed++;resolve()};im.src=u;});
    const queue=[...urls];
    const workers=Array.from({length:6},async()=>{while(queue.length) await load(queue.shift());});
    await Promise.all(workers);
    toast(`Visual preload finished: ${ok} loaded${failed?` · ${failed} unavailable`:''}`);
  });

  function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),2600)}

  function renderAll(){
    const a=document.getElementById('level-select'), b=document.getElementById('hero-level-select'), r=document.getElementById('level-range');
    if(a)a.value=String(state.level); if(b)b.value=String(state.level); if(r)r.value=String(state.level);
    renderDashboard();renderBuildLibrary();renderRoutes();renderQuests();renderWeapons();renderSkills();renderEtc();
    setPage(state.page,false);
  }

  initLevelSelect();
  renderQuestFilters();
  renderAll();
  hookImageFallback();
  hydrateLauncherState();

  if('serviceWorker' in navigator && location.protocol.startsWith('http')){
    navigator.serviceWorker.register('./sw.js?v=0.8.0').catch(()=>{});
  }
})();
