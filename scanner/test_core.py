import tempfile, unittest
from pathlib import Path
from core import UploadQueue, match_items, parse_integer, read_location, cursor_rectangle, validate_nickname

class CoreTests(unittest.TestCase):
    def test_location_and_nickname(self):
        self.assertEqual(read_location('Free Market <12>','room'),12)
        self.assertEqual(read_location('CH. 7','channel'),7)
        self.assertIsNone(read_location('Channel 7 Channel 8','channel'))
        self.assertIsNone(read_location('Henesys 12','room'))
        self.assertEqual(validate_nickname('  Mint  '),'Mint')
        with self.assertRaises(ValueError):validate_nickname('bad\nname')
        self.assertEqual(cursor_rectangle((500,300),(-100,-60,100,-30),(1920,1080)),(400,240,600,270))
        self.assertIsNone(cursor_rectangle((1,1),(-100,-60,100,-30),(1920,1080)))
    def test_ambiguous_identity(self):
        items=[{'id':1,'name':'Blue Moon'},{'id':2,'name':'Blue Moon'},{'id':3,'name':'Red Moon'}]
        self.assertEqual(len(match_items('Blue Moon',items)),2)
    def test_scroll_variants_and_price_digits(self):
        self.assertEqual(parse_integer('1,200,000'),1200000)
        for value in ['1O00','12.5','1,23','-50','1m']:
            with self.assertRaises(ValueError):parse_integer(value)
    def test_queue_survives_restart_and_deduplicates(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'queue.sqlite';queue=UploadQueue(path)
            queue.enqueue({'eventId':'one','itemId':1});queue.enqueue({'eventId':'one','itemId':1})
            restored=UploadQueue(path);self.assertEqual(restored.count(),1)
            self.assertTrue(restored.pending()[0][1]['reviewed'])
            with self.assertRaises(ValueError):restored.send('http://untrusted.example','key')
            self.assertEqual(restored.count(),1)

if __name__=='__main__':unittest.main()
