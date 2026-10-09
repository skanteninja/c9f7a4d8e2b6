"""Catalog matching and a durable local upload queue; no game hooks."""
import json, re, sqlite3, urllib.error, urllib.request, uuid
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

    def connect(self):
        return sqlite3.connect(self.path)

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
            headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + api_key})
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
