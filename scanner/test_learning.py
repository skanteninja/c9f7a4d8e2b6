import json, tempfile, unittest
from pathlib import Path
from unittest.mock import Mock
from app import Scanner
from core import needs_nickname_setup, learning_readings, UploadQueue

class LearningTests(unittest.TestCase):
    def test_nickname_first_launch_and_migration(self):
        self.assertTrue(needs_nickname_setup({}))
        self.assertFalse(needs_nickname_setup({'nickname':'Mint'}))
        self.assertFalse(needs_nickname_setup({'nickname_setup_seen':True,'nickname':''}))
        self.assertFalse(needs_nickname_setup({'nickname_setup_seen':True,'nickname':'Mint'}))

    def test_startup_persists_before_prompt_and_never_repeats(self):
        scanner=Scanner.__new__(Scanner);scanner.config={}
        saved=[];scanner.save=lambda: saved.append(dict(scanner.config))
        scanner.ask_nickname=Mock()  # Simulate cancel: no nickname is added.
        scanner.first_setup();scanner.first_setup()
        scanner.ask_nickname.assert_called_once()
        self.assertTrue(saved[0]['nickname_setup_seen'])
        scanner.config={'nickname':'Mint'};scanner.ask_nickname.reset_mock()
        scanner.first_setup();scanner.ask_nickname.assert_not_called()

    def test_examples_exclude_connection_and_full_frame(self):
        candidate={'raw_name':'Sw0rd','price':'1,000','quantity':'2','matches':[(.9,{'id':1302000})],
                   'settings':{'api_key':'secret','nickname':'PRIVATE'},'image':'FULL_FRAME',
                   'context_reads':{'shop':'Store','channel':'CH 2','room':'FM 7','seller':'GameName'}}
        example=learning_readings(candidate)
        self.assertEqual(example['readings']['channel'],'CH 2')
        self.assertEqual(example['matches'][0]['itemId'],1302000)
        for forbidden in ('secret','PRIVATE','FULL_FRAME','GameName','api_key'):
            self.assertNotIn(forbidden,json.dumps(example))
        with tempfile.TemporaryDirectory() as folder:
            q=UploadQueue(Path(folder)/'queue.sqlite');q.enqueue({'learning':example})
            self.assertEqual(UploadQueue(Path(folder)/'queue.sqlite').pending()[0][1]['learning'],example)

if __name__=='__main__':unittest.main()
