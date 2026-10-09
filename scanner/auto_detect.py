"""Calibration-free OCR proposals. Never infer a price from an unlabeled number."""
import json, re, threading
from pathlib import Path
from core import match_items, normalize_name, parse_integer

NUMBER = r'\d+(?:[, ]\d{3})*'

def ocr_lines(image, tesseract=''):
    import pytesseract
    from PIL import ImageOps
    if tesseract:pytesseract.pytesseract.tesseract_cmd=tesseract
    scale=min(3, max(1, 2400/image.width))
    prepared=ImageOps.grayscale(image.resize((round(image.width*scale),round(image.height*scale))))
    data=pytesseract.image_to_data(prepared,config='--psm 11',output_type=pytesseract.Output.DICT,timeout=20)
    groups={}
    for i,text in enumerate(data['text']):
        if not text.strip() or float(data['conf'][i])<35:continue
        key=tuple(data[k][i] for k in ('block_num','par_num','line_num'))
        groups.setdefault(key,[]).append((text,int(data['left'][i]),int(data['top'][i]),int(data['width'][i]),int(data['height'][i])))
    return sorted([{'text':' '.join(w[0] for w in words),'box':(
        int(min(w[1] for w in words)/scale),int(min(w[2] for w in words)/scale),
        min(image.width,round(max(w[1]+w[3] for w in words)/scale)),
        min(image.height,round(max(w[2]+w[4] for w in words)/scale)))}
        for words in groups.values()],key=lambda l:(l['box'][1],l['box'][0]))


def unique_field(lines,pattern,area=None):
    found=[]
    for line in lines:
        if area and not area(line['box']):continue
        for hit in re.findall(pattern,line['text'],re.I):found.append((hit.strip(),line['text']))
    values={v for v,_ in found}
    return found[0] if len(values)==1 else ('','')


def detect(lines,catalog,size,memory=None):
    """Return proposals plus explicitly visible context, with ambiguous labels blank."""
    context={};readings={}
    patterns={'channel':r'\b(?:channel|ch)\s*[:.#-]?\s*(\d{1,3})\b',
        'room':r'\b(?:free\s*market|fm|room)\s*[-:<># ]*\s*(\d{1,3})\b',
        'seller':r'\b(?:seller|owner)\s*[:：]\s*([A-Za-z0-9_]{1,50})\b',
        'shop':r'\b(?:shop(?:\s+name|\s+title)?|store(?:\s+name)?)\s*[:：]\s*(.{1,100})$'}
    for key,pattern in patterns.items():
        area=(lambda b:b[0]<size[0]*.45 and b[1]<size[1]*.4) if key=='room' else ((lambda b:b[1]<size[1]*.4) if key=='channel' else None)
        context[key],readings[key]=unique_field(lines,pattern,area)
        if key in ('channel','room') and context[key] and not 1<=int(context[key])<=100:context[key]=''
    # Channel chooser lists multiple channels: unique_field deliberately refuses it.
    prices=[]
    for line in lines:
        hits=re.findall(r'\b(?:price\s*[:：]?\s*('+NUMBER+r')|('+NUMBER+r')\s*(?:mesos?|meso))\b',line['text'],re.I)
        if len(hits)==1:
            raw=next(v for v in hits[0] if v)
            try:parse_integer(raw)
            except ValueError:continue
            prices.append((line,raw))
    rows=[];used=set()
    for line in lines:
        text=line['text'];matches=match_items(text,catalog)
        if memory:matches=memory.matches(text,catalog,matches)
        if not matches or matches[0][0]<.88:continue
        if len(matches)>1 and matches[0][0]-matches[1][0]<.04 and matches[0][1]['id']!=matches[1][1]['id']:continue
        x,y,right,bottom=line['box'];height=max(8,bottom-y)
        nearby=[]
        for index,(price,raw) in enumerate(prices):
            px,py,pr,pb=price['box']
            if index in used:continue
            # Price on same row to right, or the short line immediately below item.
            same=abs(py-y)<=height*.8 and px>=right-5 and px-right<=size[0]*.35
            below=bottom-3<=py<=bottom+height*2.8 and abs(px-x)<=max(60,height*4)
            if same or below:nearby.append((abs(py-y)+abs(px-x)*.05,index,price,raw))
        nearby.sort(key=lambda p:p[0])
        if not nearby or (len(nearby)>1 and nearby[1][0]-nearby[0][0]<height):continue
        _,index,price,raw=nearby[0];used.add(index)
        px,py,pr,pb=price['box'];box=(max(0,min(x,px)-4),max(0,min(y,py)-4),min(size[0],max(right,pr)+4),min(size[1],max(bottom,pb)+4))
        # Quantity must be explicit within these lines; unknown stays blank for review.
        quantities=re.findall(r'\b(?:qty|quantity)\s*[:：]?\s*(\d+)\b',text+' '+price['text'],re.I)
        rows.append({'raw_name':text,'price':raw,'quantity':quantities[0] if len(quantities)==1 else '',
            'matches':matches,'box':box,'slot':len(rows)+1})
    return rows,context,readings


class NameMemory:
    """Use only repeated, consistent user-confirmed name corrections; prices never cached."""
    def __init__(self,path):
        self.lock=threading.RLock()
        self.path=Path(path)
        try:self.data=json.loads(self.path.read_text(encoding='utf-8'))
        except (OSError,ValueError):self.data={}
    def confirm(self,raw,item_id):
        with self.lock:self._confirm(raw,item_id)
    def _confirm(self,raw,item_id):
        key=normalize_name(raw)
        if not key:return
        entry=self.data.setdefault(key,{'counts':{}});counts=entry['counts'];sid=str(item_id);counts[sid]=counts.get(sid,0)+1
        if len(self.data)>1000:self.data.pop(next(iter(self.data)))
        temporary=self.path.with_suffix('.tmp');temporary.write_text(json.dumps(self.data),encoding='utf-8');temporary.replace(self.path)
    def matches(self,raw,catalog,fallback):
        with self.lock:return self._matches(raw,catalog,fallback)
    def _matches(self,raw,catalog,fallback):
        if fallback and fallback[0][0]==1:return fallback
        counts=self.data.get(normalize_name(raw),{}).get('counts',{})
        if len(counts)!=1:return fallback
        sid,count=next(iter(counts.items()))
        if count<3:return fallback
        item=next((i for i in catalog if str(i['id'])==sid),None)
        return [(1.,item)] if item else fallback
