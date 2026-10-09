"""TCW Shopper scanner: calibrate screen regions, review OCR, publish to website."""
import base64, hashlib, io, json, os, queue, sys, threading, time
from datetime import datetime, timezone
from pathlib import Path
import tkinter as tk
from tkinter import ttk, filedialog, messagebox, simpledialog
from PIL import Image, ImageTk, ImageOps
from game_capture import GameCapture, CaptureUnavailable
from auto_detect import ocr_lines, detect, NameMemory
from core import UploadQueue, match_items, parse_integer, now_iso, validate_nickname, read_location, cursor_rectangle, associated_shop, needs_nickname_setup, learning_readings, ContextTracker

ASSETS = Path(getattr(sys, '_MEIPASS', Path(__file__).resolve().parent))
HOME = Path(os.getenv('LOCALAPPDATA', str(Path.home()))) / 'TCW-Shopper'
HOME.mkdir(parents=True, exist_ok=True)

class Scanner:
    def __init__(self, root):
        self.root = root; root.title('TCW · SHOPPER Scanner 0.16.0'); root.geometry('980x700'); root.minsize(900,620)
        self.messages = queue.Queue(); self.uploads = UploadQueue(HOME / 'uploads.sqlite')
        self.catalog = json.loads((ASSETS / 'items.json').read_text(encoding='utf-8'))['items']
        self.settings_path = HOME / 'settings.json'
        self.config = json.loads(self.settings_path.read_text()) if self.settings_path.exists() else {}
        bundled = json.loads((ASSETS / 'connection.json').read_text(encoding='utf-8'))
        if not self.config.get('api_key'):
            self.config.update({key: bundled[key] for key in ('endpoint', 'api_key')})
        self.name_memory=NameMemory(HOME / 'name-corrections.json')
        self.auto_detect=tk.BooleanVar(value=self.config.get('auto_detect',True))
        self.config['world'] = 'Windia'
        if self.config.get('capture_space')!='maplestory-client-v1':
            self.config['regions']={};self.config['screen_size']=None;self.config.pop('hover_anchor',None)
        self.scan_generation=0;self.closing=False
        self.game_capture=None;self.capture_status=tk.StringVar(value='Capture: waiting for MapleStory.exe')
        self.confirmed_session = 0; self.next_retry = time.monotonic()+30
        self.counts = tk.StringVar(); self.review_context = tk.StringVar(value='Select a captured item to review.')
        self.show_details = tk.BooleanVar(value=False)
        self.pending_candidates = None
        self.detected_context = tk.StringVar(value='Windia · Channel ? · FM room ? · Seller ? · Shop ?')
        self.running = False; self.camera = None; self.image = None; self.regions = self.config.get('regions', {})
        self.candidates = []; self.selected = None; self.upload_busy = False; self.capture_busy = False
        self.vars = {key: tk.StringVar(value=str(self.config.get(key, default))) for key, default in {
            'endpoint':'https://maplestory-classic.ofri505.workers.dev', 'api_key':'', 'server':'Classic World',
            'world':'Windia', 'channel':'', 'room':'', 'seller':'', 'shop':'', 'monitor':'0',
            'row_stride':'36', 'rows':'4', 'price_basis':'unit', 'tesseract':'', 'nickname':''}.items()}
        self.edit = {key: tk.StringVar() for key in ['item','price','quantity','slot','observed_at','stats']}
        self.share_learning = tk.BooleanVar(value=self.config.get('share_learning', True))
        self.stats_known = tk.BooleanVar(value=False)
        self.status = tk.StringVar(value='Ready. Open a shop in MapleStory and press Start scanning.')
        self.cursor_click=None; self.cursor_stop=threading.Event(); self.context_signature=None
        self.draw_ui(); self.root.after_idle(self.first_setup); self.root.after(200, self.pump); root.protocol('WM_DELETE_WINDOW', self.close)

    def first_setup(self):
        ask = needs_nickname_setup(self.config)
        self.config['nickname_setup_seen'] = True
        self.save()  # Persist before opening: cancel or restart never repeats setup.
        if ask: self.ask_nickname()

    def settings(self):
        window = tk.Toplevel(self.root); window.title('SHOPPER Settings'); window.geometry('620x500')
        tabs=ttk.Notebook(window);tabs.pack(fill='both',expand=True,padx=16,pady=16)
        general=ttk.Frame(tabs,padding=16);setup=ttk.Frame(tabs,padding=16);advanced=ttk.Frame(tabs,padding=16)
        for panel,title in [(general,'General'),(setup,'Screen setup'),(advanced,'Troubleshooting')]:tabs.add(panel,text=title)
        ttk.Label(general,text='Public nickname',font=('Segoe UI',12,'bold')).pack(anchor='w')
        ttk.Label(general,textvariable=self.vars['nickname']).pack(anchor='w',pady=6)
        ttk.Button(general,text='Change nickname',command=self.ask_nickname).pack(anchor='w')
        ttk.Label(general,text='Website connection included — ready to upload.').pack(anchor='w',pady=12)
        ttk.Checkbutton(general,text='Share reviewed scanner examples with the project',variable=self.share_learning,command=self.save).pack(anchor='w',pady=8)
        ttk.Label(general,text='Confirmed item crops, OCR readings and corrections are archived in the public project GitHub to improve future scanner versions. Full-screen captures and connection keys are excluded.',wraplength=530).pack(anchor='w')
        ttk.Label(setup,text='The scanner finds MapleStory.exe and follows its monitor automatically.',wraplength=530).pack(anchor='w',pady=(0,8))
        ttk.Checkbutton(setup,text='Find shop fields automatically (experimental)',variable=self.auto_detect,command=self.save).pack(anchor='w')
        ttk.Button(advanced,text='Manual calibration fallback',command=lambda:(window.destroy(),self.calibrate_capture())).pack(anchor='w',pady=10)
        for key,label in [('rows','Visible item rows'),('row_stride','Row spacing (pixels)'),('tesseract','Tesseract executable (optional)')]:
            row=ttk.Frame(setup);row.pack(fill='x',pady=5)
            ttk.Label(row,text=label,width=29).pack(side='left');ttk.Entry(row,textvariable=self.vars[key]).pack(side='left',fill='x',expand=True)
        ttk.Label(setup,text='Displayed price').pack(anchor='w',pady=(10,3))
        ttk.Combobox(setup,textvariable=self.vars['price_basis'],values=['unit','bundle'],state='readonly',width=14).pack(anchor='w')
        ttk.Label(setup,text='World: Windia. Automatic mode needs no calibration. Unreadable fields must be corrected before Publish.',wraplength=530).pack(anchor='w',pady=12)
        for label,command in [('Import screenshot',lambda:(window.destroy(),self.import_image())),('Read captured frame',self.read_current),('Retry waiting uploads',self.send)]:ttk.Button(advanced,text=label,command=command).pack(anchor='w',pady=6)
        ttk.Label(advanced,text='Uploads also retry automatically every 30 seconds while the scanner is open.',wraplength=530).pack(anchor='w',pady=12)
        ttk.Button(window,text='Done',command=lambda:(self.save(),window.destroy())).pack(anchor='e',padx=16,pady=(0,12))
        window.protocol('WM_DELETE_WINDOW',lambda:(self.save(),window.destroy()))

    def ask_nickname(self):
        while True:
            name=simpledialog.askstring('Your public nickname','Choose a nickname for your scans. It can be anything; your game character name is not required.',initialvalue=self.vars['nickname'].get(),parent=self.root)
            if name is None:
                self.status.set('Set your nickname in Settings before publishing scans.');return
            try:self.vars['nickname'].set(validate_nickname(name));self.save();return
            except ValueError as exc:messagebox.showwarning('Nickname',str(exc))

    def draw_ui(self):
        style = ttk.Style(); style.theme_use('clam')
        style.configure('.', background='#211725', foreground='#f3e7d5', fieldbackground='#35263b')
        style.configure('TButton', padding=7); style.configure('TEntry', fieldbackground='#35263b')
        style.configure('Treeview', background='#211725', foreground='#f3e7d5', fieldbackground='#211725', rowheight=30)
        self.root.configure(bg='#211725')
        outer = ttk.Frame(self.root, padding=18); outer.pack(fill='both', expand=True)
        ttk.Label(outer, text='SHOPPER · Shared shop scanner', font=('Segoe UI', 22, 'bold')).pack(anchor='w')
        ttk.Label(outer, text='Scan shops, review a captured item, then Publish.').pack(anchor='w', pady=(3,12))
        toolbar=ttk.Frame(outer);toolbar.pack(fill='x',pady=(0,10))
        self.start_button=ttk.Button(toolbar,text='Start scanning',command=self.toggle);self.start_button.pack(side='left')
        ttk.Button(toolbar,text='Settings',command=self.settings).pack(side='right')
        ttk.Label(toolbar,textvariable=self.vars['nickname']).pack(side='right',padx=12)
        ttk.Label(outer,textvariable=self.capture_status,wraplength=930).pack(anchor='w',pady=4)
        ttk.Label(outer,textvariable=self.detected_context,wraplength=930).pack(anchor='w',pady=4)
        ttk.Label(outer,textvariable=self.counts).pack(anchor='w',pady=4)
        self.update_counts()
        self.table=ttk.Treeview(outer,columns=('name','price','quantity','slot','confidence'),show='headings',height=6)
        for key,label,width in [('name','Detected item',420),('price','Price',130),('quantity','Quantity',90),('slot','Visible row',90),('confidence','Match',90)]:
            self.table.heading(key,text=label);self.table.column(key,width=width)
        self.table.pack(fill='both',expand=True,pady=8);self.table.bind('<<TreeviewSelect>>',self.select)
        editor=ttk.LabelFrame(outer,text='Selected item',padding=12);editor.pack(fill='x')
        ttk.Label(editor,textvariable=self.review_context,wraplength=900).pack(anchor='w',pady=(0,6))
        basic=ttk.Frame(editor);basic.pack(fill='x')
        for key,label,width in [('item','Item',48),('price','Price',16),('quantity','Quantity',8)]:
            group=ttk.Frame(basic);group.pack(side='left',fill='x',expand=key=='item',padx=(0,8))
            ttk.Label(group,text=label).pack(anchor='w')
            if key=='item':
                self.item_combo=ttk.Combobox(group,textvariable=self.edit[key],width=width);self.item_combo.pack(fill='x');self.item_combo.bind('<KeyRelease>',self.filter_items)
            else:ttk.Entry(group,textvariable=self.edit[key],width=width).pack(fill='x')
        footer=ttk.Frame(editor);footer.pack(fill='x',pady=(10,0))
        self.preview_label=ttk.Label(footer);self.preview_label.pack(side='left')
        self.publish_button=ttk.Button(footer,text='Publish',command=self.publish,state='disabled');self.publish_button.pack(side='right',padx=4)
        ttk.Checkbutton(editor,text='More details / corrections',variable=self.show_details,command=self.toggle_details).pack(anchor='w',pady=(8,0))
        self.details=ttk.Frame(editor)
        for index,(key,label) in enumerate([('channel','Channel'),('room','FM room'),('seller','Seller'),('shop','Shop')]):
            frame=ttk.Frame(self.details);frame.grid(row=0,column=index,sticky='ew',padx=4);self.details.columnconfigure(index,weight=1)
            ttk.Label(frame,text=label).pack(anchor='w');ttk.Entry(frame,textvariable=self.vars[key],width=16).pack(fill='x')
        for index,(key,label) in enumerate([('slot','Shop slot'),('observed_at','Captured at (UTC)'),('stats','Observed equipment stats (JSON)')],1):
            ttk.Label(self.details,text=label).grid(row=index,column=0,sticky='w',pady=3)
            ttk.Entry(self.details,textvariable=self.edit[key]).grid(row=index,column=1,columnspan=3,sticky='ew',padx=4)
        ttk.Checkbutton(self.details,text='Equipment tooltip stats recorded',variable=self.stats_known).grid(row=4,column=0,columnspan=4,sticky='w')
        ttk.Label(outer,textvariable=self.status,wraplength=930).pack(anchor='w',pady=10)

    def toggle_details(self):
        if self.show_details.get():
            self.details.pack(fill='x',pady=8);self.root.minsize(900,840)
        else:
            self.details.pack_forget();self.root.minsize(900,620)

    def update_counts(self):
        summary=self.uploads.summary()
        self.counts.set(f"Confirmed this session: {self.confirmed_session} · Uploaded: {summary['sent']} · Waiting: {summary['pending']}")

    def filter_items(self,event=None):
        q=self.edit['item'].get().lower();self.item_combo['values']=[f"{i['name']} · #{i['id']}" for i in self.catalog if q in i['name'].lower()][:60]

    def save(self):
        self.config.update({k:v.get() for k,v in self.vars.items()});self.config['regions']=self.regions;self.config['share_learning']=self.share_learning.get()
        self.config['auto_detect']=self.auto_detect.get()
        self.settings_path.write_text(json.dumps(self.config,indent=2),encoding='utf-8')
        self.status.set('Settings saved locally.')

    def load_connection(self):
        path=filedialog.askopenfilename(filetypes=[('Connection JSON','*.json')])
        if not path:return
        try:
            data=json.loads(Path(path).read_text());self.vars['endpoint'].set(data['endpoint']);self.vars['api_key'].set(data['api_key']);self.save()
        except Exception as exc:messagebox.showerror('Connection file',str(exc))

    def frame(self,monitor=None):
        if self.game_capture is None:self.game_capture=GameCapture()
        image=self.game_capture.frame()
        game=self.game_capture.window
        self.messages.put(('capture_status',f"Capturing MapleStory.exe · PID {game.pid} · {self.game_capture.display} · {image.width}×{image.height} · {datetime.now().strftime('%H:%M:%S')}"))
        return image

    def calibrate_capture(self):
        if self.running:self.toggle()
        if self.capture_busy:return
        self.root.iconify();self.capture_busy=True
        def capture():
            try:time.sleep(.6);self.messages.put(('calibrate',self.frame()))
            except Exception as exc:self.messages.put(('error',str(exc)))
            finally:self.messages.put(('capture_done',None))
        threading.Thread(target=capture,daemon=True).start()

    def import_image(self):
        path=filedialog.askopenfilename(filetypes=[('Screenshot','*.png *.jpg *.jpeg')])
        if not path:return
        try:
            self.image=Image.open(path).convert('RGB');self.imported_time=datetime.fromtimestamp(Path(path).stat().st_mtime,timezone.utc).isoformat().replace('+00:00','Z')
            if self.auto_detect.get():self.read_current()
            else:self.calibration(self.image)
            self.status.set('Imported screenshot. File modified time is a suggested capture time; confirm it before publishing.')
        except Exception as exc:messagebox.showerror('Screenshot',str(exc))

    def calibration(self,image):
        self.image=image;self.root.deiconify()
        window=tk.Toplevel(self.root);window.title('Calibrate visible shop — first row fields');window.geometry('1040x750')
        scale=min(1000/image.width,610/image.height,1);shown=image.resize((int(image.width*scale),int(image.height*scale)))
        canvas=tk.Canvas(window,width=shown.width,height=shown.height,bg='#110b15');canvas.pack()
        photo=ImageTk.PhotoImage(shown);canvas.create_image(0,0,image=photo,anchor='nw');canvas.photo=photo
        active=tk.StringVar(value='name');row=ttk.Frame(window);row.pack(fill='x',pady=6)
        for key,label in [('name','Item name'),('price','Price'),('quantity','Quantity'),('seller','Seller'),('shop','Shop title'),('channel','Channel'),('room','Top-left map label'),('hover','Shop sign'),('anchor','Cursor anchor')]:ttk.Radiobutton(row,text=label,variable=active,value=key).pack(side='left',padx=2)
        ttk.Label(window,text='Drag item fields in the FIRST row; title/channel/map are fixed. For cursor tracking: click Cursor anchor at the pointer, then drag Shop sign around that shop name.').pack()
        start=[0,0];box=[None]
        def down(event):start[:]=[event.x,event.y];box[0]=canvas.create_rectangle(event.x,event.y,event.x,event.y,outline='#ffe0a1',width=2)
        def move(event):
            if box[0]:canvas.coords(box[0],start[0],start[1],event.x,event.y)
        def up(event):
            x1,x2=sorted([start[0],event.x]);y1,y2=sorted([start[1],event.y]);rect=[int(x1/scale),int(y1/scale),int(x2/scale),int(y2/scale)]
            if active.get()=='anchor':self.config['hover_anchor']=[int(event.x/scale),int(event.y/scale)];return
            if x2-x1>4 and y2-y1>4:self.regions[active.get()]=rect;canvas.create_text(x1,y1-9,text=active.get(),fill='#ffe0a1',anchor='w')
        canvas.bind('<ButtonPress-1>',down);canvas.bind('<B1-Motion>',move);canvas.bind('<ButtonRelease-1>',up)
        def finish():
            if not all(k in self.regions for k in ['name','price']):messagebox.showwarning('Calibration','Select at least item name and price.');return
            self.config['screen_size']=list(image.size);self.config['capture_space']='maplestory-client-v1';self.save();window.destroy();self.read_current()
        ttk.Button(window,text='Save regions & read shop',command=finish).pack(pady=8)

    def settings_snapshot(self):
        values={k:v.get() for k,v in self.vars.items()}
        values['auto_detect']=self.auto_detect.get();values['hover_anchor']=self.config.get('hover_anchor');values['regions']=dict(self.regions);values['screen_size']=self.config.get('screen_size');return values

    def ocr(self,image,numeric=False,tesseract=''):
        import pytesseract
        if tesseract:pytesseract.pytesseract.tesseract_cmd=tesseract
        image=ImageOps.grayscale(image.resize((image.width*3,image.height*3)))
        config='--psm 7'+(' -c tessedit_char_whitelist=0123456789,' if numeric else '')
        return pytesseract.image_to_string(image,config=config).strip()

    def cursor_sample(self):
        return self.game_capture.cursor() if self.game_capture is not None else (None,False)

    def watch_clicks(self,generation):
        last=False
        while generation==self.scan_generation and not self.cursor_stop.wait(.04):
            point,pressed=self.cursor_sample()
            if pressed and not last and point:self.cursor_click=(point,time.monotonic())
            last=pressed

    def screen_context(self,image,settings):
        result=dict(settings,world='Windia',seller='',shop='',channel='',room='');readings={}
        for key in ['seller','shop','channel','room']:
            if key not in settings['regions']:continue
            raw=self.ocr(image.crop(settings['regions'][key]),tesseract=settings['tesseract']);readings[key]=raw
            if key in ['channel','room']:
                number=read_location(raw,key);result[key]=str(number) if number else ''
            else:result[key]=raw.strip()[:100 if key=='shop' else 50]
        if not result.get('shop') and settings.get('clicked_shop'):
            result['shop']=settings['clicked_shop'];readings['shop']=settings['clicked_shop']+' (cursor sign; confirm)'
        return result,readings

    def auto_extract(self,image,settings,captured_at):
        lines=ocr_lines(image,settings['tesseract'])
        proposals,context,readings=detect(lines,self.catalog,image.size,self.name_memory,image=image)
        detected=dict(settings,world='Windia',**context);candidates=[]
        for row in proposals:
            crop=image.crop(row['box']);crop.thumbnail((650,100));buffer=io.BytesIO();crop.save(buffer,format='JPEG',quality=75)
            candidates.append(dict(row,observed_at=captured_at,settings=dict(detected),seller_read=context['seller'],
                context_reads=dict(readings),image=crop,automatic=True,
                evidence='data:image/jpeg;base64,'+base64.b64encode(buffer.getvalue()).decode()))
        return candidates,detected,readings

    def extract(self,image,settings,captured_at,detected=None):
        if settings['screen_size'] and list(image.size)!=settings['screen_size']:raise ValueError('Screen resolution changed; recalibrate the shop.')
        regions=settings['regions'];rows=max(1,min(12,int(settings['rows'])));stride=max(1,int(settings['row_stride']))
        if not all(k in regions for k in ['name','price']):raise ValueError('Calibrate item name and price first.')
        candidates=[]
        settings,context_reads=detected if detected is not None else self.screen_context(image,settings)
        seller_read=context_reads.get('seller','')
        for index in range(rows):
            crops={}
            for key,rect in regions.items():
                if key not in ['name','price','quantity']:continue
                r=[rect[0],rect[1]+stride*index,rect[2],rect[3]+stride*index]
                if r[3]>image.height:continue
                crops[key]=image.crop(r)
            if 'name' not in crops or 'price' not in crops:continue
            name=self.ocr(crops['name'],tesseract=settings['tesseract']);price=self.ocr(crops['price'],True,settings['tesseract'])
            if not name and not price:continue
            quantity=self.ocr(crops['quantity'],True,settings['tesseract']) if 'quantity' in crops else '1'
            matches=match_items(name,self.catalog)
            x=min(regions[k][0] for k in ['name','price']);y=min(regions[k][1] for k in ['name','price'])+stride*index
            right=max(regions[k][2] for k in ['name','price']);bottom=max(regions[k][3] for k in ['name','price'])+stride*index
            crop=image.crop((x,y,right,bottom));crop.thumbnail((650,100));buffer=io.BytesIO();crop.save(buffer,format='JPEG',quality=75)
            candidates.append({'raw_name':name,'price':price,'quantity':quantity,'slot':index+1,'matches':matches,
                'observed_at':captured_at,'settings':dict(settings),'seller_read':seller_read,'context_reads':context_reads,
                'evidence':'data:image/jpeg;base64,'+base64.b64encode(buffer.getvalue()).decode(),'image':crop})
        return candidates

    def read_current(self):
        if self.image is None:self.status.set('Capture or import a screenshot first.');return
        image=self.image.copy();settings=self.settings_snapshot();at=getattr(self,'imported_time',now_iso())
        def work():
            try:self.messages.put(('candidates',self.auto_extract(image,settings,at)[0] if settings['auto_detect'] else self.extract(image,settings,at)))
            except Exception as exc:self.messages.put(('error',str(exc)))
        threading.Thread(target=work,daemon=True).start();self.status.set('Reading shop fields…')

    def toggle(self):
        if self.running:self.running=False;self.scan_generation+=1;self.cursor_stop.set();self.start_button.configure(text='Start scanning');self.status.set('Scanning paused.');return
        try:
            settings=self.settings_snapshot()
            validate_nickname(settings['nickname'])
            if not settings['auto_detect'] and (not all(k in self.regions for k in ['name','price','channel','room','seller']) or not ('shop' in self.regions or ('hover' in self.regions and settings.get('hover_anchor')))):
                raise ValueError('Manual mode requires calibration. Enable automatic detection in Settings or calibrate first.')
            self.save();self.running=True;self.start_button.configure(text='Pause scanning')
        except Exception as exc:messagebox.showerror('Start scanning',str(exc));return
        # Snapshot settings on the Tk thread; refreshing location uses the Tk pump below.
        self.scan_generation+=1;generation=self.scan_generation
        self.live_settings=settings;self.cursor_stop.clear()
        threading.Thread(target=self.watch_clicks,args=(generation,),daemon=True).start()
        def loop():
            previous=None;published=None;hover=None;last_cursor=None;clicked_shop=None;prior_location=None;tracker=ContextTracker()
            try:
                while self.running and generation==self.scan_generation:
                    try:
                        image=self.frame();frame_at=now_iso()
                    except CaptureUnavailable as exc:
                        self.messages.put(('capture_status','Capture waiting: '+str(exc)))
                        self.messages.put(('context',{'world':'Windia','channel':'','room':'','seller':'','shop':''}))
                        self.messages.put(('invalidate_candidates',None))
                        previous=published=prior_location=hover=clicked_shop=None;tracker=ContextTracker()
                        self.cursor_click=None;time.sleep(1.5);continue
                    if generation!=self.scan_generation or not self.running:break
                    current_settings=dict(self.live_settings)
                    if current_settings['auto_detect']:
                        rows,detected,readings=self.auto_extract(image,current_settings,frame_at)
                        if generation!=self.scan_generation or not self.running:break
                        detected=tracker.update(detected)
                        self.messages.put(('context',detected))
                        for row in rows:
                            row['settings'].update({k:detected[k] for k in ['channel','room','seller','shop']})
                            row['seller_read']=detected['seller']
                        signature=(tuple((r['raw_name'],r['price'],r['quantity'],tuple(r['box'])) for r in rows),
                                   tuple(detected[k] for k in ['channel','room','seller','shop']),self.game_capture.window.hwnd)
                        if signature==previous and signature!=published:
                            self.messages.put(('candidates',rows));published=signature
                            if not rows:self.messages.put(('notice','Looking for item names and labeled prices. Open a shop; if nothing appears, import a shop screenshot or use manual fallback in Troubleshooting.'))
                        elif signature!=previous:
                            published=None;self.messages.put(('invalidate_candidates',None))
                        previous=signature;time.sleep(1.5);continue
                    if current_settings.get('screen_size') and list(image.size)!=current_settings['screen_size']:
                        raise ValueError('MapleStory window size changed. Recalibrate once in Settings → Screen setup.')
                    point,_=self.cursor_sample()
                    click=self.cursor_click
                    if click:
                        clicked_shop=associated_shop(hover,click);self.cursor_click=None
                    anchor=current_settings.get('hover_anchor');box=current_settings['regions'].get('hover')
                    if point and point==last_cursor and anchor and box:
                        offset=[box[0]-anchor[0],box[1]-anchor[1],box[2]-anchor[0],box[3]-anchor[1]]
                        region=cursor_rectangle(point,offset,image.size)
                        if region:
                            label=self.ocr(image.crop(region),tesseract=current_settings['tesseract'])
                            if label:hover=(point,label[:100],time.monotonic())
                    last_cursor=point
                    if clicked_shop and time.monotonic()-clicked_shop[1]<20:current_settings['clicked_shop']=clicked_shop[0]
                    # Track labels even outside shops and independently of stable item rows.
                    detected,readings=self.screen_context(image,current_settings)
                    location=(detected['channel'],detected['room'])
                    if prior_location is not None and location!=prior_location:
                        clicked_shop=None;hover=None;current_settings.pop('clicked_shop',None)
                        detected,readings=self.screen_context(image,current_settings)
                    prior_location=location
                    if generation!=self.scan_generation or not self.running:break
                    detected=tracker.update(detected)
                    context=tuple(detected[k] for k in ['world','channel','room','seller','shop'])
                    self.messages.put(('context',dict(detected)))
                    rects=[current_settings['regions'][k] for k in ['name','price']]
                    extent=(min(r[0] for r in rects),min(r[1] for r in rects),max(r[2] for r in rects),max(r[3] for r in rects)+int(current_settings['row_stride'])*(int(current_settings['rows'])-1))
                    key=hashlib.sha256(image.crop(extent).tobytes()).hexdigest()
                    signature=(key,context,self.game_capture.window.hwnd)
                    if signature==previous and signature!=published and all(detected[k] for k in ['channel','room','seller','shop']):
                        rows=self.extract(image,current_settings,frame_at,(detected,readings));self.messages.put(('candidates',rows));published=signature
                    elif signature!=previous:
                        published=None
                        self.messages.put(('invalidate_candidates',None))
                    previous=signature;time.sleep(1.5)
            except Exception as exc:
                if generation==self.scan_generation:
                    self.messages.put(('error',str(exc)));self.messages.put(('stopped',None))
            finally:
                if generation==self.scan_generation:self.cursor_stop.set()
        threading.Thread(target=loop,daemon=True).start();self.status.set('Scanning the game. Automatic detection reads stable offers; review before Publish.')

    def select(self,event=None):
        selection=self.table.selection()
        if not selection:return
        index=int(selection[0]);self.selected=self.candidates[index];row=self.selected
        self.publish_button.configure(state='normal')
        self.item_combo['values']=[f"{i['name']} · #{i['id']}" for _,i in row['matches']]
        self.edit['item'].set(self.item_combo['values'][0] if self.item_combo['values'] else row['raw_name'])
        for key in ['price','quantity','slot','observed_at']:self.edit[key].set(str(row[key]))
        self.edit['stats'].set('{}');self.stats_known.set(False)
        preview=row['image'].copy();preview.thumbnail((360,70))
        self.preview=ImageTk.PhotoImage(preview);self.preview_label.configure(image=self.preview)
        # The capture's location is preserved; later channel/room edits must not move an old listing.
        for key in ['server','world','channel','room','seller','shop']:self.vars[key].set(row['settings'][key])
        if row['seller_read']:self.vars['seller'].set(row['seller_read'])
        if row.get('automatic') and (not row['quantity'] or any(not row['settings'].get(k) for k in ['channel','room','seller','shop'])):
            self.show_details.set(True);self.toggle_details()
        ctx=row['settings'];self.review_context.set(f"Captured: CH {ctx['channel']} · FM {ctx['room']} · {ctx['seller']} · {ctx['shop']}")

    def publish(self):
        if not self.selected:messagebox.showwarning('Publish','Choose a captured row first.');return
        try:
            value=self.edit['item'].get();item_id=int(value.rsplit('#',1)[1]);item=next(i for i in self.catalog if i['id']==item_id)
            stats=json.loads(self.edit['stats'].get() or '{}')
            listing={'itemId':item['id'],'price':parse_integer(self.edit['price'].get()),'quantity':parse_integer(self.edit['quantity'].get()),
                'slot':parse_integer(self.edit['slot'].get()),'observedAt':self.edit['observed_at'].get(),
                'stats':stats,'statsKnown':self.stats_known.get(),'priceBasis':self.vars['price_basis'].get(),'evidence':self.selected['evidence']}
            for key in ['server','seller','shop']:listing[key]=self.vars[key].get().strip()
            listing['world']='Windia'
            listing['nickname']=validate_nickname(self.vars['nickname'].get())
            if not listing['shop']:raise ValueError('Confirm the shop name under More details / corrections.')
            for key in ['channel','room']:listing[key]=parse_integer(self.vars[key].get())
            if not all(listing[k] for k in ['world','seller','shop']):raise ValueError('Confirm world and seller for this shop.')
            if min(listing['quantity'],listing['channel'],listing['room'],listing['slot'])<1:raise ValueError('Quantity, channel, room and slot must be positive.')
            if not self.vars['api_key'].get():raise ValueError('Load your private connection file first.')
            if self.share_learning.get():listing['learning']=learning_readings(self.selected)
            self.uploads.enqueue(listing)
            try:self.name_memory.confirm(self.selected['raw_name'],item['id'])
            except OSError:pass  # A local learning-write failure must not duplicate the queued upload.
            self.publish_button.configure(state='disabled');self.confirmed_session+=1;self.update_counts();self.selected=None;self.review_context.set('Published to the upload queue. Select another captured item.')
            if self.pending_candidates is not None:
                self.messages.put(('candidates',self.pending_candidates));self.pending_candidates=None
            self.status.set(f'Confirmed and queued. {self.uploads.count()} uploads pending.');self.send()
        except Exception as exc:messagebox.showerror('Review listing',str(exc))

    def send(self):
        if self.upload_busy:return
        endpoint=self.vars['endpoint'].get();key=self.vars['api_key'].get()
        if not key:self.status.set('Load your connection file to send queued listings.');return
        self.upload_busy=True
        def work():
            try:
                total=0
                while self.uploads.count():total+=self.uploads.send(endpoint,key)
                self.messages.put(('uploaded',total))
            except Exception as exc:self.messages.put(('upload_error',str(exc)))
            finally:self.messages.put(('upload_done',None))
        threading.Thread(target=work,daemon=True).start()

    def pump(self):
        if hasattr(self,'next_retry') and time.monotonic()>=self.next_retry:
            self.next_retry=time.monotonic()+30
            if self.vars['api_key'].get() and self.uploads.count():self.send()
        if self.running:self.live_settings=self.settings_snapshot()
        while True:
            try:kind,value=self.messages.get_nowait()
            except queue.Empty:break
            if kind=='calibrate':self.image=value;self.imported_time=now_iso();self.calibration(value)
            elif kind=='capture_status':self.capture_status.set(value)
            elif kind=='context':
                self.detected_context.set(f"Windia · Channel {value.get('channel') or '?'} · FM room {value.get('room') or '?'} · Seller {value.get('seller') or '?'} · Shop {value.get('shop') or '?'}")
                if self.selected is None:
                    for key in ['world','channel','room','seller','shop']:self.vars[key].set(value.get(key,''))
            elif kind=='invalidate_candidates':
                self.pending_candidates=[]
                if self.selected is None:
                    self.candidates=[];self.table.delete(*self.table.get_children())
            elif kind=='candidates':
                if self.selected is not None:
                    self.pending_candidates=value
                    self.status.set('Live location is updating. The selected listing keeps its original shop and location.');continue
                self.pending_candidates=None
                self.candidates=value;self.table.delete(*self.table.get_children())
                for index,row in enumerate(value):
                    confidence=row['matches'][0][0] if row['matches'] else 0
                    ambiguous=len(row['matches'])>1 and row['matches'][0][0]==row['matches'][1][0]
                    self.table.insert('', 'end',iid=str(index),values=(row['raw_name'],row['price'],row['quantity'],row['slot'],'Ambiguous' if ambiguous else f'{confidence:.0%}'))
                if value:
                    ctx=value[0]['settings'];self.status.set(f"Captured {ctx.get('shop') or 'unknown shop'} · CH {ctx.get('channel') or '?'} · FM {ctx.get('room') or '?'} at {value[0]['observed_at']}. Review before publishing.")
                else:self.status.set(f'{len(value)} rows read. Confirm item ID, digits, quantity, slot and location before publishing.')
            elif kind=='notice':self.status.set(value)
            elif kind=='error':self.root.deiconify();self.status.set(value);self.capture_status.set('Scanner error: '+value)
            elif kind=='upload_error':self.status.set('Upload retained for retry: '+value)
            elif kind=='uploaded':self.update_counts();self.status.set(f'{value} listings uploaded.')
            elif kind=='upload_done':self.upload_busy=False
            elif kind=='capture_done':self.capture_busy=False
            elif kind=='stopped':self.running=False;self.start_button.configure(text='Start scanning')
        self.root.after(200,self.pump)

    def close(self):
        self.closing=True;self.running=False;self.scan_generation+=1;self.cursor_stop.set();self.save()
        if self.game_capture is not None:self.game_capture.close()
        self.root.destroy()

if __name__=='__main__':
    if '--capture-self-test' in sys.argv:
        import cv2, dxcam, numpy, auto_detect
        sys.exit(0)
    if sys.platform=='win32':
        try:
            import ctypes
            ctypes.windll.user32.SetProcessDpiAwarenessContext(ctypes.c_void_p(-4))
        except Exception:pass
    root=tk.Tk()
    try:Scanner(root);root.mainloop()
    except Exception as exc:messagebox.showerror('SHOPPER scanner',str(exc));root.destroy()
