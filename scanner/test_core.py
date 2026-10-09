import tempfile, unittest
from pathlib import Path
from core import UploadQueue, match_items, parse_integer, read_location, cursor_rectangle, validate_nickname, associated_shop

class CoreTests(unittest.TestCase):
    def test_cursor_association_is_recent_and_nearby(self):
        hover=((500,300),'Cheap Scrolls',10)
        self.assertEqual(associated_shop(hover,((501,301),11)),('Cheap Scrolls',11))
        self.assertIsNone(associated_shop(hover,((500,300),20)))
        self.assertIsNone(associated_shop(hover,((900,300),11)))
        self.assertIsNone(associated_shop(hover,((500,300),9)))
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


class UploadCountTests(unittest.TestCase):
    def test_counts_distinguish_confirmations_from_acknowledged_uploads(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'queue.sqlite';queue=UploadQueue(path)
            queue.enqueue({'eventId':'first'});queue.enqueue({'eventId':'second'});queue.enqueue({'eventId':'second'})
            self.assertEqual(queue.summary(),{'total':2,'sent':0,'pending':2})
            with queue.connect() as db:db.execute('UPDATE queue SET sent=1 WHERE id=?',('first',))
            self.assertEqual(UploadQueue(path).summary(),{'total':2,'sent':1,'pending':1})


class ContextTrackerTests(unittest.TestCase):
    def test_changing_shop_does_not_block_channel_updates(self):
        from core import ContextTracker
        tracker=ContextTracker();base={'world':'Windia','channel':'1','room':'7','seller':'Owner','shop':'Shop'}
        self.assertEqual(tracker.update(base)['channel'],'')
        self.assertEqual(tracker.update(base)['channel'],'1')
        changed=dict(base,channel='2',shop='Opening...')
        self.assertEqual(tracker.update(changed)['channel'],'')
        settled=tracker.update(dict(changed,shop='New shop'))
        self.assertEqual(settled['channel'],'2');self.assertEqual(settled['shop'],'')
        self.assertEqual(tracker.update(dict(changed,channel='',shop='New shop'))['channel'],'')
