const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const output = fs.existsSync('dist/guide-data.js') ? 'dist' : 'site';
const ctx = {window:{}}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(`${output}/guide-data.js`, 'utf8'),ctx);
const root = ctx.window.GUIDE_DATA;
const items = new Map(JSON.parse(fs.readFileSync('audit/fighter-items.json','utf8')).items.map(i=>[Number(i.id),i]));
const slug = s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const variants = [[root,'Magician',4031019,'I/L Mage'],[root.buildVariants.fighter,'Warrior',4031017,'Crusader'],[root.buildVariants.hunter,'Bowman',4031021,'Ranger']];
for(const [D,branch,marbleId,third] of variants) {
  const state={level:100,quests:{},questTown:'all',craftPlans:[],etcHeld:{},etcDone:{},jobPlan:'second'};
  const sandbox={D,state,slug,window:{},etcId:e=>`etc-${e['Item ID']}`};vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync('public/etc-planner-runtime.js','utf8'),sandbox);
  vm.runInContext(fs.readFileSync('public/planning-runtime.js','utf8'),sandbox);
  const run=s=>vm.runInContext(s,sandbox);
  const plan=e=>{sandbox.e=e;return run('etcPlan(e)');};
  const row=id=>D.etc.find(e=>e['Item ID']===id);
  assert.equal(new Set(D.etc.map(e=>e['Item ID'])).size,D.etc.length);
  for(const e of D.etc) {
    assert.equal(e.Item,items.get(e['Item ID']).name,'Canonical item identity');
    for(const use of [...e['Once Uses'],...e['Repeat Uses']]) {
      const q=D.quests.find(q=>q['Quest ID']===use.questId);
      assert.ok(q,`${branch}: material from another build's quest`);
      assert.equal(q.Gather.find(r=>Number(r.id)===e['Item ID']).count,use.count);
      assert.ok(use.job==='Any class'||use.job===branch);
    }
    assert.equal(e['Crafting Need'],0,'Unselected crafts must not reserve stock');
    assert.equal(plan(e).keep,e['Permanent Keep']);
  }
  assert.equal(row(4000033)['Core Quest Need'],600);
  assert.equal(plan(row(4000033)).keep,690);
  assert.equal(plan(row(4000010)).keep,58);
  assert.ok(plan(row(4000010)).repeats.some(u=>u.cadence==='Weekly'&&u.count===100));
  assert.equal(plan(row(4000016)).keep,81,'No handwritten Blue Mushroom craft reserve');
  assert.equal(plan(row(4000000)).keep,3,'Tutorial shellpieces are exact quest items');
  assert.equal(plan(row(4000067)).keep,35,'Regular shellpieces retain their own ID and buffer');
  const marble=row(marbleId);
  assert.equal(plan(marble).keep,30);
  assert.equal(D.etc.filter(e=>e.Item==='Dark Marble').length,1,'Wrong advancement branch leaked');
  state.quests[`quest-${marble['Once Uses'][0].questId}`]=true;
  assert.equal(plan(marble).keep,0,'Completed advancement still reserves items');
  state.quests={};
  const ribbon=row(4000010),use=ribbon['Once Uses'][0],before=plan(ribbon).quest;
  state.quests[`quest-${use.questId}`]=true;
  assert.equal(plan(ribbon).quest,before-use.count,'Quest completion did not lower target');
  assert.ok(plan(ribbon).repeats.length>0,'Recurring demand lost after completion');
  state.quests={};state.questTown='1';
  for(const e of D.etc) for(const u of [...plan(e).once,...plan(e).repeats])
    assert.ok(u.conditions.filter(c=>c.type==='citizenship').every(c=>c.town===1),'Kerning requirements in Henesys plan');
  state.questTown='all';
  for(const recipe of D.etcCraftPlans) {
    state.craftPlans=[recipe.id];
    for(const i of recipe.ingredients) assert.equal(plan(row(i.id)).craft,i.count);
  }
  state.craftPlans=[];
  state.etcHeld['etc-4000033']=700;assert.equal(plan(row(4000033)).left,0);
  sandbox.input={'pig-head':12,'jr-sentinel-shellpiece':99,'etc-4000000':1};
  assert.equal(run('normalizeEtcProgress(input)["etc-4000008"]'),12);
  assert.equal(run('normalizeEtcProgress(input)["etc-4000000"]'),1,'Explicit saved ID must win');
  assert.equal(run('normalizeEtcProgress(input)["etc-4000067"]'),undefined,'Ambiguous names must not transfer stock');
  assert.equal(run('normalizeEtcProgress(input)["jr-sentinel-shellpiece"]'),99,'Legacy progress discarded');
  assert.equal(D.meta.maxLevel,100);assert.equal(D.meta.launchMaxJob,2);assert.equal(D.meta.thirdJobPlanning,true);
  assert.equal(D.futureJob.name,third);assert.equal(D.futureJob.skills.length,7);
  state.jobPlan='third';assert.equal(run('plannedJobName(69)'), '');
  assert.equal(run('plannedJobName(70)'),`${third} · preview`);
  assert.equal(run('plannedJobName(100)'),`${third} · preview`);
  for(let lv=71;lv<=100;lv++) {
    assert.equal(D.leveling.find(r=>r.Lv===lv)['Planning Only'],true);
    const s=D.skills.find(r=>r.Level===lv);assert.equal(s['Planning Only'],true);
    assert.ok(!/\+\d/.test(s.Spend),'Unverified SP allocation invented');
  }
  const checkpoint=D.apPlan.at(-2),future=D.apPlan.at(-1);
  for(const key of ['Base STR Target','Base DEX Target','Base LUK Target'])assert.equal(future[key],checkpoint[key]);
}
assert.equal(root.quests.filter(q=>q.Conditions.some(r=>r.type==='citizenship')).length,86);
const html=fs.readFileSync(`${output}/index.html`,'utf8'),app=fs.readFileSync(`${output}/app.js`,'utf8');
assert.ok(html.includes('id="hero-build-title"'),'Class build title hook missing');
assert.ok(/id="level-range"[^>]*max="100"/.test(html));
assert.ok(app.includes('function renderDashboard(){\n    updateBuildCopy();\n    renderPlanningControls();'));
console.log('etc-regression-ok: class IDs, remaining quantities, town conditions, optional crafts, migration, and level 100 planning');
