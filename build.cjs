const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = __dirname;
const source = path.join(root, 'public');
const runtime = path.join(source, 'assets', 'runtime');
const repairs = path.join(source, 'repairs');
const out = path.join(root, 'dist');
const assetVersion = '0.8.8-build-crosscheck';
const BRAND = 'Top Classic World Maplestory';

function retainedMapIndex() {
  const audit = JSON.parse(fs.readFileSync(path.join(root, 'public', 'map-audit.json'), 'utf8'));
  return new Map((audit.records || [])
    .filter(row => row.status === 'kept' && row.name)
    .map(row => [String(row.id), row]));
}

const currentMapIndex = retainedMapIndex();

function routeBlock(start, end, mapIds, monsters, method) {
  const maps = mapIds.map(id => {
    const row = currentMapIndex.get(String(id));
    if (!row) throw new Error(`Build route references a non-retained map: ${id}`);
    return row;
  });
  return [start, end, maps.map(row => row.name).join(' / '), monsters, method];
}

function secondJobPlan(startLevel, endLevel, phases) {
  const work = phases.map(phase => ({...phase, points: Number(phase.points)}));
  const totals = Object.fromEntries(work.map(phase => [phase.label, 0]));
  const rows = [];
  let phaseIndex = 0;
  for (let level = startLevel; level <= endLevel; level++) {
    let pointsLeft = 3;
    const spend = [];
    while (pointsLeft > 0 && phaseIndex < work.length) {
      const phase = work[phaseIndex];
      const take = Math.min(pointsLeft, phase.points);
      spend.push(`${phase.name} +${take}`);
      totals[phase.label] += take;
      phase.points -= take;
      pointsLeft -= take;
      if (phase.points === 0) phaseIndex++;
    }
    if (pointsLeft) throw new Error(`Second-job plan did not consume all SP at level ${level}`);
    const result = Object.entries(totals)
      .filter(([, value]) => value > 0)
      .map(([label, value]) => `${label} ${value}`)
      .join(' | ');
    rows.push([level, spend.join(', '), result]);
  }
  if (phaseIndex < work.length || work.some(phase => phase.points > 0)) {
    throw new Error('Second-job plan has unspent SP phases');
  }
  return rows;
}

