"""Archive reviewed, sanitized API examples in GitHub; never use scanner keys."""
import argparse, base64, json, re, urllib.request
from pathlib import Path


def archive(example, root):
    sample_id = example['id']
    if not re.fullmatch(r'[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}', sample_id):
        raise ValueError('Invalid sample ID')
    # Repeat the allowlist at the archive boundary; arbitrary server fields are ignored.
    scanner = example['scanner']
    corrected = example['corrected']
    data = {key: example[key] for key in ('id', 'sequence', 'receivedAt', 'schemaVersion')}
    data['scanner'] = {key: scanner[key] for key in ('version', 'readings', 'matches')}
    data['scanner']['readings'] = {key: scanner['readings'].get(key, '') for key in ('name', 'price', 'quantity', 'shop', 'channel', 'room')}
    data['scanner']['matches'] = [{key: m[key] for key in ('itemId', 'confidence')} for m in scanner['matches']]
    data['corrected'] = {key: corrected[key] for key in ('itemId', 'name', 'price', 'quantity', 'priceBasis', 'shop', 'channel', 'room', 'slot', 'observedAt', 'nickname', 'server', 'world', 'stats', 'statsKnown')}
    folder = root / 'examples'; folder.mkdir(parents=True, exist_ok=True)
    evidence = example.get('evidence')
    if evidence:
        match = re.fullmatch(r'data:image/(png|jpeg);base64,([A-Za-z0-9+/=]+)', evidence)
        if not match or len(evidence)>100000: raise ValueError('Invalid item crop')
        filename = sample_id + ('.png' if match[1]=='png' else '.jpg')
        (folder / filename).write_bytes(base64.b64decode(match[2], validate=True))
        data['evidenceFile'] = filename
    (folder / (sample_id + '.json')).write_text(json.dumps(data, indent=2, ensure_ascii=False)+'\n', encoding='utf-8')


def sync(endpoint, root):
    state_file = root / 'cursor.json'
    cursor = json.loads(state_file.read_text())['after'] if state_file.exists() else 0
    count = 0
    for _ in range(10):
        request = urllib.request.Request(endpoint.rstrip('/')+'/api/market/learning?after='+str(cursor), headers={'User-Agent': 'TCW-Shopper-Learning/0.14.2'})
        with urllib.request.urlopen(request, timeout=30) as response: batch=json.load(response)
        examples=batch['examples']
        if not examples:break
        for example in examples:
            if not isinstance(example['sequence'], int) or example['sequence']<=cursor:raise ValueError('Non-monotonic learning cursor')
            archive(example, root); cursor=example['sequence']; count+=1
        # Cursor and evidence are committed together by the workflow. A failed commit retries.
        state_file.write_text(json.dumps({'after': cursor}, indent=2)+'\n')
        if len(examples)<100:break
    print(f'Archived {count} reviewed scanner examples; cursor {cursor}.')


if __name__ == '__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--endpoint', default='https://maplestory-classic.ofri505.workers.dev');parser.add_argument('--root', type=Path, default=Path('learning/scanner'))
    args=parser.parse_args();args.root.mkdir(parents=True,exist_ok=True);sync(args.endpoint,args.root)
