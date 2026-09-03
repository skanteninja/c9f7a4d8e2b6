(() => {
  const RAW='/game-data/data/current/';
  let skillIndexPromise=null;
  let timer=null;
  const norm=v=>String(v??'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

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
  function matchSkill(idx,text){
    const hay=` ${norm(text)} `;
    for(const name of idx.names){if(name.length>=3&&(hay.includes(` ${name} `)||hay.includes(name)))return idx.byName.get(name);}
    return null;
  }
  function requiredSkill(idx,skill){
    const raw=String(skill?.required_skill||'').trim();if(!raw)return null;
    const m=raw.match(/^(.*?)\s+Lv\.?\s*(\d+)/i);const name=(m?.[1]||raw).trim();const level=Number(m?.[2]||0);
    return{skill:idx.byName.get(norm(name))||null,name,level};
  }
  function img(skill,cls=''){
    const im=document.createElement('img');im.src=iconUrl(skill);im.alt=skill?.name||'Skill';im.loading='lazy';im.decoding='async';if(cls)im.className=cls;im.addEventListener('error',()=>im.closest('.visual-skill-node')?.classList.add('visual-skill-missing'));return im;
  }
  function node(skill,label,note=''){
    const el=document.createElement('div');el.className='visual-skill-node';
    if(skill&&iconUrl(skill))el.appendChild(img(skill));
    const copy=document.createElement('span');copy.innerHTML=`<small>${esc(label)}</small><b>${esc(skill?.name||'—')}</b>${note?`<em>${esc(note)}</em>`:''}`;el.appendChild(copy);return el;
  }
  function maxStat(skill){const arr=Array.isArray(skill?.all_level_stats)?skill.all_level_stats:[];return arr.length?String(arr[arr.length-1]):'';}
  function midpointStat(skill){const arr=Array.isArray(skill?.all_level_stats)?skill.all_level_stats:[];return arr.length?String(arr[Math.floor((arr.length-1)/2)]):'';}

  async function enhanceSkillTracker(){
    const rows=[...document.querySelectorAll('#skill-list .skill-row')];if(!rows.length)return;
    const idx=await skillIndex();
    rows.forEach(row=>{
      if(row.querySelector('.visual-skill-meta'))return;
      const spend=row.querySelector('.skill-spend')?.textContent||'';const skill=matchSkill(idx,spend);if(!skill)return;
      const req=requiredSkill(idx,skill);const panel=document.createElement('div');panel.className='visual-skill-meta';
      const path=document.createElement('div');path.className='visual-skill-path';
      if(req){path.appendChild(node(req.skill,'Requires',`${req.name} Lv${req.level}`));const arrow=document.createElement('i');arrow.textContent='→';path.appendChild(arrow);}
      path.appendChild(node(skill,'CURRENT skill',`Max Lv${skill.max_level||'—'} · ${skill.job||skill.class_name||''}`));panel.appendChild(path);
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

  async function enhanceDashboardSkillCards(){
    const cards=[...document.querySelectorAll('#atlas-skill-grid [data-skill-name]')];if(!cards.length)return;
    const idx=await skillIndex();
    cards.forEach(card=>{
      if(card.querySelector('.visual-current-skill-badge'))return;
      const skill=idx.byName.get(norm(card.dataset.skillName));if(!skill)return;
      const badge=document.createElement('span');badge.className='visual-current-skill-badge';badge.textContent=`CURRENT · ${skill.max_level||'—'}`;badge.title=`Current CURRENT metadata · ${skill.job||skill.class_name||''}`;card.appendChild(badge);
      const existing=card.querySelector('img');if(existing&&iconUrl(skill)){existing.src=iconUrl(skill);existing.dataset.currentSkill='1';}
    });
    const detail=document.getElementById('atlas-skill-detail');if(detail&&!detail.querySelector('.visual-skill-source')){
      const source=document.createElement('small');source.className='visual-skill-source';source.textContent='Skill icons / prerequisite metadata: current CURRENT client export via TCW';detail.appendChild(source);
    }
  }

  async function enhanceClassicDb(){
    if(document.getElementById('db-dataset')?.value!=='skills')return;
    const cards=[...document.querySelectorAll('#db-results .db-card')];if(!cards.length)return;
    const idx=await skillIndex();
    cards.forEach(card=>{
      if(card.querySelector('.visual-db-skill-chain'))return;
      const rawId=card.querySelector('code')?.textContent?.replace(/\D/g,'');const id=Number(rawId);const skill=idx.byId.get(id);if(!skill)return;
      const req=requiredSkill(idx,skill);const panel=document.createElement('div');panel.className='visual-db-skill-chain';
      const path=document.createElement('div');path.className='visual-skill-path';
      if(req){path.appendChild(node(req.skill,'Prerequisite',`${req.name} Lv${req.level}`));const arrow=document.createElement('i');arrow.textContent='→';path.appendChild(arrow);}
      path.appendChild(node(skill,'Current skill',`Max Lv${skill.max_level||'—'}`));panel.appendChild(path);
      const stats=document.createElement('div');stats.className='visual-skill-level-preview';
      const all=Array.isArray(skill.all_level_stats)?skill.all_level_stats:[];
      const picks=all.length?[0,Math.floor((all.length-1)/2),all.length-1]:[];
      [...new Set(picks)].forEach((n,i)=>{const label=i===0?'Lv1':n===all.length-1?`Lv${all.length}`:`Lv${n+1}`;const box=document.createElement('div');box.innerHTML=`<b>${label}</b><span>${esc(String(all[n]||''))}</span>`;stats.appendChild(box);});
      if(stats.children.length)panel.appendChild(stats);
      card.appendChild(panel);
    });
  }

  async function enhance(){document.documentElement.classList.add('visual-skill-layer-ready');await Promise.allSettled([enhanceSkillTracker(),enhanceDashboardSkillCards(),enhanceClassicDb()]);}
  function schedule(){clearTimeout(timer);timer=setTimeout(enhance,110);}
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',schedule,true);document.addEventListener('change',schedule,true);document.addEventListener('input',schedule,true);enhance();
})();