function fighterVariant(base) {
  const skillsAudit = JSON.parse(fs.readFileSync(path.join(root, 'audit', 'fighter-skills.json'), 'utf8'));
  const itemAudit = JSON.parse(fs.readFileSync(path.join(root, 'audit', 'fighter-items.json'), 'utf8'));
  const questAudit = JSON.parse(fs.readFileSync(path.join(root, 'audit', 'fighter-quests.json'), 'utf8'));
  const monsterAudit = JSON.parse(fs.readFileSync(path.join(root, 'audit', 'fighter-monsters.json'), 'utf8'));
  const craftingAudit = JSON.parse(fs.readFileSync(path.join(root, 'audit', 'fighter-crafting.json'), 'utf8'));
  const skillGroups = [...(skillsAudit.warrior || []), ...(skillsAudit.beginner || [])];
  const allSkills = skillGroups.flatMap(group => group.skills || []);
  const skillIcons = Object.fromEntries(allSkills.map(skill => [skill.name, {
    id: skill.id, max: skill.max_level, role: skill.passive ? 'Passive' : (skill.mechanics?.label || 'Combat skill'),
    desc: String(skill.description || '').replace(/\s+/g, ' ').trim()
  }]));
  const steps = [
    [10, 'Power Strike +1', 'PS 1 | SB 0 | Precise 0 | IHP 0 | MHP 0'],
    [11, 'Power Strike +2, Slash Blast +1', 'PS 3 | SB 1 | Precise 0 | IHP 0 | MHP 0'],
    [12, 'Power Strike +1, Slash Blast +2', 'PS 4 | SB 3 | Precise 0 | IHP 0 | MHP 0'],
    [13, 'Slash Blast +1, Precise Strikes +2', 'PS 4 | SB 4 | Precise 2 | IHP 0 | MHP 0'],
    [14, 'Precise Strikes +3', 'PS 4 | SB 4 | Precise 5 | IHP 0 | MHP 0'],
    [15, 'Power Strike +3', 'PS 7 | SB 4 | Precise 5 | IHP 0 | MHP 0'],
    [16, 'Power Strike +3', 'PS 10 | SB 4 | Precise 5 | IHP 0 | MHP 0'],
    [17, 'Power Strike +3', 'PS 13 | SB 4 | Precise 5 | IHP 0 | MHP 0'],
    [18, 'Power Strike +3', 'PS 16 | SB 4 | Precise 5 | IHP 0 | MHP 0'],
    [19, 'Power Strike +3', 'PS 19 | SB 4 | Precise 5 | IHP 0 | MHP 0'],
    [20, 'Power Strike +1, Slash Blast +2', 'PS 20 | SB 6 | Precise 5 | IHP 0 | MHP 0'],
    [21, 'Slash Blast +3', 'PS 20 | SB 9 | Precise 5 | IHP 0 | MHP 0'],
    [22, 'Slash Blast +3', 'PS 20 | SB 12 | Precise 5 | IHP 0 | MHP 0'],
    [23, 'Slash Blast +3', 'PS 20 | SB 15 | Precise 5 | IHP 0 | MHP 0'],
    [24, 'Slash Blast +3', 'PS 20 | SB 18 | Precise 5 | IHP 0 | MHP 0'],
    [25, 'Slash Blast +2, Precise Strikes +1', 'PS 20 | SB 20 | Precise 6 | IHP 0 | MHP 0'],
    [26, 'Precise Strikes +3', 'PS 20 | SB 20 | Precise 9 | IHP 0 | MHP 0'],
    [27, 'Precise Strikes +3', 'PS 20 | SB 20 | Precise 12 | IHP 0 | MHP 0'],
    [28, 'Precise Strikes +3', 'PS 20 | SB 20 | Precise 15 | IHP 0 | MHP 0'],
    [29, 'Improved HP Recovery +3', 'PS 20 | SB 20 | Precise 15 | IHP 3 | MHP 0'],
    [30, 'Max HP Increase +3', 'PS 20 | SB 20 | Precise 15 | IHP 3 | MHP 3']
  ];
  const second = secondJobPlan(31, 70, [
    {name:'Sword Mastery', label:'SM', points:5},
    {name:'Sword Booster', label:'SB', points:1},
    {name:'Final Attack: Sword', label:'FA', points:1},
    {name:'Rush', label:'Rush', points:1},
    {name:'Sword Mastery', label:'SM', points:15},
    {name:'Rush', label:'Rush', points:9},
    {name:'Rage', label:'Rage', points:30},
    {name:'Rush', label:'Rush', points:10},
    {name:'Final Attack: Sword', label:'FA', points:29},
    {name:'Sword Booster', label:'SB', points:19}
  ]);
  const skills = [...steps, ...second].map(([level, spend, result], i) => ({
    Level: level, SP: level === 10 ? 1 : 3, Spend: spend,
    'Why This Is The Action': level < 30 ? 'Current Classic Warrior first-job route: build Power Strike and Slash Blast, finish Precise Strikes, then take the delayed HP breakpoints.' : 'Cross-checked one-handed sword Fighter route: satisfy Mastery prerequisites, add Booster, Final Attack, and Rush, then finish Mastery, Rush, Rage, Final Attack, and Booster.',
    'Meso / MP Logic': 'Use the skill when its target is met; preserve potions and avoid spending on a skill that does not improve the current route.',
    Status: 'Classic beta / verify at launch', 'Result After Level': result || 'Fighter progression checkpoint', 'Evidence Class': 'CURRENT / VERIFY'
  }));
  const warriorItems = (itemAudit.items || []).filter(item => {
    const stats = item.stats || {};
    return item.category === 'Equipment' && (item.req_job_label === 'Warrior' || (Number(stats.reqJob || 0) & 1) || ['1H Sword','2H Sword','1H Axe','2H Axe','1H Blunt Weapon','2H Blunt Weapon','Spear','Polearm'].includes(item.weapon_type));
  });
  const slotFor = item => ({Cap:'Hat',Coat:'Overall',Longcoat:'Overall',Pants:'Bottom',Shoes:'Shoes',Glove:'Gloves',Shield:'Shield',Cape:'Cape',Ring:'Ring',Accessory:'Earrings',Weapon:'Weapon'})[item.sub_category] || (item.sub_category === 'Weapon' ? 'Weapon' : 'Any');
  const gear = [{Item:'None',Slot:'Any','Item ID':0,'Icon URL':'',STR:0,DEX:0,INT:0,LUK:0,'W.ATK':0,'M.ATK':0,'WDEF':0,'MDEF':0,'Crit%':0,'Crit DMG':0,Speed:0,Jump:0,'Req Lv':0,'Req STR':0,'Req DEX':0,'Req LUK':0,Status:'CURRENT / VERIFY','Class Fit':'Any',Plan:'EMPTY',Priority:'—',Notes:'Empty slot','Highly Recommended':false,'Recommendation Reason':'','Evidence Class':'CURRENT / VERIFY'}, ...warriorItems.map(item => {
    const s = item.stats || {};
    return {Item:item.name, Slot:item.sub_category === 'Weapon' ? 'Weapon' : slotFor(item), 'Item ID':item.id, 'Icon URL':`/game-media/items/primary/${item.id}`, STR:s.incSTR||0, DEX:s.incDEX||0, INT:s.incINT||0, LUK:s.incLUK||0, 'W.ATK':s.incPAD||0, 'M.ATK':s.incMAD||0, 'WDEF':s.incPDD||0, 'MDEF':s.incMDD||0, 'Crit%':s.incCritRate||0, 'Crit DMG':s.incCritDamage||0, Speed:s.incSpeed||0, Jump:s.incJump||0, 'Req Lv':s.reqLevel||0, 'Req STR':s.reqSTR||0, 'Req DEX':s.reqDEX||0, 'Req LUK':s.reqLUK||0, 'Status':'CURRENT / VERIFY', 'Class Fit':'Warrior', Plan:'OPTIONAL', Priority:'Use at the relevant level or when it creates a real damage/accuracy breakpoint', Notes:item.weapon_type ? `${item.weapon_type} · ${item.attack_speed_label || ''}` : 'Classic Warrior equipment option', 'Highly Recommended':false, 'Recommendation Reason':'', 'Evidence Class':'CURRENT / VERIFY'};
  })];
  const weaponRows = gear.filter(x=>x.Slot==='Weapon').map(x=>({Lv:x['Req Lv']||1, Weapon:x.Item, Type:x['Item ID'], 'Weapon Type':'Warrior weapon', 'Why':x.Notes}));
  const routeBlocks = [
    routeBlock(1, 9, [50, 1004, 1005], 'Snail / Blue Snail / Shroom', 'Beginner route through the retained Maple Island layouts; leave when the Warrior advancement is ready.'),
    routeBlock(10, 12, [10001021, 10001070, 10001010], 'Slime / Orange Mushroom / Pig', 'Use Power Strike on safe single targets while completing the Warrior advancement and Henesys citizenship preparation.'),
    routeBlock(13, 15, [10002031, 10000010], 'Green Mushroom / Slime / Blue Snail', 'Use Power Strike for single targets and Slash Blast when three or more mobs are grouped.'),
    routeBlock(16, 20, [10002075, 10002033], 'Green Mushroom / Slime / Horny Mushroom', 'Keep the hit-rate check ahead of the map switch; use the attack that matches the pack size.'),
    routeBlock(21, 25, [10005070, 10005060, 10003061], 'Evil Eye / Zombie Mushroom / Bubbling', 'Ant Tunnel Park, Ant Tunnel I, and Line 1 are retained Classic checkpoints; do not force a map that misses.'),
    routeBlock(26, 30, [10004091, 10005061, 10003062], 'Wild Boar / Iron Hog / Zombie Mushroom / Stirge', 'Finish the first-job targets, prepare the level-30 weapon breakpoint, and take Fighter in Perion.'),
    routeBlock(31, 35, [10004041, 10004091, 10002080], 'Wild Boar / Iron Hog / Curse Eye', 'Start the sword route with Mastery and the early prerequisite skills; switch when the map or hit-rate breakpoint is real.'),
    routeBlock(36, 40, [10006060, 10003097, 10002024], 'Glowshroom / Raffle / Curse Eye / Zombie Lupin', 'Use Rush for map control and keep the route inside retained Victoria layouts.'),
    routeBlock(41, 45, [10007020, 10006070, 10006080], 'Lorang / Lupin / Zombie Lupin / higher-level Forgotten mobs', 'Use the safer Lorang or Forgotten route until the next sword and accuracy checkpoint is met.'),
    routeBlock(46, 50, [10003067, 10005075, 10006071], 'Jr. Wraith / Wraith / Drake', 'Line 2 <Area 2> is the level-gated accuracy check; Drake and Forgotten Dungeon Tunnel are alternatives for parties.'),
    routeBlock(51, 60, [10005075, 10006070, 10006020], 'Drake / Raffle / Rafflesia / Sporewood', 'Prioritize maps where the current weapon kills reliably; use Drake drops and the Forgotten route for gear funding.'),
    routeBlock(61, 70, [10006080, 10006031, 10006071], 'Rafflesia / Sporewood / Rotten Mushroom / Tauromacis', 'Finish the level-70 Fighter range on retained Classic layouts; Ludibrium and Leafre are intentionally not named because they are not in the retained atlas.')
  ];
  const leveling = Array.from({length:70},(_,i)=>{const lv=i+1,b=routeBlocks.find(x=>lv>=x[0]&&lv<=x[1]);return {Lv:lv,Job:lv<10?'Beginner':lv<30?'Warrior':'Fighter','Primary Route':b[2],'Main Monsters':b[3],'Fighter Method':b[4],'Alternative':'Use the nearest safer route with a confirmed layout','Quest / PQ Tie-In':lv<30?'Maple Island and Victoria quest chains':'Fighter advancement and class-appropriate quest chains','Gear Hunt Tie-In':lv<10?'Use Maple Island rewards':`Use the ${lv < 40 ? 'sword and shield' : 'current weapon'} checkpoint`,'SAVE ETC / ITEM NOW':'Bank active quest materials only','Target Qty':'As required by the active quest','Priority / Used For':'Route and quest progression','When You Can Stop Saving':'After the active quest chain is complete','Confidence':'CURRENT / VERIFY','Evidence Class':'CURRENT / VERIFY'};});
  const apPlan=[
    ['1–10','ALL STR',57,5,'Maple Island weapon',0,'Current Classic Warrior sample: keep the starting 5 DEX and put level-up AP into STR.'],
    ['11–12','+4 STR / +1 DEX each level',65,7,'Level-appropriate sword',0,'Use DEX only for the accuracy and weapon breakpoint shown by the current Warrior guide.'],
    ['13–14','+3 STR / +2 DEX each level',71,11,'Level-appropriate sword',0,'The extra DEX is a breakpoint tool, not a first-job advancement requirement.'],
    ['15','+4 STR / +1 DEX',75,12,'Level 15 sword or axe',10,'Keep the current accuracy target while preserving STR damage.'],
    ['16–19','+4 STR / +1 DEX each level',91,16,'Level 20 weapon checkpoint',15,'Follow the verified sample until the next real accuracy or equipment breakpoint.'],
    ['20','+3 STR / +2 DEX',94,18,'Level 20 weapon',20,'Reach the current Classic sample’s level-20 accuracy breakpoint.'],
    ['21–25','+4 STR / +1 DEX each level',114,23,'Level 25 weapon',25,'Keep the base DEX close to the current sample; equipment can cover part of the requirement.'],
    ['26–29','+4 STR / +1 DEX each level',130,27,'Level 30 weapon',30,'Build toward 30 total DEX with gear rather than over-investing permanent AP.'],
    ['30','+5 STR',135,27,'Gladius / Blue Axe / level-30 sword route',30,'Current level-30 sample is 135 STR / 27 base DEX, with gear supplying the remaining DEX.' ],
    ['31–70','STR first; DEX only for verified accuracy or equipment breakpoints','135+','27+','One-handed sword + shield', '30+','Keep the safer sword route’s hit rate current; use gear, scrolls, and potions before permanent AP when practical.']
  ].map(x=>({'Level Range':x[0],'AP Action':x[1],'Base STR Target':x[2],'Base DEX Target':x[3],'Weapon Target':x[4],'Weapon DEX Req':x[5],'Effective DEX Plan':x[6],'Scroll Plan':'Prefer safe 100%/60% upgrades; do not gamble early progression gear','Why':x[6],'Status':'Classic beta / verify at launch','Evidence Class':'CURRENT / VERIFY'}));
  const classes = base.catalog.classes.map(c=>c.id==='warrior'?{...c,status:'active'}:c);
  const builds = base.catalog.builds.map(b=>b.id==='magician-il-fresh'?{...b,name:'I/L Wizard Build'}:b.id==='warrior-future'?{...b,id:'warrior-fighter',name:'Fighter Build',shortName:'Fighter',subtitle:'Sword-focused Warrior progression',levelMin:1,levelMax:70,status:'active',tags:['Warrior','Fighter','Level 1–70','Quest-aware','Sword route'],primaryStat:'STR',secondaryPolicy:'DEX only for verified accuracy or equipment breakpoints',description:'A complete Classic Fighter path covering AP, SP, equipment, training, quests, monsters and crafting.',dataRef:'fighter'}:b);
  return {catalog:{...base.catalog,classes,builds,activeBuildId:base.catalog.activeBuildId},skills,skillIcons,gear,weapons:weaponRows,armor:gear,recipes:base.recipes,upgrades:base.upgrades,routes:routeBlocks.map(x=>({Levels:`${x[0]}–${x[1]}`,'Primary Route':x[2],'Main Monsters':x[3],'Main Skill / Method':x[4],'Why This Block':'Classic Fighter route checkpoint.','Major ETCs to Bank':'Only active quest materials','Weapon Decision Point':'Review current sword breakpoint','Quest / PQ Focus':'Complete class-appropriate chain','Status':'CURRENT / VERIFY','Evidence Class':'CURRENT / VERIFY'})),leveling,quests:questAudit.quests,etc:base.etc,apPlan,scrolls:base.scrolls,decisions:base.decisions,gearPresets:{efficient:{name:'Fighter Sword Progression',description:'Level checkpoints for a practical sword-and-shield Fighter.',levels:[]}},fighterDatabase:{monsters:monsterAudit.monsters,crafting:craftingAudit}};
}

