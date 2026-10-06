"""Import the public Nexon markdown export without treating crossed-out prices as prices.

Usage: python audit/import-nexon-cash-shop.py announcement.md founders-rates.md aurora-rates.md
The checked-in JSON is the reviewed snapshot; runtime never scrapes announcements.
"""
import json
import re
import sys
from pathlib import Path

SOURCE = 'https://www.nexon.com/maplestory/news/sale/45819/founder-s-access-cash-shop'
LIMITED = {
    "Founder's Mystery Fashion Crate": '2026-10-28T07:59:00Z',
    'Aurora Stamp Shop Season 1': '2027-01-13T07:59:00Z',
    'Aurora Mystery Fashion Crate': '2027-01-13T07:59:00Z',
    'Mystery Style Coupons': '2026-10-28T07:59:00Z',
    '10-Day Equip Covers': '2026-11-18T17:59:00Z',
    'Fall Store Permit': '2026-11-18T17:59:00Z',
}


def plain(text):
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    return text.replace('**', '').replace('_', '').strip().removeprefix('- ').strip()


def import_catalog(markdown, rates):
    items = {}
    for match in re.finditer(r'^- \*\*(.+?)\*\*\s*\n((?:[ \t]+[^\n]*\n|\n)+)', markdown, re.M):
        name, body = match.groups()
        if 'Price' not in body:
            continue
        before = markdown[:match.start()]
        section = re.findall(r'^# \*\*(.+?)\*\*', before, re.M)[-1]
        price_options = []
        for line in body.splitlines():
            price = re.search(r'Price(?: \((\d+)\))?: (.+)', line)
            if not price:
                continue
            # Firecrawl's markdown concatenates the crossed-out and current values.
            values = re.findall(r'([\d,]+)\s*(NX|Aurora Stamps|Stamps)', price[2])
            amount, currency = values[-1]
            option = {'count': int(price[1] or 1), 'price': int(amount.replace(',', '')),
                      'currency': 'NX' if currency == 'NX' else 'Aurora Stamps'}
            if len(values) > 1:
                option['originalPrice'] = int(values[0][0].replace(',', ''))
            price_options.append(option)
        duration_text = re.search(r'Duration: (.+)', body)[1]
        days = re.search(r'^(\d+) days', duration_text)
        duration = {'kind': 'permanent' if duration_text == 'Permanent' else 'timed',
                    'days': int(days[1]) if days else None, 'text': duration_text}
        image = re.findall(r'!\[([^\]]*)\]\((https://g\.nexonstatic\.com/media/[^)]+)\)', before)
        details = [plain(line) for line in body.splitlines()
                   if line.strip() and not re.search(r'Price|Duration:|Contains:', line)]
        if section == 'Pets':
            details.append('Pet activity can be extended with Water of Life.')
        if section == 'Pet Equipment':
            details.append('Compatible with Brown Kitty, Black Kitty, Brown Puppy, Pink Bunny, White Bunny and Black Pig.')
        if section == 'Weather Effects':
            details.append('One use displays your message and a weather effect for 30 seconds; permanent refers to item expiry.')
        if name in ["Founder's Mystery Fashion Crate", 'Aurora Mystery Fashion Crate']:
            details.extend(['Contains one random decorative equip. The 7-day duration belongs to the unopened crate.',
                            'Reward item lifetimes are not stated in the announcement or rate table.',
                            'Unwanted unequipped rewards can be exchanged for Aurora Stamps.'])
        if 'Mystery' in name:
            details.append('Mystery purchases are unavailable in Belgium, Slovakia and Brazil.')
        if 'Fashion Crate' in name:
            details.append('Rewards obtained in the Netherlands can only be traded within the account.')
        if 'Palette' in name:
            details.append('Coupon expires in 14 days; the resulting utility item expires in 30 days.')
        item = {
            'id': 'founders-' + re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-'),
            'name': name, 'category': section, 'prices': price_options,
            'duration': duration, 'sale': {'starts': '2026-10-06-after-maintenance',
                                        'ends': LIMITED.get(section), 'kind': 'limited' if section in LIMITED else 'evergreen'},
            'details': details, 'sourceUrl': SOURCE,
            'image': image[-1][1] if image else '', 'imageAlt': section + ' illustration',
        }
        if name in rates:
            item['rewards'] = rates[name]
            item['ratesUrl'] = 'https://www.nexon.com/maplestory/general-post/' + ('45538' if name.startswith("Founder") else '45659')
        # Aurora's offer appears twice in the announcement, but is one product.
        if name in items:
            assert items[name]['prices'] == item['prices'] and items[name]['duration'] == duration
            item['category'] = items[name]['category']
        items[name] = item
    return {'id': 'founders-access', 'label': "Founder's Access", 'published': '2026-10-05',
            'checked': '2026-10-06', 'sourceUrl': SOURCE,
            'giftingMinimumLevel': 12, 'stampExpiry': '2027-01-13T07:59:00Z',
            'items': list(items.values())}


if __name__ == '__main__':
    rates = {}
    for name, file in zip(["Founder's Mystery Fashion Crate", 'Aurora Mystery Fashion Crate'], sys.argv[2:]):
        text = Path(file).read_text()
        rates[name] = [{'name': n.strip(), 'rate': float(r)}
                       for n, r in re.findall(r'^\| ([^|]+) \| ([\d.]+)% \|', text, re.M) if n.strip()]
    catalog = import_catalog(Path(sys.argv[1]).read_text(), rates)
    target = Path(__file__).with_name('nexon-founders-cash-shop.json')
    target.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n')
    print(f'Imported {len(catalog["items"])} unique offers to {target.name}')
