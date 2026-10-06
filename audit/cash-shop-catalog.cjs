const fs = require('fs');
const path = require('path');
const source = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));

function betaDuration(item) {
  if (Number(item.limited_life) > 0) return {kind:'timed', hours:Number(item.limited_life)/3600, text:`${Number(item.limited_life)/3600} hours active pet life`};
  if (Number(item.life) > 0) return {kind:'timed', days:Number(item.life), text:`${item.life} days pet life`};
  if (Number(item.period) > 0) return {kind:'timed', days:Number(item.period), text:`${item.period} days`};
  // Unavailable entries have no sold commodity from which to establish expiry.
  if (item.on_sale && Number(item.price) > 0 && Number(item.period) === 0) return {kind:'permanent', text:'Permanent'};
  return {kind:'unknown', text:'Duration unconfirmed'};
}

function cashShopCatalogs(version) {
  const beta = source('beta-cash-shop.json');
  const founders = source('nexon-founders-cash-shop.json');
  return {
    version,
    defaultCatalog:'founders-access',
    catalogs:{
      'founders-access':{
        ...founders,
        items:founders.items.map(item => ({...item, image:item.image.replace('https://g.nexonstatic.com/media/', '/game-media/nexon/')}))
      },
      beta:{
        id:'beta', label:'Beta Cash Shop', archived:true,
        snapshotCommit:'d744a66e48fe5c80a33ce464693b869c0a4f556c',
        snapshotBlob:'d7fa4ff0b3b7269f2dac0fa62b2bb64f48b58f2b',
        items:beta.categories.flatMap(category => category.items.map(item => ({
          ...item,
          catalogId:`beta-${item.id}`,
          image:item.thumbnail ? '/game-data/data/current/' + item.thumbnail : '',
          imageAlt:item.name,
          prices:[{count:Number(item.count)||1, price:Number(item.price)||0, currency:'NX'}],
          duration:betaDuration(item),
          details:[String(item.description||'').replace(/\\n/g,' ')].filter(Boolean)
        })))
      }
    }
  };
}

module.exports = {cashShopCatalogs, betaDuration};