function hunterVariant(base) {
  const audit = JSON.parse(fs.readFileSync(path.join(root, 'audit', 'fighter-skills.json'), 'utf8'));
  const items = JSON.parse(fs.readFileSync(path.join(root, 'audit', 'fighter-items.json'), 'utf8'));
  const quests = JSON.parse(fs.readFileSync(path.join(root, 'audit', 'fighter-quests.json'), 'utf8'));
  const monsters = JSON.parse(fs.readFileSync(path.join(root, 'audit', 'fighter-monsters.json'), 'utf8'));
  const crafting = JSON.parse(fs.readFileSync(path.join(root, 'audit', 'fighter-crafting.json'), 'utf8'));
  const groups = [...(audit.archer || []), ...(audit.beginner || [])];
  const all = groups.flatMap(g => g.skills || []).filter(s => !/Crossbow|Iron Arrow|Blizzard|Arrow Eruption|Golden Eagle|Evasion Step/.test(s.name));
  const skillIcons = Object.fromEntries(all.map(s => [s.name,{id:s.id,max:s.max_level,role:s.passive?'Passive':(s.mechanics?.label||'Combat skill'),desc:String(s.description||'').replace(/\s+/g,' ').trim()}]));
  const first = [
    [10,'Arrow Blow +1','AB 1'],
    [11,'Arrow Blow +3','AB 4'],
    [12,'Arrow Blow +2, The Eye of Amazon +1','AB 6 | EYE 1'],
    [13,'Arrow Blow +3','AB 9 | EYE 1'],
    [14,'Arrow Blow +3','AB 12 | EYE 1'],
    [15,'Arrow Blow +1, The Eye of Amazon +2','AB 13 | EYE 3'],
    [16,'Arrow Blow +3','AB 16 | EYE 3'],
    [17,'Arrow Blow +3','AB 19 | EYE 3'],
    [18,'Arrow Blow +1, Critical Shot +2','AB 20 | CS 2 | EYE 3'],
    [19,'Critical Shot +3','AB 20 | CS 5 | EYE 3'],
    [20,'Critical Shot +3','AB 20 | CS 8 | EYE 3'],
    [21,'Critical Shot +3','AB 20 | CS 11 | EYE 3'],
    [22,'Critical Shot +3','AB 20 | CS 14 | EYE 3'],
    [23,'Critical Shot +1, The Eye of Amazon +2','AB 20 | CS 15 | EYE 5'],
    [24,'The Eye of Amazon +3','AB 20 | CS 15 | EYE 8'],
    [25,'The Eye of Amazon +3','AB 20 | CS 15 | EYE 11'],
    [26,'The Eye of Amazon +3','AB 20 | CS 15 | EYE 14'],
    [27,'The Eye of Amazon +1, Focus +2','AB 20 | CS 15 | EYE 15 | FOC 2'],
    [28,'Focus +3','AB 20 | CS 15 | EYE 15 | FOC 5'],
    [29,'Focus +3','AB 20 | CS 15 | EYE 15 | FOC 8'],
    [30,'Focus +2, Power Knockback +1','AB 20 | CS 15 | EYE 15 | FOC 10 | PKB 1']
  ];
  const second = secondJobPlan(31, 70, [
    {name:'Bow Mastery', label:'BM', points:5},
    {name:'Bow Booster', label:'BB', points:1},
    {name:'Soul Arrow: Bow', label:'Soul', points:1},
    {name:'Final Attack: Bow', label:'FA', points:1},
    {name:'Bow Mastery', label:'BM', points:15},
    {name:'Arrow Bomb: Bow', label:'AB', points:30},
    {name:'Final Attack: Bow', label:'FA', points:29},
    {name:'Soul Arrow: Bow', label:'Soul', points:19},
    {name:'Bow Booster', label:'BB', points:19}
  ]);
  const skills=[...first,...second].map(([Level,Spend,result])=>({Level,SP:Level===10?1:3,Spend,'Why This Is The Action':Level<30?'Current Classic Bowman first-job route: raise Arrow Blow, take Eye early for range, then finish Critical Shot, Eye, Focus, and one Power Knockback.':'Cross-checked Hunter route: satisfy Bow Mastery prerequisites, add Booster, Soul Arrow, and Final Attack, then finish Mastery, Arrow Bomb, Final Attack, Soul Arrow, and Booster.','Meso / MP Logic':'Use the active skill breakpoint and preserve potions and arrows for training.','Result After Level':result||'Hunter checkpoint','Status':'Classic beta / verify at launch','Evidence Class':'CURRENT / VERIFY'}));
  const bows=(items.items||[]).filter(i=>i.category==='Equipment'&&(i.weapon_type==='Bow'||i.req_job_label==='Bowman'));
  const gear=[{Item:'None',Slot:'Any','Item ID':0,'Icon URL':'',STR:0,DEX:0,INT:0,LUK:0,'W.ATK':0,'Req Lv':0,Status:'CURRENT / VERIFY','Class Fit':'Any','Highly Recommended':false},...bows.map(i=>{const s=i.stats||{};return {Item:i.name,Slot:i.sub_category==='Weapon'?'Weapon':({Cap:'Hat',Coat:'Overall',Longcoat:'Overall',Pants:'Bottom',Shoes:'Shoes',Glove:'Gloves',Cape:'Cape',Accessory:'Earrings'}[i.sub_category]||'Any'),'Item ID':i.id,'Icon URL':`/game-media/items/primary/${i.id}`,STR:s.incSTR||0,DEX:s.incDEX||0,INT:s.incINT||0,LUK:s.incLUK||0,'W.ATK':s.incPAD||0,'Req Lv':s.reqLevel||0,'Req STR':s.reqSTR||0,'Req DEX':s.reqDEX||0,Status:'CURRENT / VERIFY','Class Fit':'Bowman / Hunter','Highly Recommended':false,Notes:i.weapon_type||'Classic Bowman equipment'};})];
  const routes=[
    routeBlock(1, 9, [50, 1004, 1005], 'Snail / Blue Snail / Shroom', 'Beginner route through the retained Maple Island layouts; leave when the Bowman advancement is ready.'),
    routeBlock(10, 12, [10000010, 10000011, 10001010], 'Snail / Shroom / Pig', 'Complete the early Lith Harbor/Henesys quests, then use Arrow Blow from safe range.'),
    routeBlock(13, 15, [10002031, 10000012, 10001010], 'Green Mushroom / Slime / Pig', 'Use the confirmed Southern Forest and beach layouts while early range improves.'),
    routeBlock(16, 20, [10002075, 10002033], 'Green Mushroom / Horny Mushroom / Slime', 'Critical Shot and Eye make the retained Ellinia tree maps more consistent.'),
    routeBlock(21, 25, [10005060, 10005070, 10002034], 'Zombie Mushroom / Evil Eye / Horny Mushroom', 'Use ranged positioning in Ant Tunnel I or Park; Southern Forest IV is the safer fallback.'),
    routeBlock(26, 30, [10003062, 10003061, 10004091], 'Stirge / Bubbling / Wild Boar / Iron Hog', 'Finish Bowman targets, meet the bow breakpoint, and advance to Hunter in Henesys.'),
    routeBlock(31, 35, [10004091, 10004041, 10002080], 'Wild Boar / Iron Hog / Curse Eye', 'Open with the Mastery/Booster/Soul Arrow/Final Attack prerequisites, then scale Arrow Bomb.'),
    routeBlock(36, 40, [10006060, 10002021, 10002024], 'Glowshroom / Raffle / Curse Eye / Lupin', 'Keep kiting from confirmed layouts; use the map with the cleanest two-hit breakpoint.'),
    routeBlock(41, 50, [10003097, 10006070, 10007021], 'Zombie Lupin / Lorang / Copper Drake / Raffle', 'Use Monkey Swamp, Forgotten, or Lorang Lorang Lorang according to party space and damage.'),
    routeBlock(51, 60, [10006020, 10005075, 10006031], 'Rafflesia / Duskmander / Drake / Sporewood', 'Primeval Forest II, Drake Hunting Ground, and Valley of Death are retained high-level alternatives.'),
    routeBlock(61, 70, [10006080, 10006071, 10006070], 'Sporewood / Rotten Mushroom / Rafflesia / Tauromacis', 'Finish Hunter on retained Classic layouts; Ranger/Bowmaster remain roadmap content and are not presented as live.' )
  ];
  const leveling=Array.from({length:70},(_,i)=>{const Lv=i+1,r=routes.find(x=>Lv>=x[0]&&Lv<=x[1]);return {Lv,Job:Lv<10?'Beginner':Lv<30?'Bowman':'Hunter','Primary Route':r[2],'Main Monsters':r[3],'Hunter Method':r[4],'Alternative':'Use the nearest retained Classic layout with a reliable hit rate','Quest / PQ Tie-In':'Complete the active Bowman/Hunter quest chain','Gear Hunt Tie-In':'Use the next bow breakpoint','SAVE ETC / ITEM NOW':'Bank active quest materials and arrows only','Target Qty':'As required by the active quest','Priority / Used For':'Route and quest progression','When You Can Stop Saving':'After the active quest chain is complete','Confidence':'CURRENT / VERIFY','Evidence Class':'CURRENT / VERIFY'};});
  const apPlan=[
    ['1–10','ALL DEX',5,57,'War Bow',25,'Current Classic Bowman sample: keep base STR at 5 and place level-up AP into DEX; job advancement has no stat requirement.'],
    ['11–15','+10 STR / +15 DEX',15,72,'Composite Bow',35,'Follow the current bow AP table so STR covers the level-15 bow while DEX continues to drive damage and accuracy.'],
    ['16–20','+5 STR / +20 DEX',20,92,"Hunter's Bow",45,'Use equipment stats where available, but do not miss the next bow requirement.'],
    ['21–25','+5 STR / +20 DEX',25,112,'Battle Bow',55,'Keep DEX as the primary stat and use the current Classic bow breakpoint.'],
    ['26–30','+5 STR / +20 DEX',30,132,'Ryden',65,'Reach the current level-30 bow sample, then let gear/scrolls handle later STR requirements where possible.'],
    ['31–70','Keep STR at the next bow requirement; DEX otherwise','30+','132+','Current bow / Hunter equipment','Next bow requirement','The private guide’s minimum-STR rule is useful after level 30; current Classic data remains the authority for exact equipment breakpoints.']
  ].map(x=>({'Level Range':x[0],'AP Action':x[1],'Base STR Target':x[2],'Base DEX Target':x[3],'Weapon Target':x[4],'Weapon DEX Req':x[5],'Effective DEX Plan':x[6],'Primary Stat':'DEX','Secondary Stat':'STR for bow requirements','Scroll Plan':'Bow Attack weapon scrolls; use safe progression upgrades first','Why':x[6],'Status':'Classic beta / verify at launch','Evidence Class':'CURRENT / VERIFY'}));
  return {catalog:{...base.catalog,activeBuildId:base.catalog.activeBuildId,classes:base.catalog.classes.map(c=>c.id==='archer'?{...c,status:'active'}:c),builds:base.catalog.builds},skills,skillIcons,gear,weapons:gear.filter(x=>x.Slot==='Weapon').map(x=>({Lv:x['Req Lv']||1,Weapon:x.Item,Type:x['Item ID'],'Weapon Type':'Bow','Why':x.Notes||'Bow breakpoint'})),armor:gear,recipes:base.recipes,upgrades:base.upgrades,routes:routes.map(x=>({Levels:`${x[0]}–${x[1]}`,'Primary Route':x[2],'Main Monsters':x[3],'Main Skill / Method':x[4],Status:'CURRENT / VERIFY','Evidence Class':'CURRENT / VERIFY'})),leveling,quests:quests.quests,etc:base.etc,apPlan,scrolls:base.scrolls,decisions:base.decisions,gearPresets:{efficient:{name:'Hunter Bow Progression',description:'DEX-first bow progression with current Classic bow breakpoints and minimum-STR guidance after level 30.',levels:[]}},hunterDatabase:{monsters:monsters.monsters,crafting}};
}

