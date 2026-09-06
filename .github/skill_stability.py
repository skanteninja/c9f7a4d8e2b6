"""Real-input regression, shared by the generated build and deployed site."""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request
import websocket

base = sys.argv[1].rstrip('/')
chrome = next(filter(None, (shutil.which(n) for n in ('google-chrome', 'chromium', 'chromium-browser'))))
profile = tempfile.TemporaryDirectory(prefix='tcw-skill-test-')
process = subprocess.Popen([chrome, '--headless', '--no-sandbox', '--disable-gpu',
    '--window-size=1440,1000', '--remote-debugging-port=9333', '--remote-allow-origins=*',
    '--user-data-dir=' + profile.name, base + '/?skill-regression=real-input'],
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    for _ in range(100):
        try:
            tabs = json.load(urllib.request.urlopen('http://127.0.0.1:9333/json'))
            target = next(t for t in tabs if t['type'] == 'page')
            break
        except Exception:
            time.sleep(.1)
    ws = websocket.create_connection(target['webSocketDebuggerUrl'], timeout=60)
    seq = 0

    def send(method, params=None):
        global seq
        seq += 1
        ws.send(json.dumps(dict(id=seq, method=method, params=params or {})))
        while True:
            msg = json.loads(ws.recv())
            if msg.get('id') == seq:
                assert 'error' not in msg, msg
                return msg.get('result', {})

    def ev(code):
        out = send('Runtime.evaluate', dict(expression=code, awaitPromise=True, returnByValue=True))
        assert not out.get('exceptionDetails'), out
        return out.get('result', {}).get('value')

    def ready():
        assert ev("""new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{
          const cards=[...document.querySelectorAll('#atlas-skill-grid .atlas-skill-card')];
          if(cards.length && cards.every(c=>{const i=c.querySelector('img');return i?.complete&&i.naturalWidth>0&&i.dataset.skillId})){
            clearInterval(t);resolve(true);
          }else if(++n>400){clearInterval(t);reject(Error('decoded canonical skills not ready'));}
        },100)})""")
        time.sleep(.4)

    def set_level(n):
        ev("""(()=>{const s=document.getElementById('level-select');s.value='%s';s.dispatchEvent(new Event('change',{bubbles:true}));})()""" % n)
        time.sleep(.5)
        ready()

    def click(selector):
        point = ev("""(()=>{const e=document.querySelector(%s);e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()""" % json.dumps(selector))
        send('Input.dispatchMouseEvent', dict(type='mousePressed', button='left', clickCount=1, **point))
        send('Input.dispatchMouseEvent', dict(type='mouseReleased', button='left', clickCount=1, **point))

    def snapshot():
        ev("""(()=>{
          const grid=document.getElementById('atlas-skill-grid');
          window.__skillCheck={grid,panel:grid.closest('.tcw-hero-skill-tree'),cards:[...grid.children],images:[...grid.querySelectorAll('img')],loads:0,children:0,sources:0,trusted:false};
          const s=window.__skillCheck;s.urls=s.images.map(i=>i.getAttribute('src'));s.height=Math.round(grid.closest('.v5-character-hero').getBoundingClientRect().height);
          s.onLoad=()=>s.loads++;s.onClick=e=>{if(e.isTrusted)s.trusted=true;};
          grid.addEventListener('load',s.onLoad,true);document.addEventListener('click',s.onClick,true);
          s.observer=new MutationObserver(rs=>rs.forEach(r=>{if(r.type==='childList')s.children++;else if(r.attributeName==='src')s.sources++;}));
          s.observer.observe(grid,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});
        })()""")

    def check(n, trusted=True):
        time.sleep(1.3)
        result = ev("""(()=>{const s=window.__skillCheck,g=document.getElementById('atlas-skill-grid');return {
          level:document.getElementById('hero-level').textContent,
          panel:g.closest('.tcw-hero-skill-tree')===s.panel,grid:g===s.grid,
          cards:s.cards.every((c,i)=>g.children[i]===c),images:s.images.every((im,i)=>g.querySelectorAll('img')[i]===im),
          urls:s.images.every((im,i)=>im.getAttribute('src')===s.urls[i]),loads:s.loads,children:s.children,sources:s.sources,trusted:s.trusted,
          states:[...g.children].map(c=>({name:c.dataset.skillName,sp:Number(c.querySelector('small').textContent.match(/Lv. (\\d+)/)[1]),filter:getComputedStyle(c).filter,opacity:getComputedStyle(c).opacity})),
          magic:[...g.querySelectorAll('[data-skill-name="Magic Claw"] img')].map(im=>({id:im.dataset.skillId,src:im.getAttribute('src')})),
          height:Math.round(g.closest('.v5-character-hero').getBoundingClientRect().height),beforeHeight:s.height
        }})()""")
        assert result['level'] == str(n), result
        for key in ('panel', 'grid', 'cards', 'images', 'urls'):
            assert result[key], (key, result)
        for key in ('loads', 'children', 'sources'):
            assert result[key] == 0, (key, result)
        if trusted:
            assert result['trusted'], result
        for c in result['states']:
            if c['sp'] == 0:
                assert 'grayscale(1)' in c['filter'] and float(c['opacity']) < .5, c
            else:
                assert c['filter'] == 'none' and c['opacity'] == '1', c
        if result['magic']:
            assert result['magic'] == [dict(id='2001003', src='/game-data/data/current/images/skills/2001003.png')], result
        assert result['height'] == result['beforeHeight'], result
        print(json.dumps(dict(base=base, level=n, stable=True, loads=0, child_mutations=0, states=result['states'])), flush=True)

    def finish():
        ev("""(()=>{const s=window.__skillCheck;s.observer.disconnect();s.grid.removeEventListener('load',s.onLoad,true);document.removeEventListener('click',s.onClick,true);})()""")

    ev("""new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{if(document.getElementById('level-select')&&document.querySelector('.tcw-hero-skill-tree')){clearInterval(t);resolve(true)}else if(++n>400){clearInterval(t);reject(Error('dashboard not ready'))}},100)})""")
    # Real native clicks expose the capture-listener/microtask bug missed by dispatchEvent.
    for start, steps in ((15,(16,17)), (10,(11,)), (2,(3,4)), (31,(32,33))):
        set_level(start)
        snapshot()
        for n in steps:
            click('#level-next')
            check(n)
        finish()
    # A native keyboard slider update and a gear breakpoint must also preserve skills.
    set_level(19)
    snapshot()
    ev("document.getElementById('level-range').focus()")
    send('Input.dispatchKeyEvent', dict(type='keyDown', key='ArrowRight', code='ArrowRight', windowsVirtualKeyCode=39))
    send('Input.dispatchKeyEvent', dict(type='keyUp', key='ArrowRight', code='ArrowRight', windowsVirtualKeyCode=39))
    check(20, trusted=False)
    finish()
    for start, end, tier in ((9,10,'magician'),(29,30,'il')):
        set_level(start)
        click('#level-next')
        time.sleep(.6)
        ready()
        assert ev("document.documentElement.dataset.classProgressionStage") == tier
        assert ev("document.getElementById('hero-level').textContent") == str(end)
    print('real-input-skill-stability-ok', base, flush=True)
    ws.close()
finally:
    process.terminate()
    process.wait(timeout=10)
    profile.cleanup()
