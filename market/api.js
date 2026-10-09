import {itemsById} from './catalog.js';
import contributors from './contributors.json';

export const json = (body, status=200) => new Response(JSON.stringify(body), {
  status, headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}
});
export async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
}
function text(value, name, max=100) {
  if(typeof value !== 'string' || !value.trim() || value.length>max || /[\u0000-\u001f\u007f]/.test(value)) throw new Error(`Invalid ${name}`);
  return value.trim();
}
function integer(value,name,min,max) {
  if(!Number.isSafeInteger(value)||value<min||value>max)throw new Error(`Invalid ${name}`);
  return value;
}
export function normalizeLearning(raw) {
  if(raw==null)return null;
  if(typeof raw!=='object'||Array.isArray(raw))throw new Error('Invalid learning example');
  const readings={};
  for(const key of ['name','price','quantity','shop','channel','room']) {
    const value=raw.readings?.[key]??'';
    if(typeof value!=='string'||value.length>512||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value))throw new Error('Invalid OCR reading');
    readings[key]=value;
  }
  if(!Array.isArray(raw.matches)||raw.matches.length>5)throw new Error('Invalid OCR matches');
  const matches=raw.matches.map(m=>{
    if(!itemsById.has(m.itemId)||!Number.isFinite(m.confidence)||m.confidence<0||m.confidence>1)throw new Error('Invalid OCR match');
    return {itemId:m.itemId,confidence:m.confidence};
  });
  return {version:text(raw.version,'scanner version',40),readings,matches};
}
export function normalizeListing(raw, now=Date.now()) {
  const itemId=integer(raw.itemId,'item ID',1,99999999);
  if(!itemsById.has(itemId))throw new Error('Item is not in the catalog');
  const observedAt=Date.parse(raw.observedAt);
  if(!Number.isFinite(observedAt)||observedAt>now+120000||observedAt<now-30*86400000)throw new Error('Observation timestamp is invalid or more than 30 days old');
  if(raw.reviewed!==true)throw new Error('Confirm the listing before uploading');
  if(!['unit','bundle'].includes(raw.priceBasis))throw new Error('Confirm whether the displayed price is per item or per bundle');
  const stats=raw.stats==null?{}:raw.stats;
  if(typeof stats!=='object'||Array.isArray(stats)||Object.keys(stats).length>24)throw new Error('Invalid observed stats');
  const safeStats={};
  for(const [key,value] of Object.entries(stats)) {
    if(!/^[A-Za-z0-9 .%+_-]{1,30}$/.test(key)||!Number.isSafeInteger(value)||Math.abs(value)>999999)throw new Error('Invalid observed stat');
    safeStats[key]=value;
  }
  let evidence=null;
  if(raw.evidence) {
    if(typeof raw.evidence!=='string'||raw.evidence.length>100000||!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(raw.evidence))throw new Error('Evidence must be a small PNG/JPEG crop');
    evidence=raw.evidence;
  }
  return {
    nickname:text(raw.nickname||'Anonymous contributor','nickname',32),eventId:text(raw.eventId,'event ID',80),itemId,name:itemsById.get(itemId).name,
    server:text(raw.server,'server',60),world:text(raw.world,'world',60),
    channel:integer(raw.channel,'channel',1,100),room:integer(raw.room,'room',1,100),
    seller:text(raw.seller,'seller',50),shop:text(raw.shop||raw.seller,'shop',100),
    slot:integer(raw.slot,'shop slot',1,200),quantity:integer(raw.quantity,'quantity',1,9999999),
    price:integer(raw.price,'price',0,9000000000000),priceBasis:raw.priceBasis,
    stats:safeStats,statsKnown:raw.statsKnown===true,observedAt:new Date(observedAt).toISOString(),evidence,
    reviewed:true,learning:normalizeLearning(raw.learning)
  };
}
export async function marketApi(request,env) {
  const url=new URL(request.url),p=url.pathname;
  if(!env.MARKET)return json({error:'Shared market storage is unavailable',available:false},503);
  if(p==='/api/market/listings'&&request.method==='POST') {
    const token=request.headers.get('Authorization')?.match(/^Bearer ([A-Za-z0-9_-]{30,160})$/)?.[1];
    if(!token)return json({error:'Scanner key required'},401);
    const hash=await sha256(token),contributor=contributors.find(c=>c.keyHash===hash&&c.enabled);
    if(!contributor)return json({error:'Invalid or revoked scanner key'},403);
    if(Number(request.headers.get('content-length')||0)>1000000)return json({error:'Upload is too large'},413);
    try {
      const body=await request.text();if(body.length>1000000)return json({error:'Upload is too large'},413);
      const parsed=JSON.parse(body),rows=Array.isArray(parsed.listings)?parsed.listings:[parsed];
      if(!rows.length||rows.length>12)return json({error:'Send 1–12 listings per upload'},400);
      const normalized=rows.map(row=>({...normalizeListing(row),contributor:contributor.id}));
      return env.MARKET.get(env.MARKET.idFromName('shared-classic-market-v1')).fetch(new Request(request.url, {
        method:'POST',headers:{'Content-Type':'application/json','X-Market-Contributor':contributor.id},
        body:JSON.stringify({listings:normalized})
      }));
    }catch(error){return json({error:error.message||'Invalid listing upload'},400);}
  }
  if(request.method!=='GET')return json({error:'Method not allowed'},405);
  if(!['/api/market/listings','/api/market/status','/api/market/live','/api/market/history','/api/market/evidence','/api/market/learning'].includes(p))return json({error:'Not found'},404);
  return env.MARKET.get(env.MARKET.idFromName('shared-classic-market-v1')).fetch(request);
}

