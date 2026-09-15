module.exports = function(app) {
  const normalizeNeedle = "      targetUpgrade:raw.targetUpgrade||'auto',\n      gear";
  const normalizeReplacement = "      targetUpgrade:raw.targetUpgrade||'auto',\n      gender:raw.gender==='female'?'female':raw.gender==='male'?'male':'',\n      gear";
  if (!app.includes(normalizeNeedle)) throw new Error('session gender state target missing');
  app = app.replace(normalizeNeedle, normalizeReplacement);

  const progressPattern = /  function hasMeaningfulProgress\(s=state\)\{\n    return [\s\S]*?\n  \}/;
  if (!progressPattern.test(app)) throw new Error('session progress target missing');
  app = app.replace(progressPattern, `  function hasMeaningfulProgress(s=state){
    return s.gender==='male' || s.gender==='female' || Number(s.level)>1 || s.page!=='dashboard' || s.skillTab!=='auto' || s.targetUpgrade!=='auto' || Object.values(s.quests||{}).some(Boolean) || Object.values(s.skills||{}).some(Boolean) || Object.values(s.etcHeld||{}).some(v=>Number(v)>0) || Object.values(s.etcDone||{}).some(Boolean) || Object.values(s.levelChecks||{}).some(Boolean) || Object.values(s.gear||{}).some(v=>v&&v!=='None');
  }`);

  const stateNeedle = '  let state = loadState();';
  if (!app.includes(stateNeedle)) throw new Error('session state initialization target missing');
  const sessionCode = String.raw`  const SESSION_MODAL_IDS=['session-entry-modal','session-reset-modal','session-gender-modal'];
  let sessionEntryStarted=false;
  let sessionEntryReady=false;
  let sessionLastFocus=null;
  function sessionBuildName(){return activeBuild()?.name||'this build';}
  function sessionFlowSuppressed(){
    const params=new URLSearchParams(location.search);
    return ['ci','qa','test','avatar-parity','skill-stability'].some(key=>params.has(key));
  }
  function sessionModal(id){return document.getElementById(id);}
  function closeSessionModal(id){
    const node=sessionModal(id);if(!node)return;
    node.classList.remove('open');node.setAttribute('aria-hidden','true');
    if(!document.querySelector('.session-modal.open')){
      document.body.classList.remove('session-modal-open');
      if(sessionLastFocus&&typeof sessionLastFocus.focus==='function')sessionLastFocus.focus();
    }
  }
  function openSessionModal(id){
    const node=sessionModal(id);if(!node)return;
    sessionLastFocus=document.activeElement;
    SESSION_MODAL_IDS.filter(other=>other!==id).forEach(closeSessionModal);
    node.classList.add('open');node.setAttribute('aria-hidden','false');document.body.classList.add('session-modal-open');
    const first=node.querySelector('button:not([disabled])');
    if(first)setTimeout(()=>first.focus(),0);
  }
  function showResumeDialog(){
    const name=sessionBuildName();
    const copy=document.getElementById('session-entry-copy');
    const note=document.getElementById('session-entry-note');
    if(copy)copy.textContent='We found saved progress for '+name+'. Continue where you left off, or reset this build and start fresh.';
    if(note)note.textContent=state.gender?'Saved on this browser · '+state.gender+' avatar selected.':'This build still needs a character choice before equipment can be filtered.';
    openSessionModal('session-entry-modal');
  }
  function showResetDialog(){
    const copy=document.getElementById('session-reset-copy');
    if(copy)copy.textContent='Resetting '+sessionBuildName()+' permanently clears its saved progress on this browser.';
    openSessionModal('session-reset-modal');
  }
  function showGenderDialog(){
    const copy=document.getElementById('session-gender-copy');
    if(copy)copy.textContent='Choose the character body for '+sessionBuildName()+'. This choice controls gender-locked equipment and the avatar preview.';
    openSessionModal('session-gender-modal');
  }
  function resetCurrentBuild(){
    const buildId=window.TCW_ACTIVE_BUILD_ID||state.activeBuildId||D.catalog?.activeBuildId||'magician-il-fresh';
    localStorage.removeItem(KEY);localStorage.removeItem(STATE_UPDATED_KEY);
    state=normalizeState({level:1,page:'dashboard',activeBuildId:buildId,quests:{},skills:{},etcHeld:{},etcDone:{},levelChecks:{},skillTab:'auto',targetUpgrade:'auto',gear:{...defaultGear},gender:''});
    save();renderAll();closeSessionModal('session-reset-modal');showGenderDialog();toast(sessionBuildName()+' reset · choose an avatar gender');
  }
  function chooseSessionGender(gender){
    if(gender!=='male'&&gender!=='female')return;
    const incompatible=Object.entries(state.gear||{}).filter(([slot,name])=>name&&name!=='None'&&!genderGearItemAllowed(getGear(name),gender)).map(([slot])=>slot);
    state.gender=gender;
    sanitizeGearState();
    save();renderAll();closeSessionModal('session-gender-modal');
    toast((gender==='male'?'Male avatar selected':'Female avatar selected')+(incompatible.length?' · '+incompatible.length+' incompatible slot'+(incompatible.length===1?'':'s')+' cleared':''));
  }
  function continueSession(){
    closeSessionModal('session-entry-modal');
    if(state.gender==='male'||state.gender==='female')return;
    showGenderDialog();
  }
  function startSessionFlow(){
    if(!sessionEntryReady||sessionFlowSuppressed()||document.querySelector('.session-modal.open'))return;
    if(hasMeaningfulProgress(state))showResumeDialog();else showGenderDialog();
  }
  function startSessionEntry(){
    if(sessionEntryStarted)return;
    sessionEntryStarted=true;startSessionFlow();
  }
  function afterSessionHydration(){sessionEntryReady=true;startSessionFlow();}
  document.getElementById('session-continue')?.addEventListener('click',continueSession);
  document.getElementById('session-reset')?.addEventListener('click',showResetDialog);
  document.getElementById('session-reset-cancel')?.addEventListener('click',()=>{closeSessionModal('session-reset-modal');showResumeDialog();});
  document.getElementById('session-reset-confirm')?.addEventListener('click',resetCurrentBuild);
  document.querySelectorAll('[data-session-gender]').forEach(button=>button.addEventListener('click',()=>chooseSessionGender(button.dataset.sessionGender)));
  window.TCW_SESSION_ENTRY={start:startSessionEntry,afterHydration:afterSessionHydration,requestReset:showResetDialog};
`;
  app = app.replace(stateNeedle, stateNeedle+'\n'+sessionCode);

  const escapeNeedle = "    if(e.key!=='Escape') return;\n    const modal=document.getElementById('gear-modal');";
  if (!app.includes(escapeNeedle)) throw new Error('session escape target missing');
  app = app.replace(escapeNeedle, "    if(e.key!=='Escape') return;\n    if(document.querySelector('.session-modal.open')){e.preventDefault();return;}\n    const modal=document.getElementById('gear-modal');");

  const resetNeedle = "  document.getElementById('reset-progress')?.addEventListener('click',()=>{\n    if(confirm('Reset level, quests, ETC counts and equipped build on this browser?')){localStorage.removeItem(KEY);localStorage.removeItem(STATE_UPDATED_KEY);state=loadState();save();renderAll();toast('Local progress reset');}\n  });";
  if (!app.includes(resetNeedle)) throw new Error('settings reset target missing');
  app = app.replace(resetNeedle, "  document.getElementById('reset-progress')?.addEventListener('click',()=>window.TCW_SESSION_ENTRY?.requestReset?.());");

  const genderNeedle = "  function classGearItemAllowed(item){\n    const evidence=String(item&& (item['Evidence Class']||item.Status) || 'CURRENT');\n    if(item&&item.Item!=='None'&&!/CURRENT/i.test(evidence))return false;\n    if(!item||item.Item==='None')return true;";
  const genderReplacement = `  function itemGender(item){
    const raw=item?.Gender??item?.gender??item?.['Req Gender']??'';
    const value=String(raw).trim().toLowerCase();
    if(/female|^f$/.test(value))return'female';
    if(/male|^m$/.test(value))return'male';
    return'unisex';
  }
  function itemGenderLabel(item){
    const gender=itemGender(item);
    return gender==='female'?'Female only':gender==='male'?'Male only':'';
  }
  function genderGearItemAllowed(item,selectedGender=state.gender){
    if(!item||item.Item==='None')return true;
    const gender=itemGender(item);
    return !selectedGender||gender==='unisex'||gender===selectedGender;
  }
  function classGearItemAllowed(item){
    const evidence=String(item&& (item['Evidence Class']||item.Status) || 'CURRENT');
    if(item&&item.Item!=='None'&&!/CURRENT/i.test(evidence))return false;
    if(!item||item.Item==='None')return true;
    if(!genderGearItemAllowed(item))return false;`;
  if (!app.includes(genderNeedle)) throw new Error('gear gender target missing');
  app = app.replace(genderNeedle, genderReplacement);

  const sanitizeNeedle = "      if(!item || ((id==='warrior-fighter'||id==='archer-hunter')&&!classGearItemAllowed(item))) state.gear[slot]='None';";
  const sanitizeReplacement = "      if(!item || !genderGearItemAllowed(item) || ((id==='warrior-fighter'||id==='archer-hunter')&&!classGearItemAllowed(item))) state.gear[slot]='None';";
  if (!app.includes(sanitizeNeedle)) throw new Error('gear sanitize gender target missing');
  app = app.replace(sanitizeNeedle, sanitizeReplacement);

  const metaNeedle = "    const stat=id==='warrior-fighter'?`STR ${item['Req STR']||0} · DEX ${item['Req DEX']||0}`:id==='archer-hunter'?`STR ${item['Req STR']||0} · DEX ${item['Req DEX']||0}`:'';\n    return [`Lv ${item['Req Lv']||0}`,job,stat].filter(Boolean).join(' · ');";
  const metaReplacement = "    const stat=id==='warrior-fighter'?`STR ${item['Req STR']||0} · DEX ${item['Req DEX']||0}`:id==='archer-hunter'?`STR ${item['Req STR']||0} · DEX ${item['Req DEX']||0}`:'';\n    const gender=itemGenderLabel(item);\n    return [`Lv ${item['Req Lv']||0}`,job,stat,gender].filter(Boolean).join(' · ');";
  if (!app.includes(metaNeedle)) throw new Error('gear metadata gender target missing');
  app = app.replace(metaNeedle, metaReplacement);

  const summaryNeedle = "      const profile=activeBuild()||{}, branch=profile.shortName||'Class';\n      summary.textContent=`${branch} equipment · Level ${state.level} · ${futureCount} future-level item${futureCount===1?'':'s'} ${showFuture?'shown':'hidden'} · ${Math.max(0,beforeLevelFilter-1)} class-matched option${beforeLevelFilter-1===1?'':'s'}`;";
  const summaryReplacement = "      const profile=activeBuild()||{}, branch=profile.shortName||'Class', gender=state.gender?state.gender[0].toUpperCase()+state.gender.slice(1):'all genders';\n      summary.textContent=`${branch} equipment · ${gender} · Level ${state.level} · ${futureCount} future-level item${futureCount===1?'':'s'} ${showFuture?'shown':'hidden'} · ${Math.max(0,beforeLevelFilter-1)} compatible option${beforeLevelFilter-1===1?'':'s'}`;";
  if (!app.includes(summaryNeedle)) throw new Error('gear summary gender target missing');
  app = app.replace(summaryNeedle, summaryReplacement);

  const filterNeedle = "    const future=document.getElementById('modal-future-label'), optional=document.getElementById('modal-optional-label');\n    if(future)future.textContent='Show future-level '+branch+' items';\n    if(optional)optional.textContent='Show all curated '+branch+' options';";
  const filterReplacement = "    const future=document.getElementById('modal-future-label'), optional=document.getElementById('modal-optional-label'), gender=document.getElementById('modal-gender-label');\n    if(future)future.textContent='Show future-level '+branch+' items';\n    if(optional)optional.textContent='Show all curated '+branch+' options';\n    if(gender){gender.textContent=state.gender?(state.gender==='female'?'FEMALE EQUIPMENT':'MALE EQUIPMENT'):'CHOOSE GENDER';gender.dataset.gender=state.gender||'unset';}";
  if (!app.includes(filterNeedle)) throw new Error('gear filter gender target missing');
  app = app.replace(filterNeedle, filterReplacement);

  const hydrationNeedle = '  hydrateLauncherState();';
  if (!app.includes(hydrationNeedle)) throw new Error('session hydration target missing');
  app = app.replace(hydrationNeedle, "  window.TCW_SESSION_ENTRY?.start();\n  hydrateLauncherState().finally(()=>window.TCW_SESSION_ENTRY?.afterHydration?.());");

  return app;
};
