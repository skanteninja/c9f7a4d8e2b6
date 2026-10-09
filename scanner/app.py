"""TCW Shopper scanner: calibrate screen regions, review OCR, publish to website."""
import base64, hashlib, io, json, os, queue, sys, threading, time
from datetime import datetime, timezone
from pathlib import Path
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from PIL import Image, ImageTk, ImageOps
from core import UploadQueue, match_items, parse_integer, now_iso

ASSETS = Path(getattr(sys, '_MEIPASS', Path(__file__).resolve().parent))
HOME = Path(os.getenv('LOCALAPPDATA', str(Path.home()))) / 'TCW-Shopper'
HOME.mkdir(parents=True, exist_ok=True)

class Scanner:
    def __init__(self, root):
        self.root = root; root.title('TCW · SHOPPER Scanner'); root.geometry('1140x800')
        self.messages = queue.Queue(); self.uploads = UploadQueue(HOME / 'uploads.sqlite')
        self.catalog = json.loads((ASSETS / 'items.json').read_text(encoding='utf-8'))['items']
        self.settings_path = HOME / 'settings.json'
        self.config = json.loads(self.settings_path.read_text()) if self.settings_path.exists() else {}
        self.running = False; self.camera = None; self.image = None; self.regions = self.config.get('regions', {})
        self.candidates = []; self.selected = None; self.upload_busy = False; self.capture_busy = False
        self.vars = {key: tk.StringVar(value=str(self.config.get(key, default))) for key, default in {
            'endpoint':'https://maplestory-classic.ofri505.workers.dev', 'api_key':'', 'server':'Classic World',
            'world':'', 'channel':'1', 'room':'1', 'seller':'', 'shop':'', 'monitor':'0',
            'row_stride':'36', 'rows':'4', 'price_basis':'unit', 'tesseract':''}.items()}
        self.edit = {key: tk.StringVar() for key in ['item','price','quantity','slot','observed_at','stats']}
        self.stats_known = tk.BooleanVar(value=False)
        self.status = tk.StringVar(value='Load your connection file, then calibrate a visible shop.')
        self.draw_ui(); self.root.after(200, self.pump); root.protocol('WM_DELETE_WINDOW', self.close)

    def draw_ui(self):
        style = ttk.Style(); style.theme_use('clam')
        style.configure('.', background='#211725', foreground='#f3e7d5', fieldbackground='#35263b')
        style.configure('TButton', padding=7); style.configure('TEntry', fieldbackground='#35263b')
        style.configure('Treeview', background='#211725', foreground='#f3e7d5', fieldbackground='#211725', rowheight=30)
        self.root.configure(bg='#211725')
        outer = ttk.Frame(self.root, padding=18); outer.pack(fill='both', expand=True)
        ttk.Label(outer, text='SHOPPER · Shared shop scanner', font=('Segoe UI', 22, 'bold')).pack(anchor='w')
        ttk.Label(outer, text='Browse shops manually. Review captured prices, then publish to your website.').pack(anchor='w', pady=(3,12))
        connection = ttk.Frame(outer); connection.pack(fill='x')
        ttk.Button(connection, text='Load connection file', command=self.load_connection).pack(side='left')
        ttk.Button(connection, text='Save settings', command=self.save).pack(side='left', padx=8)
        ttk.Button(connection, text='Retry queued uploads', command=self.send).pack(side='left')
        ttk.Label(connection, text='Monitor').pack(side='left', padx=(20,4))
        ttk.Entry(connection, textvariable=self.vars['monitor'], width=4).pack(side='left')
        fields = ttk.Frame(outer); fields.pack(fill='x', pady=12)
        for column, key in enumerate(['server','world','channel','room','seller','shop']):
            frame=ttk.Frame(fields);frame.grid(row=0,column=column,sticky='ew',padx=4);fields.columnconfigure(column,weight=1)
            ttk.Label(frame,text={'room':'FM room','seller':'Seller (confirm each shop)'}.get(key,key.title())).pack(anchor='w')
            ttk.Entry(frame,textvariable=self.vars[key],width=14).pack(fill='x')
        controls=ttk.Frame(outer);controls.pack(fill='x')
        ttk.Button(controls,text='Capture & calibrate',command=self.calibrate_capture).pack(side='left')
        ttk.Button(controls,text='Import screenshot',command=self.import_image).pack(side='left',padx=6)
        self.start_button=ttk.Button(controls,text='Start screen scanning',command=self.toggle);self.start_button.pack(side='left')
        ttk.Button(controls,text='Read current frame',command=self.read_current).pack(side='left',padx=6)
        ttk.Label(controls,text='Visible rows').pack(side='left',padx=(12,3));ttk.Entry(controls,textvariable=self.vars['rows'],width=3).pack(side='left')
        ttk.Label(controls,text='Row spacing (px)').pack(side='left',padx=(10,3));ttk.Entry(controls,textvariable=self.vars['row_stride'],width=4).pack(side='left')
        advanced=ttk.Frame(outer);advanced.pack(fill='x',pady=8)
        ttk.Label(advanced,text='Displayed price is').pack(side='left')
        ttk.Combobox(advanced,textvariable=self.vars['price_basis'],values=['unit','bundle'],state='readonly',width=10).pack(side='left',padx=6)
        ttk.Label(advanced,text='Tesseract executable (optional)').pack(side='left',padx=(18,6));ttk.Entry(advanced,textvariable=self.vars['tesseract'],width=40).pack(side='left',fill='x',expand=True)
        self.table=ttk.Treeview(outer,columns=('name','price','quantity','slot','confidence'),show='headings',height=8)
        for key,label,width in [('name','Detected item',420),('price','Price',130),('quantity','Quantity',90),('slot','Visible row',90),('confidence','Match',90)]:
            self.table.heading(key,text=label);self.table.column(key,width=width)
        self.table.pack(fill='both',expand=True,pady=8);self.table.bind('<<TreeviewSelect>>',self.select)
        editor=ttk.LabelFrame(outer,text='Review selected listing',padding=12);editor.pack(fill='x')
        ttk.Label(editor,text='Item').grid(row=0,column=0,sticky='w')
        self.item_combo=ttk.Combobox(editor,textvariable=self.edit['item'],width=54);self.item_combo.grid(row=0,column=1,columnspan=3,sticky='ew',padx=6,pady=4)
        self.item_combo.bind('<KeyRelease>',self.filter_items)
        for row,(key,label) in enumerate([('price','Displayed price'),('quantity','Quantity'),('slot','Shop slot number'),('observed_at','Captured at (UTC ISO)')],1):
            ttk.Label(editor,text=label).grid(row=row,column=0,sticky='w');ttk.Entry(editor,textvariable=self.edit[key],width=44).grid(row=row,column=1,columnspan=3,sticky='ew',padx=6,pady=3)
        ttk.Checkbutton(editor,text='Actual equipment tooltip stats recorded',variable=self.stats_known).grid(row=5,column=0,columnspan=4,sticky='w')
        ttk.Label(editor,text='Stats JSON, e.g. {"W.ATK": 45, "slots": 7}').grid(row=6,column=0,columnspan=4,sticky='w')
        ttk.Entry(editor,textvariable=self.edit['stats'],width=65).grid(row=7,column=0,columnspan=4,sticky='ew',pady=4)
        self.preview_label=ttk.Label(editor);self.preview_label.grid(row=0,column=4,rowspan=6,padx=12)
        ttk.Button(editor,text='Confirm & publish listing',command=self.publish).grid(row=7,column=4,padx=10)
        ttk.Label(outer,textvariable=self.status,wraplength=1000).pack(anchor='w',pady=10)
        ttk.Label(outer,text='Update seller, channel and room when you move. Confirm the real shop slot when scrolling. Upload keys stay on this computer.').pack(anchor='w')

    def filter_items(self,event=None):
        q=self.edit['item'].get().lower();self.item_combo['values']=[f"{i['name']} · #{i['id']}" for i in self.catalog if q in i['name'].lower()][:60]

    def save(self):
        self.config.update({k:v.get() for k,v in self.vars.items()});self.config['regions']=self.regions
        self.settings_path.write_text(json.dumps(self.config,indent=2),encoding='utf-8')
        self.status.set('Settings saved locally. Keep the connection file private.')

    def load_connection(self):
        path=filedialog.askopenfilename(filetypes=[('Connection JSON','*.json')])
        if not path:return
        try:
            data=json.loads(Path(path).read_text());self.vars['endpoint'].set(data['endpoint']);self.vars['api_key'].set(data['api_key']);self.save()
        except Exception as exc:messagebox.showerror('Connection file',str(exc))

    def frame(self,monitor):
        if sys.platform!='win32':raise ValueError('Live capture requires Windows. Screenshot import is available on other systems.')
        import dxcam
        if self.camera is None:self.camera=dxcam.create(output_idx=monitor,output_color='RGB')
        array=self.camera.grab(new_frame_only=False)
        if array is None:raise ValueError('No screen frame. Try windowed or borderless mode.')
        return Image.fromarray(array)

    def calibrate_capture(self):
        if self.running:self.toggle()
        if self.capture_busy:return
        self.root.iconify();monitor=int(self.vars['monitor'].get() or 0);self.capture_busy=True
        def capture():
            try:time.sleep(.6);self.messages.put(('calibrate',self.frame(monitor)))
            except Exception as exc:self.messages.put(('error',str(exc)))
            finally:self.messages.put(('capture_done',None))
        threading.Thread(target=capture,daemon=True).start()

    def import_image(self):
        path=filedialog.askopenfilename(filetypes=[('Screenshot','*.png *.jpg *.jpeg')])
        if not path:return
        try:
            self.image=Image.open(path).convert('RGB');self.imported_time=datetime.fromtimestamp(Path(path).stat().st_mtime,timezone.utc).isoformat().replace('+00:00','Z')
            self.calibration(self.image)
            self.status.set('Imported screenshot. File modified time is a suggested capture time; confirm it before publishing.')
        except Exception as exc:messagebox.showerror('Screenshot',str(exc))

    def calibration(self,image):
        self.image=image;self.root.deiconify()
        window=tk.Toplevel(self.root);window.title('Calibrate visible shop — first row fields');window.geometry('1040x750')
        scale=min(1000/image.width,610/image.height,1);shown=image.resize((int(image.width*scale),int(image.height*scale)))
        canvas=tk.Canvas(window,width=shown.width,height=shown.height,bg='#110b15');canvas.pack()
        photo=ImageTk.PhotoImage(shown);canvas.create_image(0,0,image=photo,anchor='nw');canvas.photo=photo
        active=tk.StringVar(value='name');row=ttk.Frame(window);row.pack(fill='x',pady=6)
        for key,label in [('name','1 · Item name'),('price','2 · Price'),('quantity','3 · Quantity'),('seller','4 · Seller (optional)')]:ttk.Radiobutton(row,text=label,variable=active,value=key).pack(side='left',padx=8)
        ttk.Label(window,text='Drag around each field in the FIRST visible shop row. Row spacing repeats these regions downward.').pack()
        start=[0,0];box=[None]
        def down(event):start[:]=[event.x,event.y];box[0]=canvas.create_rectangle(event.x,event.y,event.x,event.y,outline='#ffe0a1',width=2)
        def move(event):
            if box[0]:canvas.coords(box[0],start[0],start[1],event.x,event.y)
        def up(event):
            x1,x2=sorted([start[0],event.x]);y1,y2=sorted([start[1],event.y]);rect=[int(x1/scale),int(y1/scale),int(x2/scale),int(y2/scale)]
            if x2-x1>4 and y2-y1>4:self.regions[active.get()]=rect;canvas.create_text(x1,y1-9,text=active.get(),fill='#ffe0a1',anchor='w')
        canvas.bind('<ButtonPress-1>',down);canvas.bind('<B1-Motion>',move);canvas.bind('<ButtonRelease-1>',up)
        def finish():
            if not all(k in self.regions for k in ['name','price']):messagebox.showwarning('Calibration','Select at least item name and price.');return
            self.config['screen_size']=list(image.size);self.save();window.destroy();self.read_current()
        ttk.Button(window,text='Save regions & read shop',command=finish).pack(pady=8)

    def settings_snapshot(self):
        values={k:v.get() for k,v in self.vars.items()}
        values['regions']=dict(self.regions);values['screen_size']=self.config.get('screen_size');return values

    def ocr(self,image,numeric=False,tesseract=''):
        import pytesseract
        if tesseract:pytesseract.pytesseract.tesseract_cmd=tesseract
        image=ImageOps.grayscale(image.resize((image.width*3,image.height*3)))
        config='--psm 7'+(' -c tessedit_char_whitelist=0123456789,' if numeric else '')
        return pytesseract.image_to_string(image,config=config).strip()

    def extract(self,image,settings,captured_at):
        if settings['screen_size'] and list(image.size)!=settings['screen_size']:raise ValueError('Screen resolution changed; recalibrate the shop.')
        regions=settings['regions'];rows=max(1,min(12,int(settings['rows'])));stride=max(1,int(settings['row_stride']))
        if not all(k in regions for k in ['name','price']):raise ValueError('Calibrate item name and price first.')
        candidates=[]
        seller_read=self.ocr(image.crop(regions['seller']),tesseract=settings['tesseract']) if 'seller' in regions else ''
        for index in range(rows):
            crops={}
            for key,rect in regions.items():
                if key=='seller':continue
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
                'observed_at':captured_at,'settings':dict(settings),'seller_read':seller_read,
                'evidence':'data:image/jpeg;base64,'+base64.b64encode(buffer.getvalue()).decode(),'image':crop})
        return candidates

    def read_current(self):
        if self.image is None:self.status.set('Capture or import a screenshot first.');return
        image=self.image.copy();settings=self.settings_snapshot();at=getattr(self,'imported_time',now_iso())
        def work():
            try:self.messages.put(('candidates',self.extract(image,settings,at)))
            except Exception as exc:self.messages.put(('error',str(exc)))
        threading.Thread(target=work,daemon=True).start();self.status.set('Reading shop fields…')

    def toggle(self):
        if self.running:self.running=False;self.start_button.configure(text='Start screen scanning');self.status.set('Scanning paused.');return
        try:
            settings=self.settings_snapshot()
            if not settings['world']:raise ValueError('Enter your world before scanning.')
            if not all(k in self.regions for k in ['name','price']):raise ValueError('Calibrate a visible shop first.')
            monitor=int(settings['monitor']);self.save();self.running=True;self.start_button.configure(text='Pause scanning')
        except Exception as exc:messagebox.showerror('Start scanning',str(exc));return
        # Snapshot settings on the Tk thread; refreshing location uses the Tk pump below.
        self.live_settings=settings
        def loop():
            previous=None;published=None
            try:
                while self.running:
                    image=self.frame(monitor);current_settings=dict(self.live_settings)
                    rects=[current_settings['regions'][k] for k in ['name','price']]
                    extent=(min(r[0] for r in rects),min(r[1] for r in rects),max(r[2] for r in rects),max(r[3] for r in rects)+int(current_settings['row_stride'])*(int(current_settings['rows'])-1))
                    key=hashlib.sha256(image.crop(extent).tobytes()).hexdigest()
                    context=tuple(current_settings[k] for k in ['server','world','channel','room','seller','shop'])
                    signature=(key,context)
                    if signature==previous and signature!=published:
                        self.messages.put(('candidates',self.extract(image,current_settings,now_iso())));published=signature
                    previous=signature;time.sleep(1.5)
            except Exception as exc:self.messages.put(('error',str(exc)));self.messages.put(('stopped',None))
        threading.Thread(target=loop,daemon=True).start();self.status.set('Scanning stable shop frames. Review each candidate before publishing.')

    def select(self,event=None):
        selection=self.table.selection()
        if not selection:return
        if self.running:self.toggle()
        index=int(selection[0]);self.selected=self.candidates[index];row=self.selected
        self.item_combo['values']=[f"{i['name']} · #{i['id']}" for _,i in row['matches']]
        self.edit['item'].set(self.item_combo['values'][0] if self.item_combo['values'] else row['raw_name'])
        for key in ['price','quantity','slot','observed_at']:self.edit[key].set(str(row[key]))
        self.edit['stats'].set('{}');self.stats_known.set(False)
        self.preview=ImageTk.PhotoImage(row['image']);self.preview_label.configure(image=self.preview)
        # The capture's location is preserved; later channel/room edits must not move an old listing.
        for key in ['server','world','channel','room','seller','shop']:self.vars[key].set(row['settings'][key])
        if row['seller_read']:self.vars['seller'].set(row['seller_read'])

    def publish(self):
        if not self.selected:messagebox.showwarning('Publish','Choose a captured row first.');return
        try:
            value=self.edit['item'].get();item_id=int(value.rsplit('#',1)[1]);item=next(i for i in self.catalog if i['id']==item_id)
            stats=json.loads(self.edit['stats'].get() or '{}')
            listing={'itemId':item['id'],'price':parse_integer(self.edit['price'].get()),'quantity':parse_integer(self.edit['quantity'].get()),
                'slot':parse_integer(self.edit['slot'].get()),'observedAt':self.edit['observed_at'].get(),
                'stats':stats,'statsKnown':self.stats_known.get(),'priceBasis':self.vars['price_basis'].get(),'evidence':self.selected['evidence']}
            for key in ['server','world','seller','shop']:listing[key]=self.vars[key].get().strip()
            listing['shop']=listing['shop'] or listing['seller']
            for key in ['channel','room']:listing[key]=parse_integer(self.vars[key].get())
            if not all(listing[k] for k in ['world','seller']):raise ValueError('Confirm world and seller for this shop.')
            if min(listing['quantity'],listing['channel'],listing['room'],listing['slot'])<1:raise ValueError('Quantity, channel, room and slot must be positive.')
            if not self.vars['api_key'].get():raise ValueError('Load your private connection file first.')
            self.uploads.enqueue(listing);self.selected=None;self.status.set(f'Confirmed and queued. {self.uploads.count()} uploads pending.');self.send()
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
        if self.running:self.live_settings=self.settings_snapshot()
        while True:
            try:kind,value=self.messages.get_nowait()
            except queue.Empty:break
            if kind=='calibrate':self.image=value;self.imported_time=now_iso();self.calibration(value)
            elif kind=='candidates':
                if self.selected is not None:
                    self.status.set('A new shop frame was read. Finish the selected review before reading another frame.');continue
                self.candidates=value;self.table.delete(*self.table.get_children())
                for index,row in enumerate(value):
                    confidence=row['matches'][0][0] if row['matches'] else 0
                    ambiguous=len(row['matches'])>1 and row['matches'][0][0]==row['matches'][1][0]
                    self.table.insert('', 'end',iid=str(index),values=(row['raw_name'],row['price'],row['quantity'],row['slot'],'Ambiguous' if ambiguous else f'{confidence:.0%}'))
                self.status.set(f'{len(value)} rows read. Confirm item ID, digits, quantity, slot and location before publishing.')
            elif kind=='error':self.root.deiconify();self.status.set(value)
            elif kind=='upload_error':self.status.set('Upload retained for retry: '+value)
            elif kind=='uploaded':self.status.set(f'{value} listings acknowledged by website. {self.uploads.count()} queued.')
            elif kind=='upload_done':self.upload_busy=False
            elif kind=='capture_done':self.capture_busy=False
            elif kind=='stopped':self.running=False;self.start_button.configure(text='Start screen scanning')
        self.root.after(200,self.pump)

    def close(self):
        self.running=False;self.save();self.root.destroy()

if __name__=='__main__':
    root=tk.Tk()
    try:Scanner(root);root.mainloop()
    except Exception as exc:messagebox.showerror('SHOPPER scanner',str(exc));root.destroy()
