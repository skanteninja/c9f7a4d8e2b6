(() => {
  const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const branches=[
    ['Warrior','Fighter','Crusader','Hero'],['Warrior','Page','White Knight','Paladin'],['Warrior','Spearman','Dragon Knight','Dark Knight'],
    ['Magician','F/P Wizard','F/P Mage','F/P Arch Mage'],['Magician','I/L Wizard','I/L Mage','I/L Arch Mage'],['Magician','Cleric','Priest','Bishop'],
    ['Archer','Hunter','Ranger','Bowmaster'],['Archer','Crossbowman','Sniper','Marksman'],
    ['Rogue','Assassin','Hermit','Night Lord'],['Rogue','Bandit','Chief Bandit','Shadower'],
    ['Pirate','Brawler','Marauder','Buccaneer'],['Pirate','Gunslinger','Outlaw','Corsair'],
    ['Noblesse','Dawn Warrior'],['Noblesse','Blaze Wizard'],['Noblesse','Wind Archer'],['Noblesse','Night Walker'],['Noblesse','Thunder Breaker'],['Legend','Aran']
  ];
  const aliases={'thief':'rogue','bowman':'archer','fire poison wizard':'f p wizard','wizard fire poison':'f p wizard','wizard f p':'f p wizard','fire poison':'f p wizard','ice lightning wizard':'i l wizard','wizard ice lightning':'i l wizard','wizard i l':'i l wizard','ice lightning':'i l wizard','fire poison mage':'f p mage','ice lightning mage':'i l mage','arch mage fire poison':'f p arch mage','arch mage ice lightning':'i l arch mage','crossbow man':'crossbowman','dragonknight':'dragon knight'};
  const names=[...new Set(branches.flat())].map(norm);
  const terms=[...new Set([...names,...Object.keys(aliases)])].sort((a,b)=>b.length-a.length);
  function parse(query){let text=norm(query);for(const term of terms){const padded=' '+text+' ';if(padded.includes(' '+term+' '))return {job:aliases[term]||term,text:padded.replace(' '+term+' ',' ').trim()};}return {job:null,text};}
  function family(job){return branches.find(b=>b.map(norm).includes(job))?.[0];}
  function eligible(row,job){
    const paths=branches.filter(b=>b.map(norm).includes(job));
    const allowed=new Set(paths.flatMap(b=>norm(b[0])===job?b:b.slice(0,b.map(norm).indexOf(job)+1)).map(norm));
    const cls=norm(row.class_name||row.class||row.job_name||'');
    if(cls&&names.includes(cls))return allowed.has(cls);
    const label=norm(row.req_job_label||row.job||'');
    if(names.includes(label))return allowed.has(label);
    if(row.req_job_label!=null){if(/^(all|all jobs|any)$/.test(label))return true;return label.split(' ').includes(norm(family(job)))||(family(job)==='Rogue'&&label.includes('thief'));}
    const mask=row.stats?.reqJob??row.reqJob;
    if(mask!=null){const bit={Warrior:1,Magician:2,Archer:4,Rogue:8,Pirate:16}[family(job)];return Number(mask)===0||Boolean(bit&&(Number(mask)&bit));}
    return false;
  }
  window.TCW_JOB_SEARCH={parse,eligible,matches(row,query){const p=parse(query);return (!p.job||eligible(row,p.job))&&(!p.text||norm(JSON.stringify(row)).includes(p.text));}};
})();