function readChunk(name) {
  const directRepair = path.join(repairs, name);
  if (fs.existsSync(directRepair)) return fs.readFileSync(directRepair, 'utf8');
  const stem = name.replace(/\.txt$/, '');
  let repaired = '';
  for (let i = 0; ; i++) {
    const part = path.join(repairs, `${stem}.part${i}.txt`);
    if (!fs.existsSync(part)) break;
    repaired += fs.readFileSync(part, 'utf8');
  }
  if (repaired) return repaired;
  return fs.readFileSync(path.join(runtime, name), 'utf8');
}

function readChunks(prefix, count) {
  let base64 = '';
  for (let i = 0; i < count; i++) {
    const name = `${prefix}.${String(i).padStart(2, '0')}.txt`;
    base64 += readChunk(name).replace(/\s+/g, '');
  }
  return zlib.gunzipSync(Buffer.from(base64, 'base64')).toString('utf8');
}

function ownedUrls(text) {
  return String(text)
    .replaceAll('https://raw.githubusercontent.com/ohmi69/osms_datamine_dashboard/main/', '/game-data/')
    .replaceAll('https://meowdb.com/msclassic/api/assets/icons/', '/game-media/icons/')
    .replaceAll('https://api.dreamms.gg/api/GMS/latest/item/', '/game-media/items/primary/')
    .replaceAll('https://api.dreamms.gg/api/GMS/latest/pet/', '/game-media/pets/')
    .replaceAll('https://api.dreamms.gg/api/GMS/latest/character/', '/game-media/characters/')
    .replaceAll('https://api.dreamms.gg/api/GMS/latest/mob/', '/game-media/monsters/')
    .replaceAll('https://maplestory.io/api/GMS/83/item/', '/game-media/items/fallback/')
    .replaceAll('https://maplestory.io/api/wz/img/GMS/83/Skill/', '/game-media/skills/');
}

function publicScript(text) {
  return ownedUrls(text)
    .replaceAll('OSMS', 'TCW')
    .replaceAll('Osms', 'Tcw')
    .replaceAll('osms', 'tcw')
    .replaceAll('COT2', 'CURRENT')
    .replaceAll('Cot2', 'Current')
    .replaceAll('cot2', 'current');
}

function sanitizePublicGuide(value, key = '') {
  if (Array.isArray(value)) {
    return value.map(v => sanitizePublicGuide(v, key)).filter(v => v !== undefined);
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (/(?:source|provider|evidence|provenance|audit|canonical|spreadsheet|launchscope|legacyparity|parityexamples|questcoverage|questaudit)/i.test(k)) continue;
      const clean = sanitizePublicGuide(v, k);
      if (clean !== undefined) out[k] = clean;
    }
    return out;
  }
  if (typeof value === 'string') {
    let clean = ownedUrls(value);
    if (/https?:\/\//i.test(clean)) return undefined;
    clean = clean
      .replace(/\bCOT2\b/gi, 'current')
      .replace(/\bCOT1\b/gi, 'earlier')
      .replace(/\bOSMS\b/gi, 'Top Classic World')
      .replace(/pre[- ]launch/gi, 'current')
      .replace(/\s{2,}/g, ' ')
      .trim();
    return clean;
  }
  return value;
}

