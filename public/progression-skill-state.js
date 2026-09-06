(() => {
  const D=window.GUIDE_DATA;if(!D)return;
  const maps={magician:{EB:'Energy Bolt',MC:'Magic Claw',MG:'Magic Guard',MPR:'Improved MP Recovery',MaxMP:'Max MP Increase',Armor:'Magic Armor'},il:{TP:'Teleport',CB:'Cold Beam',TB:'Thunder Bolt','MP Eater':'MP Eater',Med:'Meditation',Slow:'Slow'}};
  const beginner={1:[0,0,0],2:[1,0,0],3:[2,0,0],4:[3,0,0],5:[3,1,0],6:[3,2,0],7:[3,3,0],8:[3,3,1],9:[3,3,2],10:[3,3,3]};
  const bnames=['Nimble Feet','Three Snails','Recovery'];
  const first=new Set(Object.values(maps.magician)),second=new Set(Object.values(maps.il));
  const lvl=()=>Math.max(1,Math.min(70,Number(document.getElementById('level-select')?.value||document.getElementById('hero-level-select')?.value||document.getElementById('hero-level')?.textContent||1)));
  const stage=n=>n<10
    ?{id:'beginner',tab:'beginner',job:'Beginner',badge:'Beginner',classPill:'BEGINNER',jobPill:'PRE-JOB'}
    :n<30
      ?{id:'magician',tab:'magician',job:'Magician',badge:'Magician',classPill:'MAGICIAN',jobPill:'1ST JOB'}
      :{id:'il',tab:'il',job:'Wizard (I/L)',badge:'I/L',classPill:'MAGICIAN',jobPill:'WIZARD (I/L)'};

  window.TCW_CLASS_PROGRESSION=Object.freeze({
    thresholds:Object.freeze({magician:10,iceLightning:30}),
    forLevel:n=>({...stage(Math.max(1,Math.min(70,Number(n)||1)))})
  });

  function alloc(kind,n){const token=kind==='magician'?/\bEB\s+\d+/:/\bTP\s+\d+/;const rows=(D.skills||[]).filter(r=>Number(r.Level)<=n&&token.test(String(r['Result After Level']||'')));const out={};if(!rows.length)return out;String(rows.at(-1)['Result After Level']||'').split('|').forEach(p=>{const m=p.trim().match(/^(.+?)\s+(\d+)$/);if(m&&maps[kind][m[1].trim()])out[maps[kind][m[1].trim()]]=Number(m[2]);});return out;}

  function syncClassProgression(n){
    const s=stage(n);
    const tab=document.querySelector(`#atlas-skill-tabs [data-skill-tab="${s.tab}"]`);
    if(tab&&!tab.classList.contains('active'))tab.click();

    const title=document.getElementById('v5-job-title');if(title)title.textContent=s.job;
    const jobLine=document.getElementById('atlas-job-line');if(jobLine)jobLine.textContent=`Lv${n} ${s.job}`;
    const badge=document.querySelector('.dashboard-v72 #atlas-avatar .avatar-job-badge');if(badge)badge.textContent=s.badge;
    const classPill=document.querySelector('.dashboard-v72 .v5-buildbar .class-pill');if(classPill)classPill.textContent=s.classPill;
    const jobPill=document.querySelector('.dashboard-v72 .v5-buildbar .job-pill');if(jobPill)jobPill.textContent=s.jobPill;

    document.documentElement.dataset.classProgressionLevel=String(n);
    document.documentElement.dataset.classProgressionStage=s.id;
    document.documentElement.classList.add('class-progression-synced');
  }

  function refresh(){
    const n=lvl(),bvals=beginner[Math.min(10,n)]||beginner[1],b=Object.fromEntries(bnames.map((x,i)=>[x,bvals[i]])),a=alloc('magician',n),z=alloc('il',n);
    document.querySelectorAll('[data-progress-skill]').forEach(c=>{const name=c.dataset.progressSkill||'',v=Number((b[name]??a[name]??z[name])||0),locked=(first.has(name)&&n<10)||(second.has(name)&&n<30);c.classList.toggle('learned',v>0&&!locked);c.classList.toggle('unlearned',v===0);c.classList.toggle('tier-locked',locked);const s=c.querySelector('.progress-skill-state');if(s)s.textContent=locked?'LOCKED':v>0?'ACTIVE':'0 SP';const small=c.querySelector('small');if(small){const max=small.textContent.match(/\/(\d+)/)?.[1]||(bnames.includes(name)?3:20);small.textContent=`Lv ${v}/${max}`;}});
    syncClassProgression(n);
    document.documentElement.dataset.skillStateLevel=String(n);
  }

  ['level-select','hero-level-select'].forEach(id=>document.getElementById(id)?.addEventListener('change',()=>setTimeout(refresh,260)));
  document.getElementById('level-range')?.addEventListener('input',()=>setTimeout(refresh,260));
  ['level-prev','level-next'].forEach(id=>document.getElementById(id)?.addEventListener('click',()=>setTimeout(refresh,260)));
  setTimeout(refresh,900);
  document.documentElement.classList.add('progression-skill-state-ready');
})();
