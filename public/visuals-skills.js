(() => {
  const D=window.GUIDE_DATA;
  const RAW='https://raw.githubusercontent.com/ohmi69/osms_datamine_dashboard/main/data/current/';
  const MAPLE_WZ='https://maplestory.io/api/wz/img/GMS/83/Skill/';
  const BEGINNER_ORDER=['Nimble Feet','Three Snails','Recovery'];
  let skillIndexPromise=null;
  let timer=null;
  const norm=v=>String(v??'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[ch]));

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
  function iconSources(skill){
    return [...new Set([iconUrl(skill),legacyWzIcon(skill)].filter(Boolean))];
  }
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
  function applyCanonicalImage(im,skill){
    if(!im||!skill)return false;
    const sources=iconSources(skill);if(!sources.length)return false;
    const [primary,...fallbacks]=sources;
    im.classList.add('canonical-skill-icon');
    im.alt=skill.name||im.alt||'Skill';
    im.dataset.skillId=String(skill.id||'');
    im.dataset.skillName=String(skill.name||'');
    im.dataset.skillIconPolicy='current-classic-first-name-matched-wz-fallback';
    im.dataset.assetFallbacks=fallbacks.join('|');
    if(im.getAttribute('src')!==primary)im.setAttribute('src',primary);
    if(!im.dataset.canonicalSkillHooked){
      im.dataset.canonicalSkillHooked='1';
      im.onerror=()=>{
        const rest=String(im.dataset.assetFallbacks||'').split('|').filter(Boolean);
        if(rest.length){
          const next=rest.shift();
          im.dataset.assetFallbacks=rest.join('|');
          im.dataset.skillIconFallbackUsed='1';
          im.src=next;
          return;
        }
        im.classList.add('skill-icon-unavailable');
        im.removeAttribute('src');
        im.closest('.visual-skill-node,.skill-beginner-card,.db-thumb')?.classList.add('visual-skill-missing');
      };
    }
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
  function cleanDescription(skill){
    return String(skill?.description||'').replace(/^\[Master Level\s*:?\s*\d+\]\s*/i,'').replace(/\s+/g,' ').trim();
  }

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
    const list=document.getElementById('skill-list');if(!list||list.querySelector('.skill-beginner-reference'))return;
    const skills=BEGINNER_ORDER.map(name=>idx.byName.get(norm(name))).filter(Boolean);
    if(skills.length!==3)return;
    const section=document.createElement('section');section.className='skill-beginner-reference';
    section.innerHTML='<div class="skill-beginner-head"><div><span class="eyebrow">BEGINNER · LV1–10</span><h3>Beginner Skills</h3></div><p>Reference only · your build target is 3/3 in all three before the Magician progression below.</p></div>';
    const grid=document.createElement('div');grid.className='skill-beginner-grid';
    skills.forEach(skill=>{
      const card=document.createElement('article');card.className='skill-beginner-card';card.dataset.fullSkillName=skill.name;
      const icon=document.createElement('span');icon.className='skill-beginner-icon';icon.appendChild(img(skill,'skill-icon'));
      const copy=document.createElement('div');
      copy.innerHTML=`<div class="skill-beginner-title"><b>${esc(skill.name)}</b><span>3 / ${esc(skill.max_level||3)}</span></div><p>${esc(cleanDescription(skill))}</p><small>ID ${esc(skill.id)} · ${esc(skill.job||skill.class_name||'Beginner')}</small>`;
      card.append(icon,copy);grid.appendChild(card);
    });
    section.appendChild(grid);list.prepend(section);
    document.documentElement.classList.add('full-skill-beginner-ready');
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
    if(document.getElementById('db-dataset')?.value==='skills'){
      document.querySelectorAll('#db-results .db-card').forEach(card=>{
        const im=card.querySelector('.db-thumb img');if(!im)return;
        const rawId=card.querySelector('code')?.textContent?.replace(/\D/g,'');
        const skill=idx.byId.get(Number(rawId))||idx.byName.get(norm(im.alt));if(skill)applyCanonicalImage(im,skill);
      });
    }
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
    const cards=[...document.querySelectorAll('#atlas-skill-grid [data-skill-name]')];
    cards.forEach(card=>{
      const skill=idx.byName.get(norm(card.dataset.skillName));if(!skill)return;
      let badge=card.querySelector('.visual-cot2-skill-badge');
      if(!badge){badge=document.createElement('span');badge.className='visual-cot2-skill-badge';card.appendChild(badge);}
      badge.textContent=`MAX ${skill.max_level||'—'}`;badge.title=`${skill.job||skill.class_name||''} · skill ID ${skill.id}`;
      const existing=card.querySelector('img');if(existing)applyCanonicalImage(existing,skill);
    });
  }

  async function enhanceClassicDb(idx){
    if(document.getElementById('db-dataset')?.value!=='skills')return;
    const cards=[...document.querySelectorAll('#db-results .db-card')];if(!cards.length)return;
    cards.forEach(card=>{
      const rawId=card.querySelector('code')?.textContent?.replace(/\D/g,'');const id=Number(rawId);const skill=idx.byId.get(id);if(!skill)return;
      const mainImg=card.querySelector('.db-thumb img');if(mainImg)applyCanonicalImage(mainImg,skill);
      if(card.querySelector('.visual-db-skill-chain'))return;
      const req=requiredSkill(idx,skill);const panel=document.createElement('div');panel.className='visual-db-skill-chain';
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
    makeSkillTreeInformational();
    const idx=await skillIndex();
    await Promise.allSettled([enhanceSkillTracker(idx),enhanceDashboardSkillCards(idx),enhanceClassicDb(idx)]);
    canonicalizeSkillImages(idx);
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(enhance,90);}
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',schedule,true);document.addEventListener('change',schedule,true);document.addEventListener('input',schedule,true);enhance();
})();
