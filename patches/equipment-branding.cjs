module.exports=function(app){
 const old="${item&&name!=='None'?imgTag(item):`<span class=\"slot-name\">${label}</span>`}<em>${esc(label)}</em>";
 if(!app.includes(old))throw Error('Equipment label template missing');
 app=app.replace(old,"${item&&name!=='None'?imgTag(item):''}<span class=\"slot-name\">${esc(label)}</span>");
 const helper=`  function classEmblem(cls){
    const names={beginner:'Beginner',warrior:'Warrior',magician:'Magician',bowman:'Bowman',thief:'Thief'};
    const name=names[cls?.id]||'Beginner';
    return '<img class="class-emblem-icon" src="/game-media/class-emblems/'+name+'.png" alt="'+name+' emblem" width="32" height="32">';
  }
`;
 app=app.replace('  function renderEquipment(windowId,summaryId){',helper+'  function renderEquipment(windowId,summaryId){');
 app=app.replace("const core=skillImgTag('Cold Beam','core-skill-icon');","const cls=classForBuild();const core=classEmblem(cls);");
 app=app.replace('${core}<span>ICE / LIGHTNING</span>','${core}<span>${esc(activeBuild()?.id===\'magician-il-fresh\'?\'ICE / LIGHTNING\':cls?.name||\'Beginner\')}</span>');
 app=app.replace('${esc(cls.icon||\'◇\')}','${classEmblem(cls)}');
 return app;
};
