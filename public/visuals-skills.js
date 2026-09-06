(() => {
  const D=window.GUIDE_DATA;
  const RAW='https://raw.githubusercontent.com/ohmi69/osms_datamine_dashboard/main/data/current/';
  const MAPLE_WZ='https://maplestory.io/api/wz/img/GMS/83/Skill/';
  const BEGINNER_ORDER=['Nimble Feet','Three Snails','Recovery'];
  let skillIndexPromise=null;
  let timer=null;
  const norm=v=>String(v??'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function installDashboardCompactStyle(){
    if(document.getElementById('tcw-dashboard-skill-compact'))return;
    const style=document.createElement('style');style.id='tcw-dashboard-skill-compact';
    style.textContent=`
      .dashboard-v72 .v6-skills-panel{padding:10px 12px!important}
      .dashboard-v72 .v6-skills-panel .atlas-panel-head{margin-bottom:6px!important;padding-bottom:6px!important}
      .dashboard-v72 .v6-skills-panel .atlas-skill-tabs{margin-bottom:6px!important;padding-bottom:5px!important}
      .dashboard-v72 .v6-skills-panel .atlas-skill-tab{font-size:8px!important;padding:5px 8px!important}
      .dashboard-v72 .v6-skills-panel .atlas-skill-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:6px!important}
      .dashboard-v72 .v6-skills-panel .atlas-skill-card{min-height:52px!important;height:52px!important;padding:4px 6px!important;gap:1px!important;border-radius:8px!important}
      .dashboard-v72 .v6-skills-panel .skill-img-wrap{width:25px!important;height:25px!important;border-radius:5px!important}
      .dashboard-v72 .v6-skills-panel .atlas-skill-card img{max-width:22px!important;max-height:22px!important}
      .dashboard-v72 .v6-skills-panel .atlas-skill-card b{font-size:7px!important;line-height:1!important}
      .dashboard-v72 .v6-skills-panel .atlas-skill-card small{font-size:7px!important;line-height:1!important;margin:0!important}
      .dashboard-v72 .v6-skills-panel .visual-cot2-skill-badge{display:none!important}
      .dashboard-v72 .v6-skills-panel .atlas-skill-detail{min-height:46px!important;margin-top:6px!important;padding:6px 8px!important;gap:7px!important}
      .dashboard-v72 .v6-skills-panel .atlas-skill-detail .skill-img-wrap{width:28px!important;height:28px!important;flex:0 0 28px!important}
      .dashboard-v72 .v6-skills-panel .atlas-skill-detail .skill-img-wrap img{max-width:25px!important;max-height:25px!important}
      .dashboard-v72 .v6-skills-panel .atlas-skill-detail .detail-kicker{display:none!important}
      .dashboard-v72 .v6-skills-panel .atlas-skill-detail b{font-size:8px!important}
      .dashboard-v72 .v6-skills-panel .atlas-skill-detail p{font-size:7px!important;line-height:1.2!important;margin:2px 0!important}
      .dashboard-v72 .v6-skills-panel .atlas-skill-detail small{font-size:7px!important;line-height:1.15!important}
    `;
    document.head.appendChild(style);
    document.documentElement.classList.add('dashboard-skill-compact-ready');
  }

  function collectSkills(value,out=[]){
    if(Array.isArray(value)){value.forEach(v=>collectSkills(v,out));return out;}
    if(!value||typeof value!=='object')return out;
    if(value.id!==undefined&&value.name&&value.thumbnail)out.push(value);
    Object.values(value).forEach(v=>{if(v&&typeof v==='object')collectSkills(v,out);});
    return out;
  }
  function skillIndex(){
    if(!skillIndexPromise){
      skillIndexPromise=fetch(`${RAW}skills.json`,{cache:'force-cache'}).then(r=>{if(!r.ok)throw new Error(`skills.json HTTP ${r.status}`);return r.json();}).then(data=>{
        const rows=collectSkills(data);const byId=new Map(),byName=new Map();
        rows.forEach(s=>{const id=Number(s.id);if(Number.isFinite(id)&&!byId.has(id))byId.set(id,s);const n=norm(s.name);if(n&&!byName.has(n))byName.set(n,s);});
        const names=[...byName.keys()].sort((a,b)=>b.length-a.length);
        return{rows,byId,byName,names};
      }).catch(()=>({rows:[],byId:new Map(),byName:new Map(),names:[]}));
    }
    return skillIndexPromise;
  }
  function iconUrl(skill){return skill?.thumbnail?`${RAW}${String(skill.thumbnail).replace(/^\/+/, '')}`:'';}
  function legacyIdFor(skill){
    const name=String(skill?.name||'');
    const mapped=Number(D?.skillIcons?.[name]?.id||0);
    if(Number.isFinite(mapped)&&mapped>0)return mapped;
    if(BEGINNER_ORDER.includes(name)){
      const current=Number(skill?.id||0);
      if(Number.isFinite(current)&&current>0)return current;
    }
    return 0;
  }
  function legacyWzIcon(skill){
    const id=legacyIdFor(skill);if(!id)return '';
    const book=String(Math.trunc(id/10000)).padStart(3,'0');
    return `${MAPLE_WZ}${book}.img/skill/${id}/icon`;
  }
  function iconSources(skill){return [...new Set([iconUrl(skill),legacyWzIcon(skill)].filter(Boolean))];}
  function matchSkill(idx,text){
    const exact=idx.byName.get(norm(text));if(exact)return exact;
    const hay=` ${norm(text)} `;
    for(const name of idx.names){if(name.length>=3&&(hay.includes(` ${name} `)||hay.includes(name)))return idx.byName.get(name);}
    return null;
  }
  function requiredSkill(idx,skill){
    const raw=String(skill?.required_skill||'').trim();if(!raw)return null;
    const m=raw.match(/^(.*?)\s+Lv\.?\s*(\d+)/i);const name=(m?.[1]||raw).trim();const level=Number(m?.[2]||0);
    return{skill:idx.byName.get(norm(name))||null,name,level};
  }

  function markResolvedSkillSource(im){
    if(!im?.complete||im.naturalWidth<=0)return;
    const id=String(im.dataset.skillId||'');
    const src=im.getAttribute('src')||'';
    if(!id||!src)return;
    im.dataset.resolvedSkillId=id;
    im.dataset.resolvedSkillSrc=src;
    im.dataset.skillSourceStable='1';
  }

  function applyCanonicalImage(im,skill){
    if(!im||!skill)return false;
    const sources=iconSources(skill);if(!sources.length)return false;
    const [primary,...fallbacks]=sources;
    const nextId=String(skill.id||'');
    const identityChanged=!!im.dataset.canonicalSkillIdentity&&im.dataset.canonicalSkillIdentity!==nextId;
    if(identityChanged){
      delete im.dataset.resolvedSkillId;
      delete im.dataset.resolvedSkillSrc;
      delete im.dataset.skillSourceStable;
      delete im.dataset.skillIconFallbackUsed;
    }

    im.classList.add('canonical-skill-icon');
    im.alt=skill.name||im.alt||'Skill';
    im.dataset.canonicalSkillIdentity=nextId;
    im.dataset.skillId=nextId;
    im.dataset.skillName=String(skill.name||'');
    im.dataset.skillIconPolicy='current-classic-first-name-matched-wz-fallback';
    im.dataset.assetFallbacks=fallbacks.join('|');

    const current=im.getAttribute('src')||'';
    const resolvedSameSkill=im.dataset.resolvedSkillId===nextId&&!!im.dataset.resolvedSkillSrc&&current===im.dataset.resolvedSkillSrc;
    if(!resolvedSameSkill&&current!==primary)im.setAttribute('src',primary);

    if(!im.dataset.canonicalSkillHooked){
      im.dataset.canonicalSkillHooked='1';
      im.addEventListener('load',()=>markResolvedSkillSource(im));
      im.onerror=()=>{
        const rest=String(im.dataset.assetFallbacks||'').split('|').filter(Boolean);
        if(rest.length){
          const next=rest.shift();
          im.dataset.assetFallbacks=rest.join('|');
          im.dataset.skillIconFallbackUsed='1';
          im.src=next;
          return;
        }
        delete im.dataset.resolvedSkillId;
        delete im.dataset.resolvedSkillSrc;
        delete im.dataset.skillSourceStable;
        im.classList.add('skill-icon-unavailable');
        im.removeAttribute('src');
        im.closest('.visual-skill-node,.skill-beginner-card,.db-thumb')?.classList.add('visual-skill-missing');
      };
    }
    markResolvedSkillSource(im);
    return true;
  }
  function img(skill,cls=''){
    const im=document.createElement('img');
    im.loading='lazy';im.decoding='async';if(cls)im.className=cls;
    applyCanonicalImage(im,skill);
    return im;
  }
  function node(skill,label,note=''){
    const el=document.createElement('div');el.className='visual-skill-node';
    if(skill&&iconSources(skill).length)el.appendChild(img(skill));
    const copy=document.createElement('span');copy.innerHTML=`<small>${esc(label)}</small><b>${esc(skill?.name||'—')}</b>${note?`<em>${esc(note)}</em>`:''}`;el.appendChild(copy);return el;
  }
  function maxStat(skill){const arr=Array.isArray(skill?.all_level_stats)?skill.all_level_stats:[];return arr.length?String(arr[arr.length-1]):'';}
  function midpointStat(skill){const arr=Array.isArray(skill?.all_level_stats)?skill.all_level_stats:[];return arr.length?String(arr[Math.floor((arr.length-1)/2)]):'';}
  function cleanDescription(skill){return String(skill?.description||'').replace(/^\[Master Level\s*:?\s*\d+\]\s*/i,'').replace(/\s+/g,' ').trim();}

  function makeSkillTreeInformational(){
    const list=document.getElementById('skill-list');if(!list)return;
    list.querySelectorAll('.skill-row').forEach(row=>{
      row.classList.remove('done');
      row.querySelectorAll('.skill-check,input[type="checkbox"]').forEach(box=>box.remove());
      row.dataset.informational='1';
    });
    document.documentElement.classList.add('skill-tree-informational-ready');
  }

  async function ensureBeginnerSection(idx){
    const list=document.getElementById('skill-list');if(!list)return;
    let section=list.querySelector('.skill-beginner-reference');
    if(!section){
      section=document.createElement('section');section.className='skill-beginner-reference';
      section.innerHTML='<div class="skill-beginner-head"><div><span class="eyebrow">BEGINNER · LV1–10</span><h3>Beginner Skills</h3></div><p>Reference only · your build target is 3/3 in all three before the Magician progression below.</p></div><div class="skill-beginner-grid"></div>';
      list.prepend(section);
    }
    const grid=section.querySelector('.skill-beginner-grid');if(!grid)return;
    for(const name of BEGINNER_ORDER){
      const skill=idx.byName.get(norm(name));if(!skill)continue;
      let card=[...grid.querySelectorAll('.skill-beginner-card')].find(x=>norm(x.dataset.fullSkillName)===norm(name));
      if(!card){
        card=document.createElement('article');card.className='skill-beginner-card';card.dataset.fullSkillName=name;
        card.innerHTML=`<span class="skill-beginner-icon" data-skill-icon-name="${esc(name)}"></span><div><div class="skill-beginner-title"><b>${esc(name)}</b><span>3 / 3</span></div><p class="skill-beginner-description">Beginner skill reference.</p><small class="skill-beginner-meta">Beginner</small></div>`;
        grid.appendChild(card);
      }
      card.dataset.fullSkillName=skill.name;
      const icon=card.querySelector('.skill-beginner-icon');
      let im=icon?.querySelector('img');
      if(icon&&!im){im=img(skill,'skill-icon');icon.appendChild(im);}else if(im)applyCanonicalImage(im,skill);
      const title=card.querySelector('.skill-beginner-title b');if(title)title.textContent=skill.name;
      const target=card.querySelector('.skill-beginner-title span');if(target)target.textContent=`3 / ${skill.max_level||3}`;
      const desc=card.querySelector('.skill-beginner-description')||card.querySelector('p');if(desc)desc.textContent=cleanDescription(skill)||'Beginner skill reference.';
      const meta=card.querySelector('.skill-beginner-meta')||card.querySelector('small');if(meta)meta.textContent=`ID ${skill.id} · ${skill.job||skill.class_name||'Beginner'}`;
    }
    const cards=[...grid.querySelectorAll('.skill-beginner-card')];
    const ready=BEGINNER_ORDER.every(name=>cards.some(card=>norm(card.dataset.fullSkillName)===norm(name)&&card.querySelector('img.canonical-skill-icon')));
    document.documentElement.classList.toggle('full-skill-beginner-ready',ready);
  }

  function resolveDbSkill(idx,card){
    if(!card)return null;
    const title=String(card.querySelector('h3')?.textContent||'').trim();
    const im=card.querySelector('.db-thumb img');
    const titleMatch=idx.byName.get(norm(title));
    if(titleMatch)return titleMatch;
    const altMatch=idx.byName.get(norm(im?.alt||''));
    if(altMatch)return altMatch;
    const fuzzy=matchSkill(idx,title)||matchSkill(idx,im?.alt||'');
    if(fuzzy)return fuzzy;
    const numericCodes=[...card.querySelectorAll('code')].map(code=>String(code.textContent||'').trim()).filter(v=>/^\d+$/.test(v));
    for(const value of numericCodes){const byId=idx.byId.get(Number(value));if(byId)return byId;}
    return null;
  }
  function ensureDbSkillImage(card,skill){
    if(!card||!skill)return null;
    let thumb=card.querySelector('.db-thumb');
    if(!thumb){thumb=document.createElement('div');thumb.className='db-thumb';card.prepend(thumb);}
    let im=thumb.querySelector('img');
    if(!im){im=img(skill);thumb.appendChild(im);}else applyCanonicalImage(im,skill);
    card.dataset.canonicalSkillId=String(skill.id||'');
    card.dataset.canonicalSkillName=String(skill.name||'');
    return im;
  }
  function canonicalizeDbSkills(idx){
    if(document.getElementById('db-dataset')?.value!=='skills')return;
    document.querySelectorAll('#db-results .db-card').forEach(card=>{
      const skill=resolveDbSkill(idx,card);if(skill)ensureDbSkillImage(card,skill);
    });
  }

  function canonicalizeSkillImages(idx){
    const selectors=[
      '#skill-list .skill-row img[alt]',
      '#skill-list .skill-beginner-card img[alt]',
      '#atlas-skill-grid img[alt]',
      '#atlas-skill-detail img[alt]',
      '#atlas-buffs img[alt]',
      '.visual-skill-node img[alt]'
    ];
    document.querySelectorAll(selectors.join(',')).forEach(im=>{
      const skill=idx.byName.get(norm(im.alt))||matchSkill(idx,im.alt);if(skill)applyCanonicalImage(im,skill);
    });
    canonicalizeDbSkills(idx);
    document.documentElement.classList.add('canonical-skill-icons-ready');
  }

  async function enhanceSkillTracker(idx){
    makeSkillTreeInformational();
    await ensureBeginnerSection(idx);
    const rows=[...document.querySelectorAll('#skill-list .skill-row')];if(!rows.length)return;
    rows.forEach(row=>{
      const spend=row.querySelector('.skill-spend')?.textContent||'';const skill=matchSkill(idx,spend);if(!skill)return;
      const existing=row.querySelector('img[alt]');if(existing)applyCanonicalImage(existing,skill);
      if(row.querySelector('.visual-skill-meta'))return;
      const req=requiredSkill(idx,skill);const panel=document.createElement('div');panel.className='visual-skill-meta';
      const path=document.createElement('div');path.className='visual-skill-path';
      if(req){path.appendChild(node(req.skill,'Requires',`${req.name} Lv${req.level}`));const arrow=document.createElement('i');arrow.textContent='→';path.appendChild(arrow);}
      path.appendChild(node(skill,'Skill',`Max Lv${skill.max_level||'—'} · ${skill.job||skill.class_name||''}`));panel.appendChild(path);
      const stats=document.createElement('div');stats.className='visual-skill-stats';
      const mid=midpointStat(skill),max=maxStat(skill);
      if(skill.passive)stats.insertAdjacentHTML('beforeend','<span>PASSIVE</span>');
      if(skill.mob_count)stats.insertAdjacentHTML('beforeend',`<span>${esc(skill.mob_count)} TARGET${Number(skill.mob_count)===1?'':'S'}</span>`);
      if(skill.attack_count)stats.insertAdjacentHTML('beforeend',`<span>${esc(skill.attack_count)} HIT${Number(skill.attack_count)===1?'':'S'}</span>`);
      if(mid)stats.insertAdjacentHTML('beforeend',`<span title="${esc(mid)}">MID · ${esc(mid.slice(0,54))}${mid.length>54?'…':''}</span>`);
      if(max)stats.insertAdjacentHTML('beforeend',`<span title="${esc(max)}">MAX · ${esc(max.slice(0,62))}${max.length>62?'…':''}</span>`);
      if(stats.children.length)panel.appendChild(stats);
      row.appendChild(panel);
    });
  }

  async function enhanceDashboardSkillCards(idx){
    installDashboardCompactStyle();
    const cards=[...document.querySelectorAll('#atlas-skill-grid [data-skill-name]')];
    cards.forEach(card=>{
      card.querySelector('.visual-cot2-skill-badge')?.remove();
      const skill=idx.byName.get(norm(card.dataset.skillName));if(!skill)return;
      const existing=card.querySelector('img');if(existing)applyCanonicalImage(existing,skill);
    });
  }

  async function enhanceClassicDb(idx){
    if(document.getElementById('db-dataset')?.value!=='skills')return;
    const cards=[...document.querySelectorAll('#db-results .db-card')];if(!cards.length)return;
    cards.forEach(card=>{
      const skill=resolveDbSkill(idx,card);if(!skill)return;
      ensureDbSkillImage(card,skill);
      const existingPanel=card.querySelector('.visual-db-skill-chain');
      if(existingPanel&&existingPanel.dataset.skillId===String(skill.id))return;
      existingPanel?.remove();
      const req=requiredSkill(idx,skill);const panel=document.createElement('div');panel.className='visual-db-skill-chain';panel.dataset.skillId=String(skill.id||'');
      const path=document.createElement('div');path.className='visual-skill-path';
      if(req){path.appendChild(node(req.skill,'Prerequisite',`${req.name} Lv${req.level}`));const arrow=document.createElement('i');arrow.textContent='→';path.appendChild(arrow);}
      path.appendChild(node(skill,'Skill',`Max Lv${skill.max_level||'—'}`));panel.appendChild(path);
      const stats=document.createElement('div');stats.className='visual-skill-level-preview';
      const all=Array.isArray(skill.all_level_stats)?skill.all_level_stats:[];
      const picks=all.length?[0,Math.floor((all.length-1)/2),all.length-1]:[];
      [...new Set(picks)].forEach((n,i)=>{const label=i===0?'Lv1':n===all.length-1?`Lv${all.length}`:`Lv${n+1}`;const box=document.createElement('div');box.innerHTML=`<b>${label}</b><span>${esc(String(all[n]||''))}</span>`;stats.appendChild(box);});
      if(stats.children.length)panel.appendChild(stats);
      card.appendChild(panel);
    });
  }

  async function enhance(){
    document.documentElement.classList.add('visual-skill-layer-ready');
    installDashboardCompactStyle();
    makeSkillTreeInformational();
    const idx=await skillIndex();
    await Promise.allSettled([enhanceSkillTracker(idx),enhanceDashboardSkillCards(idx),enhanceClassicDb(idx)]);
    canonicalizeSkillImages(idx);
  }
  function schedule(){
    if(timer)return;
    timer=setTimeout(()=>{timer=null;enhance();},90);
  }
  function isLevelControl(target){
    const el=target instanceof Element?target:null;
    return !!el?.closest('#level-select,#hero-level-select,#level-range,#level-prev,#level-next,.progression-avatar-level-controls');
  }
  function mutationNeedsEnhance(records){
    return records.some(record=>[...record.addedNodes].some(node=>{
      if(!(node instanceof Element))return false;
      return node.matches?.('#atlas-skill-grid,.atlas-skill-card,#skill-list,.skill-row,#db-results,.db-card,.v6-skills-panel')||
        !!node.querySelector?.('#atlas-skill-grid,.atlas-skill-card,#skill-list .skill-row,#db-results .db-card,.v6-skills-panel');
    }));
  }
  new MutationObserver(records=>{if(mutationNeedsEnhance(records))schedule();}).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',event=>{if(!isLevelControl(event.target))schedule();},true);
  document.addEventListener('change',event=>{if(!isLevelControl(event.target))schedule();},true);
  document.addEventListener('input',event=>{if(!isLevelControl(event.target))schedule();},true);
  enhance();
})();