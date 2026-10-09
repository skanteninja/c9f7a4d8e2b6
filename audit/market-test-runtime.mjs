// Execute the actual Worker API against Node's SQLite for portable local checks.
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
const snapshot=JSON.parse(fs.readFileSync(new URL('fighter-items.json',import.meta.url)));
const items=[...snapshot.items,...snapshot.scrolls.map(i=>({...i,category:'Scroll'}))];
globalThis.__marketItems=new Map(items.map(i=>[i.id,i]));
globalThis.__marketContributors=JSON.parse(fs.readFileSync(new URL('../market/contributors.json',import.meta.url)));
const source=fs.readFileSync(new URL('../market/api.js',import.meta.url),'utf8')
  .replace("import {itemsById} from './catalog.js';",'const itemsById=globalThis.__marketItems;')
  .replace("import contributors from './contributors.json';",'const contributors=globalThis.__marketContributors;');
export const api=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
export function environment(legacy=false) {
  const db=new DatabaseSync(':memory:');
  if(legacy)db.exec(`CREATE TABLE offers(id TEXT PRIMARY KEY,item_id INTEGER NOT NULL,server TEXT NOT NULL,world TEXT NOT NULL,channel INTEGER NOT NULL,room INTEGER NOT NULL,seller TEXT NOT NULL,shop TEXT NOT NULL,slot INTEGER NOT NULL,quantity INTEGER NOT NULL,price INTEGER NOT NULL,price_basis TEXT NOT NULL,unit_price REAL NOT NULL,stats_json TEXT NOT NULL,stats_known INTEGER NOT NULL,first_seen TEXT NOT NULL,last_seen TEXT NOT NULL,contributor TEXT NOT NULL,evidence TEXT,UNIQUE(server,world,channel,room,seller,shop,slot));`);
  const sql={exec(query,...args){
    if(!args.length&&query.includes(';')){db.exec(query);return [];}
    const statement=db.prepare(query),rows=statement.all(...args);
    rows.one=()=>{if(rows.length!==1)throw new Error('Expected one row');return rows[0];};return rows;
  }};
  const ctx={storage:{sql,transactionSync(fn){db.exec('BEGIN');try{const result=fn();db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}}},getWebSockets:()=>[]};
  const object=new api.MarketListings(ctx,{});
  return {object,db,env:{MARKET:{idFromName:name=>name,get:()=>object}}};
}
