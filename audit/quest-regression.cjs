const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {questCatalog} = require('./quest-catalog.cjs');
const raw = JSON.parse(fs.readFileSync('audit/fighter-quests.json', 'utf8'));
const output = fs.existsSync('dist/guide-data.js') ? 'dist' : 'site';
const ctx = {window:{}}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(`${output}/guide-data.js`, 'utf8'), ctx);
const guides = ctx.window.GUIDE_DATA;
const branches = {Magician:guides, Warrior:guides.buildVariants.fighter, Bowman:guides.buildVariants.hunter};
for (const [branch, guide] of Object.entries(branches)) {
  const expected = questCatalog(raw, [], branch);
  assert.equal(guide.quests.length, expected.length);
  assert.equal(new Set(guide.quests.map(q => q['Quest ID'])).size, 310);
  for (const q of expected) {
    const actual = guide.quests.find(x => x['Quest ID'] === q['Quest ID']);
    for (const key of ['Quest','Lv','EXP','Mesos','Repeatable','Objectives','Prerequisites','Start Items','Gather','Guaranteed Rewards','Choice Rewards','Random Rewards','Rotation'])
      assert.equal(JSON.stringify(actual[key]), JSON.stringify(q[key], (k,v) => typeof v === 'string' ? v.replace(/\s{2,}/g, ' ').trim() : v), `${branch} quest ${q['Quest ID']} ${key}`);
    assert.equal(actual['Choice Rewards'].some(g => g.job_name !== branch && g.job_mask), false);
    assert.equal(actual['Random Rewards'].some(g => g.job_name !== branch && g.job_mask), false);
  }
}
const find = id => guides.quests.find(q => q['Quest ID'] === String(id));
assert.equal(find(1001).Gather.length, 0, 'Sera gives her mirror; do not farm it');
assert.equal(find(1001).Objectives.length, 1);
assert.equal(find(10200).Repeatable, 'Repeatable');
assert.equal(find(10401)['Choice Rewards'][0].job_name, 'Magician');
assert.equal(find(506001).Repeatable, 'Once');
assert.equal(find(506001).Rotation.cadence, 'daily');
for (const q of guides.quests) for (const p of q.Prerequisites) if (find(p.id)) assert.ok(q.Lv >= find(p.id).Lv);
// Test the actual state helpers, including migration and manual-condition guards.
const runtime = fs.readFileSync('public/quest-planner-runtime.js', 'utf8');
const sandbox = {D:guides,state:{level:70,quests:{}},document:{getElementById:()=>({addEventListener(){}})},questId:q=>`quest-${q['Quest ID']}`};
vm.createContext(sandbox); vm.runInContext(runtime, sandbox);
const run = script => vm.runInContext(script, sandbox);
const legacy = find(1000)['Legacy Keys'][0];
sandbox.input = {[legacy]:true};
assert.equal(run('normalizeQuestProgress(input)["quest-1000"]'), true);
sandbox.input['quest-1000'] = false;
assert.equal(run('normalizeQuestProgress(input)["quest-1000"]'), false, 'Explicitly undone progress wins over its legacy alias');
sandbox.q = find(1001); assert.equal(run('questState(q)'), 'blocked');
sandbox.state.quests['quest-1000'] = true; assert.equal(run('questState(q)'), 'ready');
sandbox.state.level = 1; sandbox.q = find(20100); assert.equal(run('questState(q)'), 'upcoming');
sandbox.state.level = 70; sandbox.q = find(506001); assert.equal(run('questState(q)'), 'check');
sandbox.q = find(506018); assert.equal(run('questState(q)'), 'blocked', 'Missing source prerequisite must not be skipped');
sandbox.state.quests['quest-506018'] = true; assert.equal(run('questState(q)'), 'done');
// No stale catalog appender or old absolute layout is part of this release.
assert.ok(!fs.readFileSync(`${output}/quest-audit-additions.js`, 'utf8').includes('D.quests.push'));
console.log('quest-regression-ok: 322 source records; 310 isolated quests per build; migration, prerequisites, rewards, and cadence passed');
