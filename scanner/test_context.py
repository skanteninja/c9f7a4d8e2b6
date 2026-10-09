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