export class MarketListings {
  constructor(ctx,env) {
    this.ctx=ctx;this.env=env;this.sql=ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS offers (
      id TEXT PRIMARY KEY, item_id INTEGER NOT NULL, server TEXT NOT NULL, world TEXT NOT NULL,
      channel INTEGER NOT NULL, room INTEGER NOT NULL, seller TEXT NOT NULL, shop TEXT NOT NULL,
      slot INTEGER NOT NULL, quantity INTEGER NOT NULL, price INTEGER NOT NULL, price_basis TEXT NOT NULL,
      unit_price REAL NOT NULL, stats_json TEXT NOT NULL, stats_known INTEGER NOT NULL,
      first_seen TEXT NOT NULL, last_seen TEXT NOT NULL, contributor TEXT NOT NULL, evidence TEXT,
      nickname TEXT NOT NULL DEFAULT 'Anonymous contributor',
      UNIQUE(server,world,channel,room,seller,shop,slot));
      CREATE INDEX IF NOT EXISTS offers_item_time ON offers(item_id,last_seen);
      CREATE INDEX IF NOT EXISTS offers_scope ON offers(server,world,channel,room);
      CREATE TABLE IF NOT EXISTS observations (event_id TEXT PRIMARY KEY, offer_id TEXT NOT NULL,
        item_id INTEGER NOT NULL, observed_at TEXT NOT NULL, received_at TEXT NOT NULL, data_json TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS observations_offer ON observations(offer_id,observed_at);
      CREATE TABLE IF NOT EXISTS scanner_learning (sequence INTEGER PRIMARY KEY AUTOINCREMENT,
        sample_id TEXT UNIQUE NOT NULL, received_at TEXT NOT NULL, data_json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS rate_limits (contributor TEXT PRIMARY KEY, window INTEGER NOT NULL, count INTEGER NOT NULL);`);
    if(!Array.from(this.sql.exec('PRAGMA table_info(offers)')).some(column=>column.name==='nickname'))this.sql.exec("ALTER TABLE offers ADD COLUMN nickname TEXT NOT NULL DEFAULT 'Anonymous contributor'");
  }
  broadcast() {
    const message=JSON.stringify({type:'listings-updated',at:new Date().toISOString()});
    for(const ws of this.ctx.getWebSockets())try{ws.send(message);}catch{}
  }
  async fetch(request) {
    const u=new URL(request.url),p=u.pathname;
    if(p.endsWith('/live')) {
      if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return json({error:'WebSocket upgrade required'},426);
      if(this.ctx.getWebSockets().length>=200)return json({error:'Live connection limit reached'},429);
      const origin=request.headers.get('Origin');if(origin&&origin!==u.origin)return json({error:'Origin rejected'},403);
      const pair=new WebSocketPair();this.ctx.acceptWebSocket(pair[1]);
      pair[1].send(JSON.stringify({type:'connected'}));
      return new Response(null,{status:101,webSocket:pair[0]});
    }
    if(p.endsWith('/status')) {
      const counts=this.sql.exec('SELECT COUNT(*) AS count,MAX(last_seen) AS lastSeen FROM offers').one();
      const scopes=Array.from(this.sql.exec('SELECT DISTINCT server,world FROM offers ORDER BY server,world'));
      return json({available:true,learningAvailable:true,count:counts.count,lastSeen:counts.lastSeen,scopes});
    }
    if(p.endsWith('/learning')) {
      const after=Number(u.searchParams.get('after')||0);
      if(!Number.isSafeInteger(after)||after<0)return json({error:'Invalid learning cursor'},400);
      const rows=Array.from(this.sql.exec('SELECT sequence,sample_id,received_at,data_json FROM scanner_learning WHERE sequence>? ORDER BY sequence LIMIT 100',after));
      return json({examples:rows.map(r=>({sequence:r.sequence,id:r.sample_id,receivedAt:r.received_at,...JSON.parse(r.data_json)})),next:rows.length?rows[rows.length-1].sequence:after});
    }
    if(p.endsWith('/history')) {
      const offerId=u.searchParams.get('offerId');if(!offerId||offerId.length>64)return json({error:'Offer ID required'},400);
      const rows=Array.from(this.sql.exec('SELECT data_json,received_at FROM observations WHERE offer_id=? ORDER BY observed_at DESC LIMIT 50',offerId));
      return json({observations:rows.map(row=>{const data=JSON.parse(row.data_json);return {...data,contributor:data.nickname||'Anonymous contributor',receivedAt:row.received_at};})});
    }
    if(p.endsWith('/evidence')) {
      const id=u.searchParams.get('offerId');
      const row=Array.from(this.sql.exec('SELECT evidence FROM offers WHERE id=?',id||''))[0];
      if(!row?.evidence)return json({error:'No evidence crop available'},404);
      const [,mime,base64]=row.evidence.match(/^data:(image\/(?:png|jpeg));base64,(.+)$/);
      return new Response(Uint8Array.from(atob(base64),c=>c.charCodeAt(0)),{headers:{'Content-Type':mime,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
    }
    if(request.method==='POST') {
      const {listings}=await request.json();const contributor=request.headers.get('X-Market-Contributor');
      const minute=Math.floor(Date.now()/60000),rate=Array.from(this.sql.exec('SELECT * FROM rate_limits WHERE contributor=?',contributor))[0];
      if(rate?.window===minute&&rate.count+listings.length>240)return json({error:'Upload limit reached; retry in one minute'},429);
      this.sql.exec('INSERT INTO rate_limits VALUES (?,?,?) ON CONFLICT(contributor) DO UPDATE SET window=excluded.window,count=excluded.count',contributor,minute,(rate?.window===minute?rate.count:0)+listings.length);
      let accepted=0,duplicates=0;
      this.ctx.storage.transactionSync(()=>{
        for(const row of listings) {
          const event=`${contributor}:${row.eventId}`;
          if(Array.from(this.sql.exec('SELECT event_id FROM observations WHERE event_id=?',event)).length){duplicates++;continue;}
          if(row.learning) {
            // Build public ground truth explicitly. Internal auth identity stays private.
            const corrected={};
            for(const key of ['itemId','name','price','quantity','priceBasis','shop','channel','room','slot','observedAt','nickname','server','world','stats','statsKnown'])corrected[key]=row[key];
            const sample={schemaVersion:1,scanner:row.learning,corrected,evidence:row.evidence};
            this.sql.exec('INSERT INTO scanner_learning (sample_id,received_at,data_json) VALUES (?,?,?)',crypto.randomUUID(),new Date().toISOString(),JSON.stringify(sample));
          }
          const old=Array.from(this.sql.exec('SELECT * FROM offers WHERE server=? AND world=? AND channel=? AND room=? AND seller=? AND shop=? AND slot=?',row.server,row.world,row.channel,row.room,row.seller,row.shop,row.slot))[0];
          const id=old?.id||crypto.randomUUID(),stats=JSON.stringify(row.stats),first=old&&old.item_id===row.itemId?old.first_seen:row.observedAt;
          const unit=row.priceBasis==='unit'?row.price:row.price/row.quantity;
          this.sql.exec('INSERT INTO observations VALUES (?,?,?,?,?,?)',event,id,row.itemId,row.observedAt,new Date().toISOString(),JSON.stringify({...row,evidence:undefined,learning:undefined,offerId:id}));
          if(!old||row.observedAt>=old.last_seen) {
            this.sql.exec(`INSERT INTO offers (id,item_id,server,world,channel,room,seller,shop,slot,quantity,price,price_basis,unit_price,stats_json,stats_known,first_seen,last_seen,contributor,evidence,nickname) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
              ON CONFLICT(id) DO UPDATE SET item_id=excluded.item_id,quantity=excluded.quantity,price=excluded.price,
              price_basis=excluded.price_basis,unit_price=excluded.unit_price,stats_json=excluded.stats_json,
              stats_known=excluded.stats_known,first_seen=excluded.first_seen,last_seen=excluded.last_seen,
              contributor=excluded.contributor,evidence=excluded.evidence,nickname=excluded.nickname`,
              id,row.itemId,row.server,row.world,row.channel,row.room,row.seller,row.shop,row.slot,row.quantity,row.price,row.priceBasis,unit,stats,row.statsKnown?1:0,first,row.observedAt,contributor,row.evidence,row.nickname||'Anonymous contributor');
          }
          accepted++;
        }
      });
      if(accepted)this.broadcast();
      return json({accepted,duplicates},201);
    }
    const where=[],args=[];
    for(const [param,column] of [['itemId','item_id'],['server','server'],['world','world'],['channel','channel'],['room','room']]) {
      const value=u.searchParams.get(param);if(value){where.push(`${column}=?`);args.push(value);}
    }
    const q=(u.searchParams.get('q')||'').trim().slice(0,80);
    if(q){const words=q.toLowerCase().split(/\s+/);const ids=Array.from(itemsById.values()).filter(i=>words.every(w=>i.name.toLowerCase().includes(w))||String(i.id)===q).map(i=>i.id);if(!ids.length)return json({listings:[],total:0});where.push('item_id IN (SELECT CAST(value AS INTEGER) FROM json_each(?))');args.push(JSON.stringify(ids));}
    const age=u.searchParams.get('age')||'24';
    if(age!=='all'){const hours=Math.min(720,Math.max(1,Number(age)||24));where.push('last_seen>=?');args.push(new Date(Date.now()-hours*3600000).toISOString());}
    const clause=where.length?' WHERE '+where.join(' AND '):'';
    const sort=u.searchParams.get('sort')==='price'?'unit_price ASC,last_seen DESC':'last_seen DESC';
    const limit=Math.min(100,Math.max(1,Number(u.searchParams.get('limit'))||50));
    const offset=Math.max(0,Math.min(100000,Number(u.searchParams.get('offset'))||0));
    const total=this.sql.exec('SELECT COUNT(*) AS count FROM offers'+clause,...args).one().count;
    const rows=Array.from(this.sql.exec('SELECT * FROM offers'+clause+' ORDER BY '+sort+' LIMIT ? OFFSET ?',...args,limit,offset));
    return json({total,listings:rows.map(row=>({id:row.id,itemId:row.item_id,name:itemsById.get(row.item_id)?.name||'Unknown item',server:row.server,world:row.world,channel:row.channel,room:row.room,seller:row.seller,shop:row.shop,slot:row.slot,quantity:row.quantity,price:row.price,priceBasis:row.price_basis,unitPrice:row.unit_price,stats:JSON.parse(row.stats_json),statsKnown:!!row.stats_known,firstSeen:row.first_seen,lastSeen:row.last_seen,contributor:row.nickname||'Anonymous contributor',evidence:!!row.evidence}))});
  }
  webSocketMessage(ws,message){if(message==='ping')ws.send('pong');}
  webSocketClose(ws,code,reason){ws.close(code,reason);}
  webSocketError(ws){try{ws.close(1011,'Connection error');}catch{}}
}
