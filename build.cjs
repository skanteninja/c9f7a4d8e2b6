const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = __dirname;
const source = path.join(root, 'public');
const runtime = path.join(source, 'assets', 'runtime');
const repairs = path.join(source, 'repairs');
const out = path.join(root, 'dist');
const assetVersion = '0.8.7-class-emblems';
const BRAND = 'Top Classic World Maplestory';

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
    [15, 'Precise Strikes +3', 'PS 4 | SB 4 | Precise 8 | IHP 0 | MHP 0'],
    [16, 'Precise Strikes +3', 'PS 4 | SB 4 | Precise 11 | IHP 0 | MHP 0'],
    [17, 'Precise Strikes +3', 'PS 4 | SB 4 | Precise 14 | IHP 0 | MHP 0'],
    [18, 'Precise Strikes +1, Power Strike +2', 'PS 6 | SB 4 | Precise 15 | IHP 0 | MHP 0'],
    [19, 'Power Strike +3', 'PS 9 | SB 4 | Precise 15 | IHP 0 | MHP 0'],
    [20, 'Power Strike +3', 'PS 12 | SB 4 | Precise 15 | IHP 0 | MHP 0'],
    [21, 'Power Strike +3', 'PS 15 | SB 4 | Precise 15 | IHP 0 | MHP 0'],
    [22, 'Power Strike +3', 'PS 18 | SB 4 | Precise 15 | IHP 0 | MHP 0'],
    [23, 'Power Strike +2, Slash Blast +1', 'PS 20 | SB 5 | Precise 15 | IHP 0 | MHP 0'],
    [24, 'Slash Blast +3', 'PS 20 | SB 8 | Precise 15 | IHP 0 | MHP 0'],
    [25, 'Slash Blast +3', 'PS 20 | SB 11 | Precise 15 | IHP 0 | MHP 0'],
    [26, 'Slash Blast +3', 'PS 20 | SB 14 | Precise 15 | IHP 0 | MHP 0'],
    [27, 'Slash Blast +3', 'PS 20 | SB 17 | Precise 15 | IHP 0 | MHP 0'],
    [28, 'Slash Blast +3', 'PS 20 | SB 20 | Precise 15 | IHP 0 | MHP 0'],
    [29, 'Improved HP Recovery +1, Max HP Increase +2', 'PS 20 | SB 20 | Precise 15 | IHP 1 | MHP 2'],
    [30, 'Improved HP Recovery +2, Max HP Increase +1', 'PS 20 | SB 20 | Precise 15 | IHP 3 | MHP 3']
  ];
  const second = [
    [31, 'Sword Mastery +1'], [32, 'Sword Mastery +2'], [33, 'Sword Mastery +3'], [34, 'Sword Mastery +3'], [35, 'Sword Mastery +3'], [36, 'Sword Mastery +3'], [37, 'Sword Mastery +3'], [38, 'Sword Mastery +2, Sword Booster +1'], [39, 'Sword Mastery +1, Final Attack: Sword +2'], [40, 'Final Attack: Sword +3'], [41, 'Final Attack: Sword +3'], [42, 'Final Attack: Sword +3'], [43, 'Final Attack: Sword +3'], [44, 'Final Attack: Sword +3'], [45, 'Final Attack: Sword +3'], [46, 'Final Attack: Sword +3'], [47, 'Final Attack: Sword +3'], [48, 'Final Attack: Sword +3'], [49, 'Final Attack: Sword +3'], [50, 'Final Attack: Sword +3'], [51, 'Final Attack: Sword +3'], [52, 'Final Attack: Sword +3'], [53, 'Final Attack: Sword +3'], [54, 'Final Attack: Sword +3'], [55, 'Sword Booster +3'], [56, 'Sword Booster +3'], [57, 'Sword Booster +3'], [58, 'Sword Booster +3'], [59, 'Sword Booster +3'], [60, 'Sword Booster +3'], [61, 'Sword Booster +3'], [62, 'Sword Booster +3'], [63, 'Rage +3'], [64, 'Rage +3'], [65, 'Rage +3'], [66, 'Rage +3'], [67, 'Rage +3'], [68, 'Rage +3'], [69, 'Rage +3'], [70, 'Rage +3']
  ];
  const skills = [...steps, ...second].map(([level, spend, result], i) => ({
    Level: level, SP: level === 10 ? 1 : 3, Spend: spend,
    'Why This Is The Action': level < 30 ? 'Classic Warrior first-job route: reach the accuracy and damage breakpoints before investing in defense.' : 'Sword-focused Fighter route: establish mastery and Final Attack, then add Booster and Rage for sustained melee damage.',
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
  const routeBlocks = [[1,9,'Maple Island quest chain','Snail / Blue Snail / Red Snail','Beginner attacks; leave for Victoria at level 10.'],[10,12,'Henesys Hunting Ground / Mushroom Garden','Slime / Orange Mushroom / Pig','Power Strike single-target; finish the Warrior advancement and begin citizenship preparation.'],[13,15,'Southern Forest / Lith Harbor fields','Green Mushroom / Slime / Blue Snail','Power Strike while building accuracy; use Slash Blast once multiple targets are grouped.'],[16,20,'Ellinia tree maps','Green Mushroom / Horny Mushroom','Power Strike for single targets and Slash Blast for 3–4 mobs; keep hit rate checked.'],[21,30,'Kerning PQ / Ant Tunnel / Perion outskirts','KPQ mobs / Zombie Mushroom / Fire Boar','Finish first-job targets and choose Fighter at level 30.'],[31,40,'Land of Wild Boar / Florina Island','Wild Boar / Iron Hog / Lorang','Sword Mastery and Final Attack come online; use a sword route.'],[41,50,'Ludibrium terraces / Perion routes','Teddy / Platoon Chronos / Stone Golem','Rush and Final Attack improve map control; keep accuracy ahead of risky level gaps.'],[51,60,'Orbis / El Nath approach','Jr. Yeti / White Fang / Hector','Rage and Booster support sustained melee training; prioritize safe maps over raw EXP.'],[61,70,'El Nath / Leafre-accessible Classic routes','Hector / Dark Yeti / Tauromacis','Complete the level-70 Fighter plan and verify any launch-scope map availability.']];
  const leveling = Array.from({length:70},(_,i)=>{const lv=i+1,b=routeBlocks.find(x=>lv>=x[0]&&lv<=x[1]);return {Lv:lv,Job:lv<10?'Beginner':lv<30?'Warrior':'Fighter','Primary Route':b[2],'Main Monsters':b[3],'Fighter Method':b[4],'Alternative':'Use the nearest safer route with a confirmed layout','Quest / PQ Tie-In':lv<30?'Maple Island and Victoria quest chains':'Fighter advancement and class-appropriate quest chains','Gear Hunt Tie-In':lv<10?'Use Maple Island rewards':`Use the ${lv < 40 ? 'sword and shield' : 'current weapon'} checkpoint`,'SAVE ETC / ITEM NOW':'Bank active quest materials only','Target Qty':'As required by the active quest','Priority / Used For':'Route and quest progression','When You Can Stop Saving':'After the active quest chain is complete','Confidence':'CURRENT / VERIFY','Evidence Class':'CURRENT / VERIFY'};});
  const apPlan=[['1–10','ALL STR',5,'Maple Island weapon',0,'Put every gained AP into STR after the starting spread.'],['11–20','DEX to accuracy breakpoint, then STR',20,'Level-appropriate sword',0,'Add only enough DEX to maintain reliable hit rate; STR remains the damage stat.'],['21–30','DEX to 30 target, then STR',30,'Lv30 Warrior weapon',0,'Use accuracy requirements for the next training target rather than a rigid old-school formula.'],['31–40','STR first; DEX only for a real breakpoint',40,'Sword + shield',0,'Do not add DEX simply because a legacy guide says to.'],['41–50','STR first; maintain accuracy',50,'Current sword checkpoint',0,'Use equipment accuracy and potions before permanent AP when practical.'],['51–60','ALL STR after accuracy is stable',50,'Fighter sword route',0,'Keep base DEX at the verified breakpoint and push STR.'],['61–70','ALL STR',50,'End-of-range sword route',0,'Final Fighter levels prioritize damage and safe hit-rate thresholds.']].map(x=>({'Level Range':x[0],'AP Action':x[1],'Base DEX Target':x[2],'Weapon Target':x[3],'Weapon DEX Req':x[4],'Effective DEX Plan':x[5],'Scroll Plan':'Prefer safe 100%/60% upgrades; do not gamble early progression gear','Why':x[5],'Status':'Classic beta / verify at launch','Evidence Class':'CURRENT / VERIFY'}));
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
  const first = [[10,'Arrow Blow +1'],[11,'Arrow Blow +3'],[12,'Arrow Blow +2, The Eye of Amazon +1'],[13,'Arrow Blow +3'],[14,'Arrow Blow +3'],[15,'Arrow Blow +1, The Eye of Amazon +2'],[16,'Arrow Blow +3'],[17,'Arrow Blow +3'],[18,'Arrow Blow +1, Critical Shot +2'],[19,'Critical Shot +3'],[20,'Critical Shot +3'],[21,'Critical Shot +3'],[22,'Critical Shot +3'],[23,'Critical Shot +1, The Eye of Amazon +2'],[24,'The Eye of Amazon +3'],[25,'The Eye of Amazon +3'],[26,'The Eye of Amazon +3'],[27,'The Eye of Amazon +1, Focus +2'],[28,'Focus +3'],[29,'Focus +3'],[30,'Focus +2, Power Knockback +1']];
  const second = [[31,'Bow Mastery +3'],[32,'Bow Mastery +3'],[33,'Bow Mastery +3'],[34,'Bow Mastery +3'],[35,'Bow Mastery +3'],[36,'Bow Mastery +3'],[37,'Bow Mastery +3'],[38,'Bow Mastery +3'],[39,'Bow Mastery +3'],[40,'Bow Mastery +3'],[41,'Arrow Bomb: Bow +3'],[42,'Arrow Bomb: Bow +3'],[43,'Arrow Bomb: Bow +3'],[44,'Arrow Bomb: Bow +3'],[45,'Arrow Bomb: Bow +3'],[46,'Arrow Bomb: Bow +3'],[47,'Arrow Bomb: Bow +3'],[48,'Arrow Bomb: Bow +3'],[49,'Arrow Bomb: Bow +3'],[50,'Arrow Bomb: Bow +3'],[51,'Final Attack: Bow +3'],[52,'Final Attack: Bow +3'],[53,'Final Attack: Bow +3'],[54,'Final Attack: Bow +3'],[55,'Final Attack: Bow +3'],[56,'Final Attack: Bow +3'],[57,'Final Attack: Bow +3'],[58,'Soul Arrow: Bow +3'],[59,'Soul Arrow: Bow +3'],[60,'Soul Arrow: Bow +3'],[61,'Bow Booster +3'],[62,'Bow Booster +3'],[63,'Bow Booster +3'],[64,'Bow Booster +3'],[65,'Bow Booster +3'],[66,'Bow Booster +3'],[67,'Bow Booster +3'],[68,'Bow Booster +3'],[69,'Bow Booster +3'],[70,'Bow Booster +3']];
  const skills=[...first,...second].map(([Level,Spend])=>({Level,SP:Level===10?1:3,Spend,'Why This Is The Action':Level<30?'Classic Bowman route: establish Arrow Blow, Critical Shot, range, and Focus before the Hunter advancement.':'Hunter route: max Bow Mastery and Arrow Bomb first, then Final Attack, Soul Arrow, and Bow Booster.','Meso / MP Logic':'Use the active skill breakpoint and preserve potions for training.','Result After Level':'Hunter checkpoint','Status':'Classic beta / verify at launch','Evidence Class':'CURRENT / VERIFY'}));
  const bows=(items.items||[]).filter(i=>i.category==='Equipment'&&(i.weapon_type==='Bow'||i.req_job_label==='Bowman'));
  const gear=[{Item:'None',Slot:'Any','Item ID':0,'Icon URL':'',STR:0,DEX:0,INT:0,LUK:0,'W.ATK':0,'Req Lv':0,Status:'CURRENT / VERIFY','Class Fit':'Any','Highly Recommended':false},...bows.map(i=>{const s=i.stats||{};return {Item:i.name,Slot:i.sub_category==='Weapon'?'Weapon':({Cap:'Hat',Coat:'Overall',Longcoat:'Overall',Pants:'Bottom',Shoes:'Shoes',Glove:'Gloves',Cape:'Cape',Accessory:'Earrings'}[i.sub_category]||'Any'),'Item ID':i.id,'Icon URL':`/game-media/items/primary/${i.id}`,STR:s.incSTR||0,DEX:s.incDEX||0,INT:s.incINT||0,LUK:s.incLUK||0,'W.ATK':s.incPAD||0,'Req Lv':s.reqLevel||0,'Req STR':s.reqSTR||0,'Req DEX':s.reqDEX||0,Status:'CURRENT / VERIFY','Class Fit':'Bowman / Hunter','Highly Recommended':false,Notes:i.weapon_type||'Classic Bowman equipment'};})];
  const routes=[[1,9,'Maple Island quest line','Snail / Blue Snail / Shroom','Beginner route; leave for Henesys at level 10.'],[10,15,'Southern Forest / Thicket Around the Beach','Snail / Shroom / Pig','Arrow Blow and safe ranged pulls.'],[16,20,'Ellinia tree maps / Transfer Area','Green Mushroom / Horny Mushroom','Critical Shot and range stabilize training.'],[21,25,'Ant Tunnel III','Horny Mushroom / Zombie Mushroom','Use ranged positioning and conserve arrows.'],[26,30,'Kerning Subway / Deep Ant Tunnel','Jr. Wraith / Zombie Mushroom','Finish Bowman skills and advance to Hunter.'],[31,40,'Land of Wild Boar II','Wild Boar / Iron Hog','Bow Mastery and Arrow Bomb become the core route.'],[41,50,'Beach lookout / Forgotten Hollow entry','Lorang / current-area monsters','Arrow Bomb for grouped targets; use confirmed layouts.'],[51,60,'Forgotten Hollow','Rafflesia / Duskmander / Sporewood','Party-aware ranged training and Soul Arrow savings.'],[61,70,'Forgotten Hollow / confirmed Classic routes','Sporewood / Rotten Mushroom','Complete Hunter endgame while Ranger remains roadmap-only.']];
  const leveling=Array.from({length:70},(_,i)=>{const Lv=i+1,r=routes.find(x=>Lv>=x[0]&&Lv<=x[1]);return {Lv,Job:Lv<10?'Beginner':Lv<30?'Bowman':'Hunter','Primary Route':r[2],'Main Monsters':r[3],'Hunter Method':r[4],'Alternative':'Use the nearest confirmed Classic layout','Quest / PQ Tie-In':'Complete the active Bowman/Hunter quest chain','Gear Hunt Tie-In':'Use the next bow breakpoint','Confidence':'CURRENT / VERIFY','Evidence Class':'CURRENT / VERIFY'};});
  const apPlan=['1–10','11–15','16–20','21–25','26–30','31–70'].map((range,i)=>({'Level Range':range,'AP Action':i===0?'ALL DEX':i<5?'Minimum STR for the next bow, everything else DEX':'DEX every level; add STR only for the next bow requirement','Primary Stat':'DEX','Secondary Stat':'STR only at bow breakpoint','Scroll Plan':'Bow Attack weapon scrolls; use safe progression upgrades first','Status':'Classic beta / verify at launch','Evidence Class':'CURRENT / VERIFY'}));
  return {catalog:{...base.catalog,activeBuildId:base.catalog.activeBuildId,classes:base.catalog.classes.map(c=>c.id==='archer'?{...c,status:'active'}:c),builds:base.catalog.builds},skills,skillIcons,gear,weapons:gear.filter(x=>x.Slot==='Weapon').map(x=>({Lv:x['Req Lv']||1,Weapon:x.Item,Type:x['Item ID'],'Weapon Type':'Bow','Why':x.Notes||'Bow breakpoint'})),armor:gear,recipes:base.recipes,upgrades:base.upgrades,routes:routes.map(x=>({Levels:`${x[0]}–${x[1]}`,'Primary Route':x[2],'Main Monsters':x[3],'Main Skill / Method':x[4],Status:'CURRENT / VERIFY','Evidence Class':'CURRENT / VERIFY'})),leveling,quests:quests.quests,etc:base.etc,apPlan,scrolls:base.scrolls,decisions:base.decisions,gearPresets:{efficient:{name:'Hunter Bow Progression',description:'DEX-first bow progression with minimum STR breakpoints.',levels:[]}},hunterDatabase:{monsters:monsters.monsters,crafting}};
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
