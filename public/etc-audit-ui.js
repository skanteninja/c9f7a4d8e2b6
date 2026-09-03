(() => {
  const A=window.TCW_ETC_AUDIT;
  if(!A)return;
  let timer=null;
  const norm=v=>String(v??'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function auditForRow(row){
    const name=row.querySelector('.etc-name')?.textContent?.trim();
    return name?A.rows.get(norm(name)):null;
  }
  function updateHeading(){
    const section=document.querySelector('section[data-page="etc"]');if(!section)return;
    const h=section.querySelector('.section-head h2');if(h)h.textContent='ETC Lifetime Checklist';
    const eyebrow=section.querySelector('.section-head .eyebrow');if(eyebrow)eyebrow.textContent='AUDITED · NO BACKTRACKING';
    let intro=section.querySelector('.etc-lifetime-rule');
    if(!intro){intro=document.createElement('div');intro.className='etc-lifetime-rule panel';section.querySelector('.filters')?.before(intro);}
    intro.innerHTML='<div><b>Permanent KEEP = all verified one-time quest demand + this I/L build’s crafting reserve + 15%.</b><span>Rotating weekly donations are separate. A +100 weekly request never inflates what you permanently bank.</span></div><span class="etc-audit-revision">QUEST AUDIT · SEP 2026</span>';
  }
  function decorateRows(){
    document.querySelectorAll('#etc-list .etc-row').forEach(row=>{
      const a=auditForRow(row);if(!a)return;
      row.dataset.lifetimeAudited='1';
      let box=row.querySelector('.etc-audit-breakdown');
      if(!box){box=document.createElement('div');box.className='etc-audit-breakdown';const copy=row.querySelector(':scope > div:first-child');copy?.appendChild(box);}
      const pieces=[];
      if(a.quest>0)pieces.push(`<span><small>QUESTS</small><b>${a.quest}</b></span>`);
      if(a.craft>0)pieces.push(`<span><small>I/L CRAFT</small><b>${a.craft}</b></span>`);
      pieces.push(`<span><small>BASE</small><b>${a.base}</b></span>`);
      pieces.push(`<span class="buffer"><small>+15%</small><b>${a.keep}</b></span>`);
      if(a.weekly>0)pieces.push(`<span class="weekly"><small>WEEKLY ONLY</small><b>+${a.weekly}</b></span>`);
      box.innerHTML=pieces.join('');
      const recommended=row.querySelector('.etc-recommended');
      if(recommended){
        const b=recommended.querySelector('b');if(b)b.textContent=String(a.keep);
        const small=recommended.querySelector('small');if(small)small.textContent='permanent bank target';
        recommended.title=`${a.uses}. ${a.weekly?`If the active weekly asks for it, collect an additional ${a.weekly} for that week only.`:'No rotating weekly reserve is included.'}`;
      }
      const note=row.querySelector('.etc-name')?.parentElement?.querySelector('.etc-note');
      if(note)note.textContent=a.uses;
      let weekly=row.querySelector('.etc-weekly-note');
      if(a.weekly>0){
        if(!weekly){weekly=document.createElement('div');weekly.className='etc-weekly-note';row.appendChild(weekly);}
        weekly.innerHTML=`<b>WEEKLY:</b> +${a.weekly} <span>only when the active rotation asks for this item</span>`;
      }else weekly?.remove();
    });
  }
  function weeklyOnlyBlock(){
    const list=document.getElementById('etc-list');if(!list)return;
    let block=document.querySelector('.etc-weekly-only-block');
    if(!block){block=document.createElement('section');block.className='etc-weekly-only-block panel';list.after(block);}
    block.innerHTML=`<div class="etc-weekly-head"><div><span class="eyebrow">DO NOT BANK PERMANENTLY</span><h3>Weekly-only donation materials</h3></div><p>These have no permanent target in this build. Collect the stack only if the Community Board rolls it that week.</p></div><div class="etc-weekly-grid">${A.weeklyOnly.map(x=>`<div><span>${esc(x.name)}</span><b>+${x.count}</b><small>${esc(x.group)}</small></div>`).join('')}</div>`;
  }
  function dashboardCopy(){
    const panel=document.querySelector('.v72-etc-panel');const small=panel?.querySelector('.atlas-panel-head small');
    if(small)small.textContent='Lifetime quest + I/L craft reserve · 15% buffer';
  }
  function enhance(){
    updateHeading();decorateRows();weeklyOnlyBlock();dashboardCopy();
    const rows=[...document.querySelectorAll('#etc-list .etc-row')];
    const ready=rows.length>0&&rows.every(r=>!auditForRow(r)||r.dataset.lifetimeAudited==='1');
    document.documentElement.classList.toggle('etc-lifetime-audit-ready',ready);
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(enhance,80);}
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('input',schedule,true);document.addEventListener('change',schedule,true);document.addEventListener('click',schedule,true);
  enhance();
})();
