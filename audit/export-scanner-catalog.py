import json, pathlib, shutil, sys
root=pathlib.Path(__file__).resolve().parents[1]
target=pathlib.Path(sys.argv[1]) if len(sys.argv)>1 else root/'scanner'
target.mkdir(parents=True,exist_ok=True)
raw=json.loads((root/'audit/fighter-items.json').read_text())
items=raw['items']+[{**item,'category':'Scroll'} for item in raw['scrolls']]
(target/'items.json').write_text(json.dumps({'items':items},ensure_ascii=False),encoding='utf-8')
print(f'Exported {len(items)} items to {target}')
