#!/usr/bin/env python3
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
import argparse, base64, json, re

CURRENT_DATA='https://raw.githubusercontent.com/ohmi69/osms_datamine_dashboard/main/'
ICON_MEDIA='https://meowdb.com/msclassic/api/assets/icons/'
WORLD_MAP_MEDIA='https://meowdb.com/msclassic/worldmap/'
PET_MEDIA='https://api.dreamms.gg/api/GMS/latest/pet/'
CHARACTER_MEDIA='https://api.dreamms.gg/api/GMS/latest/character/'
MONSTER_MEDIA='https://api.dreamms.gg/api/GMS/latest/mob/'
ITEM_MEDIA_FALLBACK='https://maplestory.io/api/GMS/83/item/'
SKILL_MEDIA='https://maplestory.io/api/wz/img/GMS/83/Skill/'
TINY_PNG=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=')
LEGACY_FIXTURE=[
    {'id':'105040300','name':'Sleepywood','street_name':'Dungeon','description':'Old-school Sleepywood town','bgm':'Bgm00/SleepyWood','return_map':'105040300','map_mark':'Sleepywood'},
    {'id':'105050300','name':'Ant Tunnel IV','street_name':'Dungeon','description':'Old-school Ant Tunnel','return_map':'105040300','map_mark':'Sleepywood'},
    {'id':'200000000','name':'Orbis','street_name':'Orbis','description':'Old-school Orbis','map_mark':'Orbis'},
    {'id':'211000000','name':'El Nath','street_name':'El Nath','description':'Old-school El Nath','map_mark':'ElNath'},
    {'id':'220000000','name':'Ludibrium','street_name':'Ludibrium','map_mark':'Ludibrium'},
    {'id':'230000000','name':'Aquarium','street_name':'Aquarium','map_mark':'Aquarium'},
    {'id':'240000000','name':'Leafre','street_name':'Leafre','map_mark':'Leafre'},
    {'id':'250000000','name':'Mu Lung','street_name':'Mu Lung','map_mark':'MuLung'},
    {'id':'251000000','name':'Herb Town','street_name':'Herb Town','map_mark':'MuLung'},
    {'id':'260000000','name':'Ariant','street_name':'Ariant','map_mark':'Ariant'},
    {'id':'261000000','name':'Magatia','street_name':'Magatia','map_mark':'Magatia'},
    {'id':'270000000','name':'Temple of Time','street_name':'Temple of Time','map_mark':'TempleOfTime'},
    {'id':'600000000','name':'New Leaf City','street_name':'Masteria','map_mark':'NLC'},
    {'id':'800000000','name':'Mushroom Shrine','street_name':'Zipangu','map_mark':'MushroomShrine'},
]


def upstream(path):
    parsed=urlsplit(path)
    p=parsed.path
    suffix=('?'+parsed.query) if parsed.query else ''
    # Keep legacy primary URLs working, but resolve the numeric ID through
    # the Classic icon catalog instead of the incompatible DreamMS/GMS table.
    primary_match=re.match(r'^/game-media/items/primary/(\d+)(?:/icon)?$',p)
    if primary_match: return ICON_MEDIA+primary_match.group(1)
    routes=(
        ('/game-data/',CURRENT_DATA),
        ('/game-media/icons/',ICON_MEDIA),
        ('/game-media/worldmap/',WORLD_MAP_MEDIA),
        ('/game-media/pets/',PET_MEDIA),
        ('/game-media/characters/',CHARACTER_MEDIA),
        ('/game-media/monsters/',MONSTER_MEDIA),
        ('/game-media/items/fallback/',ITEM_MEDIA_FALLBACK),
        ('/game-media/skills/',SKILL_MEDIA),
    )
    for prefix,base in routes:
        if p.startswith(prefix): return base+p[len(prefix):]+suffix
    return None


def handler(directory):
    class H(SimpleHTTPRequestHandler):
        def __init__(self,*args,**kwargs): super().__init__(*args,directory=directory,**kwargs)
        def send_bytes(self,data,content_type):
            self.send_response(200);self.send_header('Content-Type',content_type);self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
        def do_GET(self):
            parsed=urlsplit(self.path);p=parsed.path
            if p=='/game-data/legacy/maps.json':
                data=json.dumps({'revision':'ci-gms-v83','count':len(LEGACY_FIXTURE),'maps':LEGACY_FIXTURE}).encode()
                return self.send_bytes(data,'application/json; charset=utf-8')
            if re.match(r'^/game-media/worldmap-legacy/[a-z0-9-]+\.png$',p,re.I) or re.match(r'^/game-media/legacy-map/\d{1,9}/minimap$',p):
                return self.send_bytes(TINY_PNG,'image/png')
            target=upstream(self.path)
            if not target: return super().do_GET()
            try:
                req=Request(target,headers={'User-Agent':'Top-Classic-World-CI/1.0','Accept':self.headers.get('Accept','*/*')})
                with urlopen(req,timeout=20) as r:
                    data=r.read()
                    self.send_response(r.status)
                    self.send_header('Content-Type',r.headers.get('Content-Type','application/octet-stream'))
                    self.send_header('Cache-Control','no-store')
                    self.send_header('Content-Length',str(len(data)))
                    self.end_headers();self.wfile.write(data)
            except Exception as exc:
                self.send_error(502,str(exc))
    return H


if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--directory',required=True);ap.add_argument('--port',type=int,default=4173)
    args=ap.parse_args()
    ThreadingHTTPServer(('127.0.0.1',args.port),handler(args.directory)).serve_forever()
