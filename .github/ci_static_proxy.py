#!/usr/bin/env python3
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
import argparse

ORIGIN_RAW='https://raw.githubusercontent.com/ohmi69/osms_datamine_dashboard/main/'
MEOW='https://meowdb.com/msclassic/api/assets/icons/'
DREAM_ITEM='https://api.dreamms.gg/api/GMS/latest/item/'
DREAM_PET='https://api.dreamms.gg/api/GMS/latest/pet/'
MAPLE_ITEM='https://maplestory.io/api/GMS/83/item/'
MAPLE_SKILL='https://maplestory.io/api/wz/img/GMS/83/Skill/'


def upstream(path):
    parsed=urlsplit(path)
    p=parsed.path
    suffix=('?'+parsed.query) if parsed.query else ''
    routes=(
        ('/game-origin/',ORIGIN_RAW),
        ('/game-art/meow/icons/',MEOW),
        ('/game-art/dream/item/',DREAM_ITEM),
        ('/game-art/dream/pet/',DREAM_PET),
        ('/game-art/mapleio/item/',MAPLE_ITEM),
        ('/game-art/mapleio/skill/',MAPLE_SKILL),
    )
    for prefix,base in routes:
        if p.startswith(prefix): return base+p[len(prefix):]+suffix
    return None


def handler(directory):
    class H(SimpleHTTPRequestHandler):
        def __init__(self,*args,**kwargs): super().__init__(*args,directory=directory,**kwargs)
        def do_GET(self):
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
