import tempfile,unittest
from pathlib import Path
from auto_detect import detect,NameMemory
CAT=[{'id':1,'name':'Red Potion'},{'id':2,'name':'Blue Potion'}]
def line(text,x,y,w=130):return {'text':text,'box':(x,y,x+w,y+14)}
class AutoTests(unittest.TestCase):
    def test_rows_context_and_unknown_quantity(self):
        lines=[line('Channel 4',600,10),line('Free Market 7',10,20),line('Owner: Alice',350,160),line('Shop: Potions',350,180),line('Red Potion',350,240),line('Price: 1,500 mesos',350,259)]
        rows,ctx,_=detect(lines,CAT,(1024,768));self.assertEqual(ctx,{'channel':'4','room':'7','seller':'Alice','shop':'Potions'});self.assertEqual(rows[0]['price'],'1,500');self.assertEqual(rows[0]['quantity'],'')
    def test_channel_menu_and_chat_room_are_not_location(self):
        _,ctx,_=detect([line('Channel 1',20,10),line('Channel 2',20,30),line('Free Market 9',10,700)],CAT,(1024,768));self.assertEqual(ctx['channel'],'');self.assertEqual(ctx['room'],'')
    def test_unlabeled_numbers_and_ambiguous_prices_rejected(self):
        for prices in [[line('99999',350,259)],[line('Price: 100 mesos',350,259),line('Price: 200 mesos',350,260)]]:
            rows,_,_=detect([line('Red Potion',350,240)]+prices,CAT,(1024,768));self.assertEqual(rows,[])

    def test_sold_out_row_is_excluded_from_realistic_listing_crop(self):
        from PIL import Image,ImageDraw
        image=Image.new('RGB',(411,460),(220,230,238));draw=ImageDraw.Draw(image)
        draw.rectangle((0,0,410,75),fill=(180,195,205));draw.text((82,18),'Green Morrican',fill='black');draw.text((82,50),'1 for 7,000 mesos',fill='black')
        draw.rectangle((0,80,410,145),fill=(225,232,238));draw.text((82,98),'Blue Morrican',fill=(220,225,230));draw.text((82,130),'1 for 7,000 mesos',fill=(220,225,230))
        lines=[line('Green Morrican',82,18,155),line('1 for 7,000 mesos',82,50,190),line('Blue Morrican',82,98,155),line('1 for 7,000 mesos',82,130,190)]
        rows,_,_=detect(lines,[{'id':1,'name':'Green Morrican'},{'id':2,'name':'Blue Morrican'}],image.size,image=image)
        self.assertEqual([r['raw_name'] for r in rows],['Green Morrican'])
        self.assertEqual(rows[0]['quantity'],'1')
    def test_multiple_rows_keep_distinct_prices(self):
        rows,_,_=detect([line('Red Potion',350,240),line('Price: 100 mesos',350,259),line('Blue Potion',350,300),line('Price: 200 mesos',350,319)],CAT,(1024,768));self.assertEqual([r['price'] for r in rows],['100','200'])
    def test_unmatched_catalog_item_is_still_shown_for_review(self):
        rows,_,_=detect([line('Pink Allstar',350,240),line('1 for 5,000 mesos',350,259)],CAT,(1024,768))
        self.assertEqual(len(rows),1);self.assertEqual(rows[0]['raw_name'],'Pink Allstar');self.assertEqual(rows[0]['matches'],[])
    def test_memory_requires_consistent_three_reviews_and_persists(self):
        with tempfile.TemporaryDirectory() as d:
            m=NameMemory(Path(d)/'names.json')
            for _ in range(2):m.confirm('Red Potlon',1)
            self.assertEqual(m.matches('Red Potlon',CAT,[]),[]);m.confirm('Red Potlon',1)
            m=NameMemory(m.path);self.assertEqual(m.matches('Red Potlon',CAT,[])[0][1]['id'],1)
            m.confirm('Red Potlon',2);self.assertEqual(m.matches('Red Potlon',CAT,[]),[])
    def test_ocr_coordinates_and_line_grouping(self):
        from unittest.mock import patch
        from PIL import Image
        from auto_detect import ocr_lines
        data={'text':['Red','Potion','Price:','1,500','mesos'],'conf':['95']*5,
              'block_num':[1,1,2,2,2],'par_num':[1]*5,'line_num':[1]*5,
              'left':[30,110,30,130,250],'top':[60,60,105,105,105],
              'width':[65,100,85,105,80],'height':[30]*5}
        with patch('pytesseract.image_to_data',return_value=data):
            lines=ocr_lines(Image.new('RGB',(800,600)))
        self.assertEqual(lines[0]['text'],'Red Potion');self.assertEqual(lines[0]['box'],(10,20,70,30))
        self.assertEqual(lines[1]['text'],'Price: 1,500 mesos')

