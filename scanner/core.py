"""Catalog matching and a durable local upload queue; no game hooks."""
import json, re, sqlite3, urllib.error, urllib.request, uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path

def normalize_name(value):
    return re.sub(r'[^a-z0-9%]+', ' ', value.lower()).strip()

def match_items(name, catalog):
    needle = normalize_name(name)
    if not needle:
        return []
    exact = [item for item in catalog if normalize_name(item['name']) == needle]
    if exact:
        return [(1.0, item) for item in exact]
    matches = sorted(((SequenceMatcher(None, needle, normalize_name(item['name'])).ratio(), item)
                      for item in catalog), key=lambda pair: pair[0], reverse=True)
    return [pair for pair in matches[:5] if pair[0] >= .50]

def parse_integer(value):
    value = value.strip()
    if not re.fullmatch(r'\d+(?:[, ]\d{3})*|\d+', value):
        raise ValueError('Read an exact number; correct uncertain digits before publishing.')
    return int(re.sub(r'[, ]', '', value))

class UploadQueue:
    def __init__(self, path):
        self.path = str(path)
        with self.connect() as db:
            db.execute('CREATE TABLE IF NOT EXISTS queue (id TEXT PRIMARY KEY, payload TEXT NOT NULL, sent INTEGER DEFAULT 0, error TEXT)')

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path)
        try:
            with db:
                yield db
        finally:
            db.close()

    def enqueue(self, listing):
        listing = dict(listing, eventId=listing.get('eventId') or str(uuid.uuid4()), reviewed=True)
        with self.connect() as db:
            db.execute('INSERT OR IGNORE INTO queue (id,payload) VALUES (?,?)', (listing['eventId'], json.dumps(listing)))
        return listing['eventId']

    def pending(self):
        with self.connect() as db:
            return [(row[0], json.loads(row[1])) for row in db.execute('SELECT id,payload FROM queue WHERE sent=0 ORDER BY rowid LIMIT 12')]

    def count(self):
        with self.connect() as db:
            return db.execute('SELECT COUNT(*) FROM queue WHERE sent=0').fetchone()[0]

    def send(self, endpoint, api_key):
        pending = self.pending()
        if not pending:
            return 0
        endpoint = endpoint.rstrip('/')
        if not endpoint.startswith('https://'):
            raise ValueError('Use an HTTPS website address.')
        body = json.dumps({'listings': [row[1] for row in pending]}).encode()
        request = urllib.request.Request(endpoint + '/api/market/listings', data=body,
            headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + api_key,
                     'User-Agent': 'TCW-Shopper/0.14 (+https://maplestory-classic.ofri505.workers.dev)'})
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                result = json.load(response)
            if result.get('accepted', 0) + result.get('duplicates', 0) != len(pending):
                raise ValueError('Server did not acknowledge all listings; retained for retry.')
        except urllib.error.HTTPError as exc:
            try:
                message = json.load(exc).get('error', f'HTTP {exc.code}')
            except Exception:
                message = f'HTTP {exc.code}'
            raise ValueError(message) from exc
        with self.connect() as db:
            db.executemany('UPDATE queue SET sent=1,error=NULL WHERE id=?', [(row[0],) for row in pending])
        return len(pending)

def now_iso():
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')


def validate_nickname(value):
    value=value.strip()
    if not value or len(value)>32 or any(ord(c)<32 or ord(c)==127 for c in value):
        raise ValueError('Choose a nickname of 1–32 characters.')
    return value

def read_location(value,kind):
    """Read only the explicitly calibrated channel or map-label region."""
    value=value.strip()
    pattern = r'(?:channel|ch)\s*[:.#-]?\s*(\d{1,3})\b' if kind=='channel' else r'(?:free\s*market|fm|room)\s*[-:<># ]*\s*(\d{1,3})\b'
    hits=re.findall(pattern,value,re.I)
    if not hits and re.fullmatch(r'\d{1,3}',value):hits=[value]
    if len(set(hits))!=1:return None
    number=int(hits[0]);return number if 1<=number<=100 else None

def cursor_rectangle(point,offset,size):
    if point is None:return None
    rect=(point[0]+offset[0],point[1]+offset[1],point[0]+offset[2],point[1]+offset[3])
    return rect if 0<=rect[0]<rect[2]<=size[0] and 0<=rect[1]<rect[3]<=size[1] else None


def associated_shop(hover,click):
    if not hover or not click:return None
    if not 0<=click[1]-hover[2]<4:return None
    if abs(click[0][0]-hover[0][0])>=35 or abs(click[0][1]-hover[0][1])>=35:return None
    return hover[1],click[1]


def needs_nickname_setup(config):
    """Existing aliases migrate silently; canceled setup never prompts again."""
    return not config.get('nickname_setup_seen', False) and not str(config.get('nickname', '')).strip()


def learning_readings(candidate):
    """Explicit allowlist: never serialize settings, credentials or full frames."""
    readings = {'name': str(candidate.get('raw_name', ''))[:512],
                'price': str(candidate.get('price', ''))[:512],
                'quantity': str(candidate.get('quantity', ''))[:512]}
    for key in ('shop', 'channel', 'room'):
        readings[key] = str(candidate.get('context_reads', {}).get(key, ''))[:512]
    return {'version': '0.14.2', 'readings': readings,
            'matches': [{'itemId': item['id'], 'confidence': round(score, 4)}
                        for score, item in candidate.get('matches', [])[:5]]}
