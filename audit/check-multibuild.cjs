const fs = require('fs');
const vm = require('vm');

const guideSource = fs.readFileSync('dist/guide-data.js', 'utf8');
const context = {window: {}};
vm.createContext(context);
vm.runInContext(guideSource, context, {filename: 'dist/guide-data.js'});

const root = context.window.GUIDE_DATA;
if (!root?.catalog || !root?.buildVariants) throw new Error('Missing multi-build guide data');

const expected = [
  ['magician-il-fresh', 'magician', 'I/L Wizard Build'],
  ['warrior-fighter', 'warrior', 'Fighter Build'],
  ['archer-hunter', 'bowman', 'Hunter Build']
];

const catalogShape = guide => JSON.stringify({
  classes: guide.catalog.classes.map(({id, status}) => ({id, status})),
  builds: guide.catalog.builds.map(({id, classId, name, status, dataRef}) => ({id, classId, name, status, dataRef}))
});

const sharedCatalog = catalogShape(root);
for (const [name, guide] of Object.entries(root.buildVariants)) {
  if (catalogShape(guide) !== sharedCatalog) throw new Error(`${name} has a divergent build catalog`);
  if (guide.leveling.length !== 70 || guide.skills.length === 0 || guide.gear.length === 0 || guide.quests.length === 0) {
    throw new Error(`${name} is missing a complete progression payload`);
  }
  if (guide.etc.some(row => Number(row['Crafting Need'] || 0) > 0)) {
    throw new Error(`${name} inherited an unrelated I/L crafting reserve`);
  }
}

for (const [id, classId, name] of expected) {
  const build = root.catalog.builds.find(row => row.id === id);
  if (!build || build.classId !== classId || build.name !== name || build.status !== 'active') {
    throw new Error(`Incorrect active build metadata for ${id}`);
  }
}

const bowman = root.catalog.classes.find(row => row.id === 'bowman');
if (bowman?.status !== 'active') throw new Error('Hunter did not activate the Bowman class');

const app = fs.readFileSync('dist/app.js', 'utf8');
for (const token of [
  'window.GUIDE_DATA = D;',
  "new URLSearchParams(location.search).get('build')",
  "const LEGACY_KEY = 'ultimateILGuideState.v1';",
  "${LEGACY_KEY}.${window.TCW_ACTIVE_BUILD_ID}",
  'data-build-select',
  'Open build',
  'AVAILABLE'
]) {
  if (!app.includes(token)) throw new Error(`Missing build-navigation contract: ${token}`);
}

const bootStart = app.indexOf('  let D = window.GUIDE_DATA;');
const bootEnd = app.indexOf('  const defaultGear = {', bootStart);
if (bootStart < 0 || bootEnd < 0) throw new Error('Could not locate selected-guide bootstrap');
const bootstrap = app.slice(bootStart, bootEnd);

function selectedGuide(build) {
  const runtime = {
    window: {GUIDE_DATA: root},
    location: {search: `?build=${build}`},
    URLSearchParams,
    localStorage: {getItem: () => JSON.stringify({activeBuildId: 'magician-il-fresh'})}
  };
  vm.createContext(runtime);
  return vm.runInContext(`(()=>{${bootstrap};return {id:window.TCW_ACTIVE_BUILD_ID,key:KEY,skills:D.skills.length};})()`, runtime);
}

const boots = {
  il: selectedGuide('magician-il-fresh'),
  fighter: selectedGuide('warrior-fighter'),
  hunter: selectedGuide('archer-hunter'),
  planned: selectedGuide('magician-fp-future')
};
if (boots.il.key !== 'ultimateILGuideState.v1' || boots.il.skills !== root.skills.length) {
  throw new Error('I/L bootstrap no longer preserves its established progress key');
}
for (const [name, id] of [['fighter', 'warrior-fighter'], ['hunter', 'archer-hunter']]) {
  const boot = boots[name];
  if (boot.id !== id || boot.key !== `ultimateILGuideState.v1.${id}` || boot.skills !== root.buildVariants[name].skills.length) {
    throw new Error(`${name} bootstrap did not select isolated build data/state`);
  }
}
if (boots.planned.id !== 'magician-il-fresh' || boots.planned.key !== 'ultimateILGuideState.v1') {
  throw new Error('A planned build can still become an active guide');
}

console.log('multi-build-regression-ok');
