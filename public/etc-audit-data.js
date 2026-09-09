(() => {
  const D=window.GUIDE_DATA;if(!D||!Array.isArray(D.etc))return;
  // The detailed lifetime reserve below was audited for I/L crafting. Other
  // builds keep their own quest baseline until their recipe reserve is audited.
  if((window.TCW_ACTIVE_BUILD_ID||'magician-il-fresh')!=='magician-il-fresh'){
    document.documentElement.classList.add('etc-lifetime-data-ready','etc-build-aware-ready');
    return;
  }
  const KEY='ultimateILGuideState.v1';
  const norm=v=>String(v??'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const slug=v=>String(v??'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const keepFor=base=>base<=0?0:base===1?1:Math.ceil(base*1.15);
  const rows=[
    {name:'Blue Snail Shell',quest:10,craft:0,weekly:100,start:1,uses:"Biggs's Collection of Items x10"},
    {name:'Orange Mushroom Cap',quest:41,craft:0,weekly:100,start:3,uses:"Biggs x1 · Maya's First Collection x20 · Mushroom Studies x10 · Don Hwang x10"},
    {name:"Pig's Ribbon",aliases:["Pig's Ribbon"],quest:50,craft:0,weekly:100,start:8,uses:"Mrs. Ming Ming x20 · Maya's Second Collection x20 · Don Hwang x10"},
    {name:'Leaf',quest:105,craft:0,weekly:100,start:10,uses:'Arcon x30 · Homework x10 · Shumi x15 · Blackbull x10 · Fossil Research x20 · Francois x20'},
    {name:'Octopus Leg',quest:80,craft:0,weekly:100,start:10,uses:"Estelle's Sauce x30 · Arcon x30 · Andre x20"},
    {name:'Tree Branch',quest:42,craft:0,weekly:0,start:10,uses:"I'm Bored 2 x12 · Blackbull x10 · Vicious x20"},
    {name:'Slime Bubble',quest:14,craft:0,weekly:0,start:8,uses:"Teo x1 · Mrs. Ming Ming x10 · Homework x3"},
    {name:"Pig's Head",aliases:['Pig Head'],quest:21,craft:0,weekly:0,start:8,uses:"Teo x1 · Mrs. Ming Ming x10 · Secret to Unagi Special x10"},
    {name:'Green Mushroom Cap',quest:85,craft:0,weekly:100,start:14,uses:"Pia x20 · Maya's First Collection x20 · Mushroom quests x45"},
    {name:'Blue Mushroom Cap',quest:70,craft:30,weekly:100,start:14,uses:"Jane x15 · Pia x20 · Maya's First Collection x20 · Stan x15 · Metal Wand reserve x30"},
    {name:'Jr. Necki Skin',quest:50,craft:0,weekly:10,start:19,uses:'Luke x10 · Dr. Faymus x20 · Taking Out the Alligators 1 x20'},
    {name:'Salad',quest:1,craft:0,weekly:0,start:19,uses:'Luke the Security Guy x1'},
    {name:'Horny Mushroom Cap',quest:85,craft:0,weekly:100,start:15,uses:"Jane x15 · Maya chain x20 · First House Delivery x30 · Dr. Faymus x20"},
    {name:'Broken Mirror Glass',quest:20,craft:0,weekly:0,start:23,uses:"Stranger's Request x20"},
    {name:'Charm of the Undead',quest:65,craft:0,weekly:100,start:21,uses:"Arcon's Blood? x40 · Stranger's Identity x25"},
    {name:"Arwen's Glass Shoe",aliases:['Glass Shoe'],quest:1,craft:0,weekly:0,start:28,uses:'Arwen and the Glass Shoe x1',exact:true},
    {name:'Iron Ingot',quest:1,craft:4,weekly:0,start:10,uses:'Mr. Thunder apprentice x1 · Metal Wand reserve x4'},
    {name:'Mithril Ingot',quest:0,craft:28,weekly:1,start:25,uses:'I/L wand crafting reserve x28'},
    {name:'Piece of Ice',quest:1,craft:2,weekly:0,start:25,uses:'Reawakening the Gladius x1 · Ice Wand/Cromi reserve x2'},
    {name:'Screw',quest:80,craft:120,weekly:10,start:20,uses:'Luke/Pia/Blackbull quest demand x80 · I/L wand crafting reserve x120'},
    {name:'Aquamarine',quest:0,craft:4,weekly:0,start:30,uses:'Mithril Wand reserve x4'},
    {name:'Topaz',quest:1,craft:17,weekly:0,start:25,uses:'Arcforger x1 · Wizard/Fairy/Cromi reserve x17'},
    {name:'Sapphire',quest:4,craft:3,weekly:0,start:40,uses:'Corporal Easy x4 · Fairy Wand reserve x3'},
    {name:'Diamond',quest:3,craft:3,weekly:0,start:32,uses:'Maya/house/Cold Milk x3 · Fairy Wand reserve x3'},
    {name:'Fairy Wing',quest:0,craft:1,weekly:0,start:40,uses:'Fairy Wand reserve x1',exact:true},
    {name:'Emerald',quest:0,craft:4,weekly:0,start:50,uses:'Cromi reserve x4'},

    {name:'Cursed Doll',quest:600,craft:0,weekly:0,start:36,uses:'Cursed Doll chain 50+70+100+150+200 · Forgotten Hollow x30'},
    {name:'Stone Golem Rubble',quest:150,craft:0,weekly:0,start:47,uses:"Maya's Last Collection x50 · Blackbull's New House x100"},
    {name:'Tablecloth',quest:100,craft:0,weekly:100,start:30,uses:"Maya's Second Collection x20 · Blackbull delivery x30 · Icarus Balloon x50"},
    {name:'Lorang Claw',quest:100,craft:0,weekly:100,start:37,uses:'Florina Beach II x30 · III x60 · IV x10'},
    {name:"Star Pixie's Starpiece",quest:100,craft:0,weekly:0,start:55,uses:'To Acquire the Fairy Dust x100'},
    {name:'Hector Tail',quest:100,craft:0,weekly:0,start:55,uses:'Collecting Wolf Skin x100'},
    {name:'White Fang Tail',quest:100,craft:0,weekly:0,start:55,uses:'Collecting Wolf Skin x100'},
    {name:'Cerebes Tooth',quest:100,craft:0,weekly:0,start:70,uses:"Nick's Ring x100"},
    {name:'Drake Skull',quest:85,craft:0,weekly:100,start:41,uses:"Jane's First Challenge x25 · Luke travel x30 · Blackbull delivery x30"},
    {name:"Lupin's Banana",quest:85,craft:0,weekly:100,start:32,uses:'Hungry Ronnie x30 · Florina Beach II/III/IV x55'},
    {name:'Dragon Skin',quest:80,craft:0,weekly:0,start:41,uses:"Jane's Final Challenge x20 · Luke x20 · Pia x30 · Blackbull x10"},
    {name:'Curse Eye Tail',quest:80,craft:0,weekly:100,start:32,uses:'Blackbull delivery x30 · Secret to Unagi Special x50'},
    {name:'Clang Claw',quest:70,craft:0,weekly:0,start:37,uses:'Florina Beach III x60 · IV x10'},
    {name:'Coconut',quest:65,craft:0,weekly:0,start:37,uses:'Florina Beach I/II/III/IV x65'},
    {name:"Bubbling's Huge Bubble",quest:60,craft:0,weekly:100,start:17,uses:"Maya's Second Collection x20 · Blackbull delivery x30 · Making the Medicine x10"},
    {name:'Cold Eye Tail',quest:60,craft:0,weekly:100,start:41,uses:"Maya's Third Collection x30 · Blackbull delivery x30"},
    {name:'Squishy Liquid',quest:52,craft:0,weekly:100,start:10,uses:"Arcon x30 · Homework x10 · I'm Bored 2 x12"},
    {name:'Stirge Wing',quest:50,craft:0,weekly:100,start:17,uses:'Luke x10 · Icarus Hang Glider x30 · Making the Medicine x10'},
    {name:"Fire Boar's Tooth",quest:50,craft:0,weekly:100,start:30,uses:"Maya's Second Collection x20 · Blackbull delivery x30"},
    {name:'Dark Stone Golem Rubble',quest:50,craft:0,weekly:0,start:47,uses:"Maya's Last Collection x50"},
    {name:'Croco Skin',quest:50,craft:0,weekly:0,start:48,uses:'Taking Out the Alligators 2 x50'},
    {name:"Lunar Pixie's Moonpiece",quest:50,craft:0,weekly:0,start:55,uses:'To Acquire the Fairy Dust x50'},
    {name:"Zombie's Lost Tooth",quest:50,craft:0,weekly:0,start:55,uses:'Acquiring the Memory Powder x50'},
    {name:"Zombie's Lost Gold Tooth",quest:50,craft:0,weekly:0,start:55,uses:'Acquiring the Memory Powder x50'},
    {name:'Processed Wood',quest:40,craft:0,weekly:1,start:31,uses:'Icarus Hang Glider x10 · Blackbull New House x30'},
    {name:'Stiff Feather',quest:35,craft:0,weekly:0,start:22,uses:'Chris x20 · Icarus Hang Glider x15'},
    {name:'Jr. Sentinel Shellpiece',quest:33,craft:0,weekly:0,start:1,uses:"Todd's How-to-Hunt x3 · Huckle x30"},
    {name:"Iron Hog's Metal Hoof",quest:30,craft:0,weekly:0,start:47,uses:"Maya's Third Collection x30"},
    {name:'Lupin Doll',quest:30,craft:0,weekly:0,start:47,uses:"Maya's Third Collection x30"},
    {name:'Tortie Shell',quest:30,craft:0,weekly:100,start:47,uses:"Maya's Third Collection x30"},
    {name:'Evil Eye Tail',quest:30,craft:0,weekly:100,start:22,uses:"Cutthroat Manny's Request x30"},
    {name:'Firewood',quest:30,craft:0,weekly:100,start:17,uses:"Fossil Research x15 · Bruce's Cooking Ingredients x15"},
    {name:"Luster Pixie's Sunpiece",quest:30,craft:0,weekly:0,start:55,uses:'To Acquire the Fairy Dust x30'},
    {name:'Leather',quest:25,craft:0,weekly:0,start:10,uses:"Chris's Request x20 · JM apprentice x5"},
    {name:'Mushroom Spore',quest:10,craft:0,weekly:0,start:10,uses:'The Reason Behind the Mushroom Studies x10'}
  ];
  const weeklyOnly=[
    {name:'Red Snail Shell',count:100,start:1,group:'Citizenship donation rotation'},
    {name:'Wild Boar Tooth',count:100,start:20,group:'Citizenship donation rotation'}
  ];
  const previous=new Map(D.etc.map(x=>[norm(x.Item),x]));
  const audit=new Map();
  const next=[];
  for(const a of rows){
    const aliases=[a.name,...(a.aliases||[])];let old=null;
    for(const alias of aliases){old=previous.get(norm(alias));if(old)break;}
    const base=Number(a.quest||0)+Number(a.craft||0),keep=a.exact?base:keepFor(base);
    const row={...(old||{}),Item:a.name,'Start Saving':`Lv${a.start}`,'Core Quest Need':Number(a.quest||0),'Crafting Need':Number(a.craft||0),'Optional / Donation':Number(a.weekly||0),'Core + Craft Minimum':base,'All-In Total':keep,'Used For':a.uses,'Stop Saving When':a.weekly?`After KEEP ${keep}. Only collect +${a.weekly} when an active weekly asks for it.`:`After KEEP ${keep} or after the listed uses are complete.`,'Confidence':'Quest-audited','Source / Note':'Permanent target excludes rotating weekly donations.','Start Lv':a.start,'Lifetime Quest Need':Number(a.quest||0),'Build Craft Reserve':Number(a.craft||0),'Permanent Keep':keep,'Weekly Extra':Number(a.weekly||0),'Quest Uses':a.uses};
    next.push(row);audit.set(norm(a.name),{...a,base,keep});
  }
  next.sort((a,b)=>Number(a['Start Lv']||999)-Number(b['Start Lv']||999)||String(a.Item).localeCompare(String(b.Item)));
  D.etc=next;
  window.TCW_ETC_AUDIT={revision:'2026-09-04',buffer:0.15,rows:audit,weeklyOnly,rule:'one-time quest demand + build crafting reserve, then 15% buffer; rotating weekly requirements excluded'};

  try{
    const raw=JSON.parse(localStorage.getItem(KEY)||'{}');let changed=false;
    const migrations=[['pig-head','pig-s-head'],['glass-shoe','arwen-s-glass-shoe']];
    for(const bucket of ['etcHeld','etcDone']){
      raw[bucket]=raw[bucket]||{};
      for(const [from,to] of migrations){if(raw[bucket][from]!==undefined&&raw[bucket][to]===undefined){raw[bucket][to]=raw[bucket][from];delete raw[bucket][from];changed=true;}}
    }
    if(changed)localStorage.setItem(KEY,JSON.stringify(raw));
  }catch(e){}
  document.documentElement.classList.add('etc-lifetime-data-ready');
})();
