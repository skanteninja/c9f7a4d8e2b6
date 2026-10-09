import snapshot from '../audit/fighter-items.json';

export const items = [...snapshot.items, ...snapshot.scrolls.map(item => ({...item, category:'Scroll'}))]
  .map(item => ({...item, id:Number(item.id)}));
export const itemsById = new Map(items.map(item => [item.id,item]));
