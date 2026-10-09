import importlib.util, json, tempfile, unittest
from pathlib import Path
from io import BytesIO
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('archive',Path(__file__).with_name('sync-scanner-learning.py'))
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

class ArchiveTests(unittest.TestCase):
    def test_deploy_response_does_not_advance_archive(self):
        responses=[BytesIO(b'{"listings":[]}'), BytesIO(b'{"examples":[],"next":0}')]
        with patch.object(module.urllib.request,'urlopen',side_effect=responses), patch.object(module.time,'sleep') as wait:
            result=module.read_batch('request')
        self.assertEqual(result,{'examples':[],'next':0});wait.assert_called_once_with(15)

    def test_archive_allowlist_and_safe_paths(self):
        corrected={key:1 for key in ('itemId','price','quantity','channel','room','slot')}
        corrected.update(name='Sword',priceBasis='unit',shop='Shop',observedAt='2026-10-09T00:00:00Z',nickname='Mint',server='Classic',world='QA',stats={},statsKnown=False,api_key='SECRET')
        example={'id':'12345678-1234-1234-1234-123456789abc','sequence':1,'receivedAt':'2026-10-09T00:00:00Z','schemaVersion':1,'scanner':{'version':'0.14.2','readings':{'name':'Sw0rd','api_key':'SECRET'},'matches':[{'itemId':1302000,'confidence':.8,'secret':'SECRET'}]},'corrected':corrected,'evidence':None,'secret':'SECRET'}
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);module.archive(example,root)
            files=list((root/'examples').glob('*.json'));self.assertEqual(len(files),1)
            self.assertNotIn('SECRET',files[0].read_text())
            self.assertEqual(json.loads(files[0].read_text())['scanner']['readings']['name'],'Sw0rd')
            with self.assertRaises(ValueError):module.archive(dict(example,id='../escape'),root)

if __name__=='__main__':unittest.main()