function publicGuide(raw) {
  const data = JSON.parse(raw);
  data.buildVariants = { fighter: fighterVariant(data), hunter: hunterVariant(data) };
  if (data.catalog?.builds) {
    data.catalog.builds = data.catalog.builds.map(b => b.id === 'magician-il-fresh' ? {...b, name:'I/L Wizard Build'} : b.id === 'warrior-future' ? {...b, id:'warrior-fighter', name:'Fighter Build', shortName:'Fighter', subtitle:'Sword-focused Warrior progression', levelMin:1, levelMax:70, status:'active', tags:['Warrior','Fighter','Level 1–70','Quest-aware','Sword route'], primaryStat:'STR', secondaryPolicy:'DEX only for verified accuracy or equipment breakpoints', description:'A complete Classic Fighter path covering AP, SP, equipment, training, quests, monsters and crafting.', dataRef:'fighter'} : b);
    data.catalog.builds.push({id:'archer-hunter',name:'Hunter Build',shortName:'Hunter',subtitle:'DEX-first bow progression',levelMin:1,levelMax:70,status:'active',classId:'archer',branchId:'hunter',tags:['Archer','Hunter','Level 1–70','Bow route'],primaryStat:'DEX',secondaryPolicy:'Minimum STR for bow requirements',description:'A Classic Bowman-to-Hunter path covering AP, SP, bows, training, quests, monsters and crafting.',dataRef:'hunter'});
    data.catalog.classes = data.catalog.classes.map(c => c.id === 'warrior' ? {...c, status:'active'} : c);
  }
  if (data.meta) {
    data.meta = {
      title: BRAND,
      version: data.meta.version,
      builtAt: data.meta.builtAt,
      maxLevel: data.meta.maxLevel,
      recommendationPolicy: data.meta.recommendationPolicy
    };
  }
  if (Array.isArray(data.sources)) data.sources = [];
  return JSON.stringify(sanitizePublicGuide(data));
}

