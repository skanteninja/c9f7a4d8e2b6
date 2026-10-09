import tempfile, unittest
from pathlib import Path
from core import UploadQueue, match_items, parse_integer

class CoreTests(unittest.TestCase):
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
