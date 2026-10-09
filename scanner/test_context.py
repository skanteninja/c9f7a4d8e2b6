import unittest
from PIL import Image
from app import Scanner

class ContextTests(unittest.TestCase):
    def test_location_changes_and_unreadable_labels_never_reuse_old_frame(self):
        scanner=Scanner.__new__(Scanner)
        readings={1:'CH 2',2:'Free Market <7>',3:'Cheap Scrolls'}
        scanner.ocr=lambda crop,**kwargs:readings[crop.getpixel((0,0))[0]]
        image=Image.new('RGB',(30,10))
        for number in range(1,4):image.paste((number,0,0),((number-1)*10,0,number*10,10))
        settings={'channel':'1','room':'1','shop':'Old Shop','tesseract':'', 'regions':{'channel':(0,0,10,10),'room':(10,0,20,10),'shop':(20,0,30,10)}}
        first,_=scanner.screen_context(image,settings)
        self.assertEqual((first['channel'],first['room'],first['shop']),('2','7','Cheap Scrolls'))
        readings.update({1:'CH 3',2:'Free Market <12>'})
        second,_=scanner.screen_context(image,settings)
        self.assertEqual((second['channel'],second['room']),('3','12'))
        self.assertEqual((first['channel'],first['room']),('2','7'))
        readings.update({1:'?',2:''})
        invalid,_=scanner.screen_context(image,settings)
        self.assertEqual((invalid['channel'],invalid['room']),('',''))
        self.assertEqual(settings['channel'],'1')

if __name__=='__main__':unittest.main()

class AutomaticContextTests(unittest.TestCase):
    def test_missing_regions_clear_old_context_and_fix_world(self):
        scanner=Scanner.__new__(Scanner)
        result,_=scanner.screen_context(Image.new('RGB',(10,10)),{'world':'Old World','channel':'7','room':'12','seller':'Old Owner','shop':'Old Shop','regions':{},'tesseract':''})
        self.assertEqual(result['world'],'Windia')
        for key in ('channel','room','seller','shop'):self.assertEqual(result[key],'')

    def test_shop_owner_changes_with_same_item_frame(self):
        scanner=Scanner.__new__(Scanner);readings={1:'OwnerA',2:'ShopA'}
        scanner.ocr=lambda crop,**kwargs:readings[crop.getpixel((0,0))[0]]
        image=Image.new('RGB',(20,10));image.paste((1,0,0),(0,0,10,10));image.paste((2,0,0),(10,0,20,10))
        settings={'regions':{'seller':(0,0,10,10),'shop':(10,0,20,10)},'tesseract':''}
        first,_=scanner.screen_context(image,settings)
        readings.update({1:'OwnerB',2:'ShopB'});second,_=scanner.screen_context(image,settings)
        self.assertEqual((first['seller'],first['shop']),('OwnerA','ShopA'))
        self.assertEqual((second['seller'],second['shop']),('OwnerB','ShopB'))

    def test_live_location_does_not_move_selected_review(self):
        import queue
        from unittest.mock import Mock
        class Value:
            def __init__(self,value=''):self.value=value
            def get(self):return self.value
            def set(self,value):self.value=value
        scanner=Scanner.__new__(Scanner);scanner.running=False;scanner.messages=queue.Queue();scanner.root=Mock()
        scanner.detected_context=Value();scanner.vars={k:Value(v) for k,v in {'world':'Windia','channel':'2','room':'7','seller':'OwnerA','shop':'ShopA'}.items()}
        scanner.selected={'settings':{'channel':'2','room':'7'}}
        live={'world':'Windia','channel':'3','room':'12','seller':'OwnerB','shop':'ShopB'}
        scanner.messages.put(('context',live));scanner.pump()
        self.assertIn('Channel 3',scanner.detected_context.get());self.assertIn('FM room 12',scanner.detected_context.get())
        self.assertEqual(scanner.vars['channel'].get(),'2');self.assertEqual(scanner.vars['seller'].get(),'OwnerA')
        scanner.selected=None;scanner.messages.put(('context',live));scanner.pump()
        self.assertEqual(scanner.vars['channel'].get(),'3');self.assertEqual(scanner.vars['seller'].get(),'OwnerB')