function patchApp(raw) {
  let app = ownedUrls(raw).replaceAll('MapleStory Classic Builder', BRAND);
  app = app.replace('  const D = window.GUIDE_DATA;', `  let D = window.GUIDE_DATA;
  try {
    const requestedBuild = JSON.parse(localStorage.getItem('ultimateILGuideState.v1') || '{}').activeBuildId;
    if(requestedBuild === 'warrior-fighter' && D.buildVariants?.fighter) D = D.buildVariants.fighter;
    if(requestedBuild === 'archer-hunter' && D.buildVariants?.hunter) D = D.buildVariants.hunter;
  } catch(e) {}`);
  app = require('./patches/usability.cjs')(app);
  app = app.replace("    const profile=activeBuild();", "    const profile=activeBuild();\n    const buildTitle=document.getElementById('hero-build-title'); if(buildTitle) buildTitle.textContent=profile?.name||'I/L Wizard Build';\n    const buildSub=document.getElementById('hero-build-subtitle'); if(buildSub) buildSub.textContent=profile?.subtitle||'Current route';\n    const heroClass=document.querySelector('.v5-kicker-row .class-pill'); if(heroClass) heroClass.textContent=classForBuild(profile)?.name?.toUpperCase()||'MAGICIAN';\n    const heroJob=document.querySelector('.v5-kicker-row .job-pill'); if(heroJob) heroJob.textContent=profile?.shortName||'I/L WIZARD';");
  app = app.replace("  function recommendedWeaponName(level=state.level){", "  function recommendedWeaponName(level=state.level){\n    if(['warrior-fighter','archer-hunter'].includes(activeBuild()?.id)){ const row=(D.weapons||[]).filter(x=>Number(x.Lv||0)<=level).at(-1); return row?.Weapon||'None'; }");
  app = app.replace("  function renderAtlasSkills(){", "  function renderAtlasSkills(){\n    if(['warrior-fighter','archer-hunter'].includes(activeBuild()?.id)){\n      const tabs=document.getElementById('atlas-skill-tabs'),grid=document.getElementById('atlas-skill-grid'),detail=document.getElementById('atlas-skill-detail');\n      if(!tabs||!grid||!detail)return;\n      const label=activeBuild()?.shortName||'Class'; tabs.innerHTML=`<span class=\"eyebrow\">${label.toUpperCase()} SKILL PLAN</span>`;\n      const row=D.skills.filter(x=>Number(x.Level)===state.level).at(-1)||D.skills[0];\n      const names=[...new Set((D.skills||[]).flatMap(x=>String(x.Spend||'').split(/[+,]/).map(y=>y.trim().replace(/\\s+\\+\\d+.*$/,'')).filter(y=>D.skillIcons?.[y])))];\n      grid.innerHTML=names.map(name=>`<button class=\"atlas-skill-card\" data-skill-name=\"${esc(name)}\"><span class=\"skill-img-wrap\">${skillImgTag(name,'skill-icon')}</span><b>${esc(name)}</b><small>${esc(label)} skill</small></button>`).join('');\n      detail.innerHTML=`<span class=\"detail-kicker\">CURRENT SP ACTION</span><b>Lv ${esc(state.level)} · ${esc(row?.Spend||'Follow the plan')}</b><p>${esc(row?.['Why This Is The Action']||'Follow the class plan.')}</p>`;\n      return;\n    }");

  const oldSetLevel = `function setLevel(level){\n    state.level=Math.max(1,Math.min(Number(D.meta.maxLevel)||70,Number(level)||1));\n    save();\n    renderAll();\n  }`;
  const newSetLevel = `function preserveLoadedImages(root,render){\n    const pool=new Map();\n    if(root) root.querySelectorAll('img[src]').forEach(img=>{\n      const key=[img.getAttribute('src')||'',img.alt||'',img.className||''].join('¦');\n      if(!pool.has(key))pool.set(key,[]);\n      pool.get(key).push(img);\n    });\n    render();\n    if(!root)return;\n    root.querySelectorAll('img[src]').forEach(img=>{\n      const key=[img.getAttribute('src')||'',img.alt||'',img.className||''].join('¦');\n      const old=pool.get(key)?.shift();\n      if(old&&old!==img&&old.complete&&old.naturalWidth>0)img.replaceWith(old);\n    });\n  }\n  function renderLevelPage(){\n    const p=state.page;\n    const root=document.querySelector('.page[data-page="'+p+'"]');\n    preserveLoadedImages(root,()=>{\n      if(p==='dashboard')renderDashboard();\n      else if(p==='builds')renderBuildLibrary();\n      else if(p==='leveling')renderRoutes();\n      else if(p==='quests')renderQuests();\n      else if(p==='equipment'){renderWeapons();renderEquipment('equipment-window-page','build-summary-page');}\n      else if(p==='skills')renderSkills();\n      else if(p==='etc')renderEtc();\n      else if(p==='formulas')renderFormulas();\n    });\n  }\n  function setLevel(level){\n    const next=Math.max(1,Math.min(Number(D.meta.maxLevel)||70,Number(level)||1));\n    if(next===state.level)return;\n    state.level=next;\n    save();\n    const a=document.getElementById('level-select'),b=document.getElementById('hero-level-select'),r=document.getElementById('level-range');\n    if(a)a.value=String(next);if(b)b.value=String(next);if(r)r.value=String(next);\n    document.documentElement.dataset.levelUpdate='1';\n    renderLevelPage();\n    requestAnimationFrame(()=>document.documentElement.removeAttribute('data-level-update'));\n  }`;
  if (!app.includes(oldSetLevel)) throw new Error('setLevel patch target missing');
  app = app.replace(oldSetLevel, newSetLevel);

  const pageHook = `if(p==='equipment') renderEquipment('equipment-window-page','build-summary-page');`;
  if (!app.includes(pageHook)) throw new Error('setPage patch target missing');
  app = app.replace(pageHook, `if(p==='dashboard') renderDashboard();\n    if(p==='leveling') renderRoutes();\n    if(p==='quests') renderQuests();\n    if(p==='skills') renderSkills();\n    if(p==='etc') renderEtc();\n    if(p==='equipment'){renderWeapons();renderEquipment('equipment-window-page','build-summary-page');}`);

  app = app.replace(
    `function evidenceLabel(item){\n    const e=String(item?.['Evidence Class']||'UNVERIFIED');\n    if(e.includes('HISTORICAL')) return 'HISTORICAL ONLY';\n    if(e.includes('PRE-LAUNCH')) return 'COT2 · VERIFY LAUNCH';\n    if(e.includes('CURRENT')) return 'COT2 VERIFIED';\n    return 'UNVERIFIED';\n  }`,
    `function evidenceLabel(){ return ''; }`
  );
  app = app.replace('<button class="ghost-btn" disabled>Not researched yet</button>', '<button class="ghost-btn" data-build-select="${b.id}">${[\'warrior-fighter\',\'archer-hunter\'].includes(b.id)?`Open ${b.name}`:\'Not researched yet\'}</button>');
  app = app.replace("  document.getElementById('page-back')?.addEventListener('click',()=>setPage('dashboard'));", "  document.getElementById('page-back')?.addEventListener('click',()=>setPage('dashboard'));\n  document.body.addEventListener('click',e=>{const b=e.target.closest('[data-build-select]');if(!b)return;state.activeBuildId=b.dataset.buildSelect;save();location.reload();});");

  app = app.replaceAll('COT2 client export via OSMS', 'Top Classic World database');
  app = app.replaceAll('Current COT2 metadata', 'Current game data');
  app = app.replaceAll('current COT2 client visual', 'game artwork');
  app = app.replaceAll('COT2 skill', 'Skill');
  app = app.replaceAll('COT2 map', 'Map');
  app = app.replaceAll('COT2 monster', 'Monster');
  app = app.replaceAll('COT2 needs', 'Needs');
  app = app.replaceAll('COT2 rewards', 'Rewards');

  // Do not expose provider/source implementation fields in public Database metadata cards.
  app = app.replace(
    `Object.entries(row).filter(([k])=>!k.startsWith('__'))`,
    `Object.entries(row).filter(([k])=>!k.startsWith('__')&&!/(?:source|provider|origin|url|thumbnail|gif|hash)/i.test(k))`
  );

  // Hidden research/agent pages are not part of the public render cycle anymore.
  app = app.replace(
    `renderDashboard();renderBuildLibrary();renderRoutes();renderQuests();renderWeapons();renderSkills();renderEtc();renderResearch();renderData();`,
    `renderDashboard();renderBuildLibrary();renderRoutes();renderQuests();renderWeapons();renderSkills();renderEtc();`
  );
  app = app.replace(`page:raw.page||'dashboard',`, `page:['research','data','formulas'].includes(raw.page)?'dashboard':(raw.page||'dashboard'),`);

  // Dashboard queues use the physical space available in the equal-height action row.
  app = app.replace(
    `.sort((a,b)=>(rank[a.Priority]??9)-(rank[b.Priority]??9)||Number(a.Lv||0)-Number(b.Lv||0)).slice(0,4);`,
    `.sort((a,b)=>(rank[a.Priority]??9)-(rank[b.Priority]??9)||Number(a.Lv||0)-Number(b.Lv||0)).slice(0,8);`
  );
  app = app.replace(
    `.sort((a,b)=>Number(a['Start Lv']||99)-Number(b['Start Lv']||99)).slice(0,6);`,
    `.sort((a,b)=>Number(a['Start Lv']||99)-Number(b['Start Lv']||99)).slice(0,12);`
  );

  // ETC names are part of the core queue markup so rerenders cannot erase readable labels.
  const etcChipNeedle = '<span class="etc-icon-shell" data-etc-icon-name="${esc(x.Item)}">◌</span><b>';
  const etcChipNamed = '<span class="etc-icon-shell" data-etc-icon-name="${esc(x.Item)}">◌</span><span class="tcw-etc-name">${esc(x.Item)}</span><b>';
  if (!app.includes(etcChipNeedle)) throw new Error('ETC queue chip markup patch target missing');
  app = app.replaceAll(etcChipNeedle, etcChipNamed);

  // The full Skill Tree is informational: the core renderer never emits completion checkboxes.
  const skillRenderer=fs.readFileSync(path.join(root,'patches','skill-renderer.txt'),'utf8').trimEnd();
  const skillStart=app.indexOf('  function renderSkills(){');
  const skillEnd=app.indexOf("\n\n  ['etc-search'",skillStart);
  if(skillStart<0||skillEnd<0) throw new Error('Skill Tree renderer patch target missing');
  app=app.slice(0,skillStart)+skillRenderer+app.slice(skillEnd);

  // Never use the generic icon endpoint for skills; it can resolve to unrelated item artwork.
  const genericSkillCandidates="return [...new Set([String(skill.url||'').trim(),mapleIoSkillIcon(skill)].filter(Boolean))];";
  const safeSkillCandidates="return [...new Set([mapleIoSkillIcon(skill)].filter(Boolean))];";
  if(!app.includes(genericSkillCandidates)) throw new Error('generic skill icon candidate patch target missing');
  app=app.replace(genericSkillCandidates,safeSkillCandidates);
  const monsterMapReturn = "    if(dataset==='maps') return";
  const monsterMapPos = app.indexOf(monsterMapReturn);
  const monsterEmptyPos = monsterMapPos >= 0 ? app.indexOf("    return '';", monsterMapPos) : -1;
  if(monsterEmptyPos >= 0) app = app.slice(0,monsterEmptyPos) + "    if(dataset==='monsters') return `/game-media/monsters/${Math.trunc(id)}/render/stand?format=png&resize=2`;\n" + app.slice(monsterEmptyPos);
  app=app.replace(/(function entityThumb\(row,dataset\)\{)\n    if\(row\.thumbnail\) return osmsImage\(row\.thumbnail\);\n    const id=Number\(row\.id\);/, "$1\n    if(dataset==='monsters'){ const hash=row.gif||row.gifs?.move||row.gifs?.stand; if(hash) return `/game-data/data/images/monsters/${hash}.webp`; if(row.thumbnail) return `/game-data/data/images/monsters/${row.thumbnail}.png`; }\n    if(row.thumbnail) return osmsImage(row.thumbnail);\n    const id=Number(row.id);");
  // Magic Claw must request its current artwork on the very first render too,
  // before the asynchronous canonical image layer has loaded the skill index.
  const clawNeedle = '    const skill=D.skillIcons[name], urls=skillVisualCandidates(skill);';
  if(!app.includes(clawNeedle)) throw new Error('canonical Magic Claw patch target missing');
  app=app.replace(clawNeedle, "    const skill=D.skillIcons[name], urls=name==='Magic Claw'?['/game-data/data/current/images/skills/2001003.png',...skillVisualCandidates(skill)]:skillVisualCandidates(skill);");

  // The renderer owns node lifetime. Event-capture ID masking cannot protect native
  // input: microtask checkpoints may restore IDs before target listeners run.
  const atlasTabNeedle = "    const tab=activeAtlasSkillTab();";
  if(!app.includes(atlasTabNeedle)) throw new Error('stable dashboard skills patch target missing');
  app=app.replace(atlasTabNeedle, `${atlasTabNeedle}
    // tcw-skill-renderer-inplace-v1
    if(grid.dataset.renderedSkillTab===tab && grid.querySelector('.atlas-skill-card')){
      if(tab!=='beginner'){
        const alloc=parseSkillAllocation(latestSkillResult(tab,state.level)?.['Result After Level']);
        grid.querySelectorAll('[data-skill-name]').forEach(card=>{
          const info=atlasSkillInfo[card.dataset.skillName];
          if(!info)return;
          const lv=alloc[info.abbr]||0;
          card.classList.toggle('learned',lv>0);
          card.classList.toggle('unlearned',lv===0);
          const small=card.querySelector('small'),text='Lv. '+lv+'/'+info.max;
          if(small&&small.textContent!==text)small.firstChild.data=text;
        });
      }
      window.TCW_REFRESH_SKILL_STATE?.();
      return;
    }
    grid.dataset.renderedSkillTab=tab;`);
  // Keep existing connected skill images out of the generic recycled-image pool.
  app=app.replaceAll("      const key=[img.getAttribute('src')||'',img.alt||'',img.className||''].join('¦');",
    "      if(img.closest('#atlas-skill-grid,#atlas-skill-detail'))return;\n      const key=[img.getAttribute('src')||'',img.alt||'',img.className||''].join('¦');");
  // Detail click handlers must read current allocation, rather than their creation level.
  app=app.replace("      const info=atlasSkillInfo[name], lv=alloc[info.abbr]||0;\n      detail.innerHTML=",
    "      const info=atlasSkillInfo[name], lv=parseSkillAllocation(latestSkillResult(kind,state.level)?.['Result After Level'])[info.abbr]||0;\n      detail.innerHTML=");
  return require('./patches/equipment-branding.cjs')(app);
}

function removePageSection(html, page) {
  const startRe = new RegExp(`<section\\s+data-page=\"${page}\"\\b`, 'i');
  const match = startRe.exec(html);
  if (!match) return html;
  const tokenRe = /<\/?section\b[^>]*>/gi;
  tokenRe.lastIndex = match.index;
  let depth = 0;
  let end = -1;
  let token;
  while ((token = tokenRe.exec(html))) {
    if (/^<section\b/i.test(token[0])) depth += 1;
    else depth -= 1;
    if (depth === 0) { end = tokenRe.lastIndex; break; }
  }
  if (end < 0) throw new Error(`Could not remove ${page} page section`);
  return html.slice(0, match.index) + html.slice(end);
}

function patchHtml(raw) {
  let html = raw.replaceAll('MapleStory Classic Builder', BRAND);
  html = html.replace('<div class="brand-title">CLASSIC BUILDER</div>', '<div class="brand-title">TOP CLASSIC WORLD</div>');
  html = html.replace('<div class="brand-sub">Top Classic World Maplestory</div>', '<div class="brand-sub">Maplestory · Classic World</div>');
  html = html.replace(/\s*<div class="beta-banner">[\s\S]*?<\/div>\s*/, '\n');
  html = html.replace(/\s*<section class="v7-audit-strip v72-audit-top"[\s\S]*?<\/section>\s*/, '\n');
  html = html.replace(/\s*<div class="nav-section-label">(?:PLAY|DATABASE|META)<\/div>\s*/g, '\n');
  html = html.replace(/\s*<button data-page="research"[^>]*>[\s\S]*?<\/button>\s*/, '\n');
  html = html.replace(/\s*<button data-page="data"[^>]*>[\s\S]*?<\/button>\s*/, '\n');
  html = html.replace(/\s*<button data-page="formulas"[^>]*>[\s\S]*?<\/button>\s*/, '\n');
  html = html.replace('<div><b>Headless data source attached</b><small>Website is the main interface</small></div>', '<div><b>Top Classic World</b><small>Database online</small></div>');
  html = html.replace('<span id="atlas-beta-pill" class="beta-tag">COT2-AWARE</span>', '');
  html = html.replace('<h2>Top Classic World Maplestory</h2><p>Ice / Lightning Wizard · Level 1–70 · equipment, skills, quests, targets and progression in one build.</p>', '<h2 id="hero-build-title">I/L Wizard Build</h2><p id="hero-build-subtitle">Ice / Lightning Wizard · Level 1–70 · equipment, skills, quests, targets and progression in one build.</p>');
  html = html.replace('Ice / Lightning is the active personalized build today; future class cards stay infrastructure-only until researched and verified.', 'Choose a researched build and follow its level-by-level progression.');

  html = html.replace(
    '<section data-page="classicdb" class="page"><div class="db-hero"><div><span class="eyebrow">OSMS · CURRENT COT2 CLIENT EXPORT</span><h2>Classic Database</h2><p>Search the broad COT2 metadata layer without mixing it into curated I/L recommendations.</p></div><div class="db-provider-badge"><b>Provider</b><span>OSMS Data Explorer</span></div></div>',
    '<section data-page="classicdb" class="page"><div class="db-hero"><div><span class="eyebrow">TOP CLASSIC WORLD</span><h2>Database</h2><p>Search items, equipment, monsters, maps, quests, skills, crafting and portals in one place.</p></div></div>'
  );
  html = html.replace(
    '<section data-page="cashshop" class="page"><div class="db-hero"><div><span class="eyebrow">COT2 CATALOG · PRICES ARE BETA DATA</span><h2>Cash Shop</h2><p>Browse the client-exported catalog. Availability and prices stay visibly pre-launch until live confirmation.</p></div><span class="beta-tag">COT2 / VERIFY LIVE</span></div>',
    '<section data-page="cashshop" class="page"><div class="db-hero"><div><span class="eyebrow">TOP CLASSIC WORLD</span><h2>Cash Shop</h2><p>Browse the current catalog, prices and availability.</p></div></div>'
  );
  html = html.replace(
    '<section data-page="beauty" class="page"><div class="db-hero"><div><span class="eyebrow">COT2 CLIENT CATALOG</span><h2>Beauty</h2><p>Hair and face styles with exact IDs and current exported artwork.</p></div></div>',
    '<section data-page="beauty" class="page"><div class="db-hero"><div><span class="eyebrow">TOP CLASSIC WORLD</span><h2>Beauty</h2><p>Hair and face styles with exact IDs and artwork.</p></div></div>'
  );
  for (const page of ['research','data','formulas']) html = removePageSection(html, page);
  return html;
}

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const css = readChunks('styles', 3);
const guideJson = publicGuide(readChunks('guide', 6));
const app = publicScript(patchApp(readChunks('app', 4)));
const visualCss = fs.readFileSync(path.join(source, 'visuals.css'), 'utf8');
const visuals = publicScript(fs.readFileSync(path.join(source, 'visuals.js'), 'utf8'));
const visualDbCss = fs.readFileSync(path.join(source, 'visuals-db.css'), 'utf8');
const visualDb = publicScript(fs.readFileSync(path.join(source, 'visuals-db.js'), 'utf8'));
const visualNpcCss = fs.readFileSync(path.join(source, 'visuals-npc.css'), 'utf8');
const visualNpc = publicScript(fs.readFileSync(path.join(source, 'visuals-npc.js'), 'utf8'));
const visualSkillCss = fs.readFileSync(path.join(source, 'visuals-skills.css'), 'utf8');
const visualSkill = publicScript(fs.readFileSync(path.join(source, 'visuals-skills.js'), 'utf8'));
const visualPortalCss = fs.readFileSync(path.join(source, 'visuals-portals.css'), 'utf8');
const visualPortal = publicScript(fs.readFileSync(path.join(source, 'visuals-portals.js'), 'utf8'));
const dashboardPolishCss = fs.readFileSync(path.join(source, 'dashboard-polish.css'), 'utf8');
const dashboardPolish = publicScript(fs.readFileSync(path.join(source, 'dashboard-polish.js'), 'utf8'));
const progressionSyncCss = fs.readFileSync(path.join(source, 'progression-sync.css'), 'utf8');
const progressionSync = publicScript(fs.readFileSync(path.join(source, 'progression-sync.js'), 'utf8'));
const progressionLevelHook = fs.readFileSync(path.join(source, 'progression-level-hook.js'), 'utf8');
const progressionSkillState = fs.readFileSync(path.join(source, 'progression-skill-state.js'), 'utf8');
const progressionGearVisualCss = fs.readFileSync(path.join(source, 'progression-gear-visual.css'), 'utf8');
const progressionGearVisual = fs.readFileSync(path.join(source, 'progression-gear-visual.js'), 'utf8');
const ownershipUiCss = fs.readFileSync(path.join(source, 'ownership-ui.css'), 'utf8');
const ownershipUi = fs.readFileSync(path.join(source, 'ownership-ui.js'), 'utf8');
const mapsTabCss = fs.readFileSync(path.join(source, 'maps-tab.css'), 'utf8');
const mapsTab = publicScript(fs.readFileSync(path.join(source, 'maps-tab.js'), 'utf8'));
const etcAuditData = fs.readFileSync(path.join(source, 'etc-audit-data.js'), 'utf8');
const questAuditAdditions = fs.readFileSync(path.join(source, 'quest-audit-additions.js'), 'utf8');
const etcAuditUiCss = fs.readFileSync(path.join(source, 'etc-audit-ui.css'), 'utf8');
const etcAuditUi = fs.readFileSync(path.join(source, 'etc-audit-ui.js'), 'utf8');

JSON.parse(guideJson);
if (!css.includes('.sidebar') || !app.includes('GUIDE_DATA')) throw new Error('Runtime verification failed');

let html = patchHtml(fs.readFileSync(path.join(source, 'index.html'), 'utf8'));
html = html.replaceAll('?v=0.8.0', `?v=${assetVersion}`);
html = html.replace('</head>', `  <link rel="stylesheet" href="visuals.css?v=${assetVersion}">\n  <link rel="stylesheet" href="visuals-db.css?v=${assetVersion}">\n  <link rel="stylesheet" href="visuals-npc.css?v=${assetVersion}">\n  <link rel="stylesheet" href="visuals-skills.css?v=${assetVersion}">\n  <link rel="stylesheet" href="visuals-portals.css?v=${assetVersion}">\n  <link rel="stylesheet" href="dashboard-polish.css?v=${assetVersion}">\n  <link rel="stylesheet" href="progression-sync.css?v=${assetVersion}">\n  <link rel="stylesheet" href="progression-gear-visual.css?v=${assetVersion}">\n  <link rel="stylesheet" href="ownership-ui.css?v=${assetVersion}">\n  <link rel="stylesheet" href="maps-tab.css?v=${assetVersion}">\n  <link rel="stylesheet" href="etc-audit-ui.css?v=${assetVersion}">\n</head>`);
html = html.replace('</body>', `  <script src="visuals.js?v=${assetVersion}"></script>\n  <script src="visuals-db.js?v=${assetVersion}"></script>\n  <script src="visuals-npc.js?v=${assetVersion}"></script>\n  <script src="visuals-skills.js?v=${assetVersion}"></script>\n  <script src="visuals-portals.js?v=${assetVersion}"></script>\n  <script src="dashboard-polish.js?v=${assetVersion}"></script>\n  <script src="progression-sync.js?v=${assetVersion}"></script>\n  <script src="progression-level-hook.js?v=${assetVersion}"></script>\n  <script src="progression-skill-state.js?v=${assetVersion}"></script>\n  <script src="progression-gear-visual.js?v=${assetVersion}"></script>\n  <script src="ownership-ui.js?v=${assetVersion}"></script>\n  <script src="maps-tab.js?v=${assetVersion}"></script>\n  <script src="etc-audit-ui.js?v=${assetVersion}"></script>\n</body>`);

html=html.replace('</head>', '<link rel="stylesheet" href="readability.css?v='+assetVersion+'"></head>');
html=html.replace('<script src="app.js', '<script src="job-search.js?v='+assetVersion+'"></script>\n<script src="app.js');
html=html.replace('</body>', '<script src="navigation-history.js?v='+assetVersion+'"></script></body>');
for(const file of ['readability.css','job-search.js','navigation-history.js'])fs.copyFileSync(path.join(source,file),path.join(out,file));
for(const file of ['map-layouts.json','map-audit.html','map-audit.js','map-audit.json','map-audit.csv'])fs.copyFileSync(path.join(source,file),path.join(out,file));
html=html.replace('</head>', '<link rel="stylesheet" href="equipment-branding.css?v='+assetVersion+'"></head>');
fs.copyFileSync(path.join(source,'equipment-branding.css'),path.join(out,'equipment-branding.css'));
fs.writeFileSync(path.join(out, 'index.html'), html);
const atlasAssets = path.join(source, 'assets', 'map-atlas');
if (fs.existsSync(atlasAssets)) fs.cpSync(atlasAssets, path.join(out, 'assets', 'map-atlas'), { recursive: true });
fs.copyFileSync(path.join(source, 'manifest.webmanifest'), path.join(out, 'manifest.webmanifest'));
fs.writeFileSync(path.join(out, 'styles.css'), css);
fs.writeFileSync(path.join(out, 'visuals.css'), visualCss);
fs.writeFileSync(path.join(out, 'visuals-db.css'), visualDbCss);
fs.writeFileSync(path.join(out, 'visuals-npc.css'), visualNpcCss);
fs.writeFileSync(path.join(out, 'visuals-skills.css'), visualSkillCss);
fs.writeFileSync(path.join(out, 'visuals-portals.css'), visualPortalCss);
fs.writeFileSync(path.join(out, 'dashboard-polish.css'), dashboardPolishCss);
fs.writeFileSync(path.join(out, 'progression-sync.css'), progressionSyncCss);
fs.writeFileSync(path.join(out, 'progression-gear-visual.css'), progressionGearVisualCss);
fs.writeFileSync(path.join(out, 'ownership-ui.css'), ownershipUiCss);
fs.writeFileSync(path.join(out, 'maps-tab.css'), mapsTabCss);
fs.writeFileSync(path.join(out, 'etc-audit-ui.css'), etcAuditUiCss);
fs.writeFileSync(path.join(out, 'guide-data.js'), `window.GUIDE_DATA = ${guideJson};\n`);
fs.writeFileSync(path.join(out, 'etc-audit-data.js'), etcAuditData);
fs.writeFileSync(path.join(out, 'quest-audit-additions.js'), questAuditAdditions);
fs.writeFileSync(path.join(out, 'app.js'), app);
fs.writeFileSync(path.join(out, 'visuals.js'), visuals);
fs.writeFileSync(path.join(out, 'visuals-db.js'), visualDb);
fs.writeFileSync(path.join(out, 'visuals-npc.js'), visualNpc);
fs.writeFileSync(path.join(out, 'visuals-skills.js'), visualSkill);
fs.writeFileSync(path.join(out, 'visuals-portals.js'), visualPortal);
fs.writeFileSync(path.join(out, 'dashboard-polish.js'), dashboardPolish);
fs.writeFileSync(path.join(out, 'progression-sync.js'), progressionSync);
fs.writeFileSync(path.join(out, 'progression-level-hook.js'), progressionLevelHook);
fs.writeFileSync(path.join(out, 'progression-skill-state.js'), progressionSkillState);
fs.writeFileSync(path.join(out, 'progression-gear-visual.js'), progressionGearVisual);
fs.writeFileSync(path.join(out, 'ownership-ui.js'), ownershipUi);
fs.writeFileSync(path.join(out, 'maps-tab.js'), mapsTab);
fs.writeFileSync(path.join(out, 'etc-audit-ui.js'), etcAuditUi);
fs.writeFileSync(path.join(out, 'build-info.txt'), `${BRAND} ${assetVersion}\n`);

const sw = `const CACHE='top-classic-world-${assetVersion}';\nconst CORE=['./','./index.html','./styles.css?v=${assetVersion}','./visuals.css?v=${assetVersion}','./visuals-db.css?v=${assetVersion}','./visuals-npc.css?v=${assetVersion}','./visuals-skills.css?v=${assetVersion}','./visuals-portals.css?v=${assetVersion}','./dashboard-polish.css?v=${assetVersion}','./progression-sync.css?v=${assetVersion}','./progression-gear-visual.css?v=${assetVersion}','./ownership-ui.css?v=${assetVersion}','./guide-data.js?v=${assetVersion}','./app.js?v=${assetVersion}','./visuals.js?v=${assetVersion}','./visuals-db.js?v=${assetVersion}','./visuals-npc.js?v=${assetVersion}','./visuals-skills.js?v=${assetVersion}','./visuals-portals.js?v=${assetVersion}','./dashboard-polish.js?v=${assetVersion}','./progression-sync.js?v=${assetVersion}','./progression-level-hook.js?v=${assetVersion}','./progression-skill-state.js?v=${assetVersion}','./progression-gear-visual.js?v=${assetVersion}','./ownership-ui.js?v=${assetVersion}','./maps-tab.css?v=${assetVersion}','./maps-tab.js?v=${assetVersion}','./etc-audit-data.js?v=${assetVersion}','./quest-audit-additions.js?v=${assetVersion}','./etc-audit-ui.css?v=${assetVersion}','./etc-audit-ui.js?v=${assetVersion}','./manifest.webmanifest'];\nself.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).catch(()=>{}));});\nself.addEventListener('activate',e=>{e.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('top-classic-world-')&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()]));});\nself.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const u=new URL(e.request.url);if(u.origin!==self.location.origin)return;e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});return r;}).catch(()=>caches.match(e.request).then(x=>x||caches.match('./index.html'))));});\n`;
fs.writeFileSync(path.join(out, 'sw.js'), sw);

console.log(`Built ${assetVersion}: CSS ${css.length} bytes, guide ${guideJson.length} bytes, app ${app.length} bytes, visuals ${visuals.length} bytes, DB visuals ${visualDb.length} bytes, NPC visuals ${visualNpc.length} bytes, skill visuals ${visualSkill.length} bytes, portal visuals ${visualPortal.length} bytes, dashboard polish ${dashboardPolish.length} bytes, progression sync ${progressionSync.length} bytes, progression level hook ${progressionLevelHook.length} bytes, progression skill state ${progressionSkillState.length} bytes, progression gear visual ${progressionGearVisual.length} bytes, ownership UI ${ownershipUi.length} bytes.`);
