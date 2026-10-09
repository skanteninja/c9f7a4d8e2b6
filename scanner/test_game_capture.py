import os, sys, unittest
from types import SimpleNamespace as NS
from unittest.mock import patch
from PIL import Image
from game_capture import GameCapture, GameWindow, CaptureUnavailable, WindowsGameFinder, choose_window, crop_rectangle

class GameCaptureTests(unittest.TestCase):
    def test_process_selection_ignores_small_popup_and_disambiguates(self):
        first=GameWindow(10,1,(0,0,800,600));popup=GameWindow(11,1,(0,0,100,100));second=GameWindow(20,2,(0,0,800,600))
        self.assertEqual(choose_window([popup,first],1),first)
        self.assertEqual(choose_window([first,second],2,10),second)
        self.assertEqual(choose_window([first,second],None,10),first)
        with self.assertRaises(CaptureUnavailable):choose_window([first,second])
        with self.assertRaises(CaptureUnavailable):choose_window([])

    def test_secondary_and_negative_monitor_coordinates(self):
        self.assertEqual(crop_rectangle((-1800,50,-1000,650),(-1920,0,0,1080)),(120,50,920,650))
        self.assertEqual(crop_rectangle((2100,50,2900,650),(1920,0,3840,1080)),(180,50,980,650))
        with self.assertRaises(CaptureUnavailable):crop_rectangle((1800,0,2600,600),(0,0,1920,1080))

    def test_follows_game_between_gpu_outputs_and_crops_only_client(self):
        class Finder:
            target=GameWindow(10,99,(-1800,50,-1000,650));visible=True
            def find(self,previous):return self.target
            def unobscured(self,window):return self.visible
            def cursor(self,origin,size):return origin,size
        class Camera:
            def __init__(self,rect,name,color):
                self._output=NS(update_desc=lambda:None,desc=NS(DesktopCoordinates=NS(left=rect[0],top=rect[1],right=rect[2],bottom=rect[3]),DeviceName=name))
                self.image=Image.new('RGB',(rect[2]-rect[0],rect[3]-rect[1]),color);self.released=False
            def grab(self,**kwargs):return self.image
            def release(self):self.released=True
        primary=Camera((0,0,1920,1080),'DISPLAY1','red');secondary=Camera((-1920,0,0,1080),'DISPLAY2','green')
        class DX:
            def output_info(self):return 'Device[0] Output[0]: Primary:True\nDevice[1] Output[0]: Primary:False'
            def create(self,device_idx,**kwargs):return [primary,secondary][device_idx]
        finder=Finder();capture=GameCapture(finder,DX())
        with patch('game_capture.Image.fromarray',side_effect=lambda image:image):
            frame=capture.frame();self.assertEqual(frame.size,(800,600));self.assertEqual(frame.getpixel((0,0)),(0,128,0));self.assertEqual(capture.display,'DISPLAY2')
            self.assertEqual(capture.cursor(),((-1800,50),(800,600)))
            finder.target=GameWindow(10,99,(100,50,900,650));frame=capture.frame()
            self.assertEqual(frame.getpixel((0,0)),(255,0,0));self.assertEqual(capture.origin,(100,50));self.assertEqual(capture.display,'DISPLAY1')
            finder.visible=False
            with self.assertRaises(CaptureUnavailable):capture.frame()
        capture.close();self.assertTrue(primary.released);self.assertTrue(secondary.released)
        with self.assertRaises(CaptureUnavailable):capture.frame()

    @unittest.skipUnless(sys.platform=='win32','Native Windows API smoke test')
    def test_real_windows_process_query_uses_64_bit_safe_handles(self):
        finder=WindowsGameFinder()
        self.assertEqual(finder.executable(os.getpid()),os.path.basename(sys.executable).casefold())
        try:window=finder.find()
        except CaptureUnavailable:return  # CI has no MapleStory client; enumeration still executes.
        self.assertGreater(window.pid,0)

if __name__=='__main__':unittest.main()
