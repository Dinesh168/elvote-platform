"""
Prepares the demo data file (spec docs/specs/real-demo-data.md). Runs on the owner's PC only.
Voters: keeps part, serial, section, house, age, gender, relation type; names, relatives and EPIC are MADE UP (D1).
Prints only counts. Output: real-demo.json next to this script.
Usage: python -I prep_real_demo.py <2027_data dir> <election-trend data dir>
"""
import csv, json, random, sys, os, collections
import openpyxl

SRC, TREND = sys.argv[1], sys.argv[2]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'real-demo.json')
rnd = random.Random(2027)

PB_M = [('Gurpreet', 'ਗੁਰਪ੍ਰੀਤ'), ('Harjinder', 'ਹਰਜਿੰਦਰ'), ('Manpreet', 'ਮਨਪ੍ਰੀਤ'), ('Jaswinder', 'ਜਸਵਿੰਦਰ'), ('Kuldeep', 'ਕੁਲਦੀਪ'), ('Baljit', 'ਬਲਜੀਤ'),
        ('Sukhwinder', 'ਸੁਖਵਿੰਦਰ'), ('Amrik', 'ਅਮਰੀਕ'), ('Paramjit', 'ਪਰਮਜੀਤ'), ('Ranjit', 'ਰਣਜੀਤ'), ('Satnam', 'ਸਤਨਾਮ'), ('Gurdev', 'ਗੁਰਦੇਵ'),
        ('Rajinder', 'ਰਾਜਿੰਦਰ'), ('Harpal', 'ਹਰਪਾਲ'), ('Jagdeep', 'ਜਗਦੀਪ'), ('Navdeep', 'ਨਵਦੀਪ'), ('Mohan', 'ਮੋਹਨ'), ('Ashok', 'ਅਸ਼ੋਕ'), ('Rakesh', 'ਰਾਕੇਸ਼'), ('Vijay', 'ਵਿਜੇ')]
PB_F = [('Harpreet', 'ਹਰਪ੍ਰੀਤ'), ('Manjit', 'ਮਨਜੀਤ'), ('Jasvir', 'ਜਸਵੀਰ'), ('Sukhpreet', 'ਸੁਖਪ੍ਰੀਤ'), ('Amarjit', 'ਅਮਰਜੀਤ'), ('Gurmeet', 'ਗੁਰਮੀਤ'),
        ('Kamaljit', 'ਕਮਲਜੀਤ'), ('Rajwinder', 'ਰਾਜਵਿੰਦਰ'), ('Navneet', 'ਨਵਨੀਤ'), ('Simran', 'ਸਿਮਰਨ'), ('Paramjit', 'ਪਰਮਜੀਤ'), ('Baljinder', 'ਬਲਜਿੰਦਰ'),
        ('Sunita', 'ਸੁਨੀਤਾ'), ('Neelam', 'ਨੀਲਮ'), ('Rekha', 'ਰੇਖਾ'), ('Pooja', 'ਪੂਜਾ')]
PB_SUR = [('Singh', 'ਸਿੰਘ'), ('Sharma', 'ਸ਼ਰਮਾ'), ('Kumar', 'ਕੁਮਾਰ'), ('Saini', 'ਸੈਣੀ'), ('Gill', 'ਗਿੱਲ'), ('Sandhu', 'ਸੰਧੂ'), ('Verma', 'ਵਰਮਾ'), ('Bains', 'ਬੈਂਸ')]
UP_M = [('Ramesh', 'रमेश'), ('Suresh', 'सुरेश'), ('Rajesh', 'राजेश'), ('Mukesh', 'मुकेश'), ('Dinesh', 'दिनेश'), ('Santosh', 'संतोष'), ('Anil', 'अनिल'),
        ('Sunil', 'सुनील'), ('Vinod', 'विनोद'), ('Ashok', 'अशोक'), ('Ram', 'राम'), ('Shyam', 'श्याम'), ('Rakesh', 'राकेश'), ('Pankaj', 'पंकज'), ('Ajay', 'अजय'), ('Manoj', 'मनोज')]
UP_F = [('Sunita', 'सुनीता'), ('Geeta', 'गीता'), ('Sita', 'सीता'), ('Kamla', 'कमला'), ('Asha', 'आशा'), ('Usha', 'उषा'), ('Pushpa', 'पुष्पा'),
        ('Rekha', 'रेखा'), ('Anita', 'अनीता'), ('Savitri', 'सावित्री'), ('Kiran', 'किरण'), ('Neha', 'नेहा'), ('Pooja', 'पूजा'), ('Priyanka', 'प्रियंका')]
UP_SUR = [('Singh', 'सिंह'), ('Yadav', 'यादव'), ('Gupta', 'गुप्ता'), ('Verma', 'वर्मा'), ('Pandey', 'पांडेय'), ('Tiwari', 'तिवारी'), ('Rai', 'राय'), ('Chauhan', 'चौहान'), ('Kumar', 'कुमार')]
REL = {'Father': 'F', 'Husband': 'H', 'Mother': 'M', 'Other': 'O'}
GEN = {'Male': 'M', 'Female': 'F', 'Third Gender': 'T'}


def person(gender, m, f, sur, fam=None):
    first = rnd.choice(f if gender == 'F' else m)
    last = fam or rnd.choice(sur)
    if sur is PB_SUR and gender == 'F' and rnd.random() < 0.6:
        last = ('Kaur', 'ਕੌਰ')
    return f'{first[0]} {last[0]}', f'{first[1]} {last[1]}'


def num(v):
    try:
        return int(float(str(v).replace(',', ''))) if v not in (None, '') else 0
    except ValueError:
        return 0


def sheet(path, name=None):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb[name] if name else wb.worksheets[0]
    rows = ws.iter_rows(values_only=True)
    head = [str(h).strip() if h is not None else '' for h in next(rows)]
    for r in rows:
        yield dict(zip(head, r))


coords = json.load(open(os.path.join(TREND, 'ps_coordinates.json'), encoding='utf-8'))
def coords_for(state, assembly):
    return {int(x['partNo']): (x['lat'], x['lng']) for x in coords if x['state'] == state and x['assembly'] == assembly and x['lat'] and x['lng']}

# ---------- Punjab AC 50 Rupnagar ----------
pb_geo = coords_for('Punjab', 'Rupnagar')
parts = {}
for r in sheet(os.path.join(SRC, 'AC50.xlsx'), 'Parts'):
    p = num(r.get('part_no'))
    if not p:
        continue
    parts[p] = {'part': p, 'name': str(r.get('polling_station_name') or f'Booth {p}').strip(), 'address': (str(r.get('polling_station_address') or '').strip() or None),
                'village': (str(r.get('main_village') or '').strip() or None), 'tehsil': (str(r.get('tehsil') or '').strip() or None), 'district': str(r.get('district') or 'Rupnagar').strip()}
for p, b in parts.items():
    b['lat'], b['lng'] = pb_geo.get(p, (None, None))

notes = {}
with open(os.path.join(TREND, 'punjab-2022.csv'), encoding='utf-8-sig', errors='replace') as fh:
    for r in csv.DictReader(fh):
        notes[num(r['POLLING STATION-NUMBER'])] = (r.get('Data Note', ''), num(r.get('AAP Votes')), num(r.get('INC Votes')))
pb_results = []
for r in sheet(os.path.join(SRC, '50_data.xlsx')):
    p = num(r.get('part_no'))
    if not p:
        continue
    votes = {k: num(r.get(f'{k} Votes')) for k in ('AAP', 'INC', 'SAD', 'BJP')}
    total = num(r.get('Total Votes')) or sum(votes.values())
    if not sum(votes.values()):
        continue
    note, aap, inc = notes.get(p, ('', -1, -1))
    if (aap, inc) != (votes['AAP'], votes['INC']):
        note = ''  # 50_data has its own votes for this booth; the old note does not apply
    pb_results.append({'ac': 50, 'part': p, 'year': 2022, 'name': parts.get(p, {}).get('name'), 'district': 'Rupnagar', 'tehsil': str(r.get('tehsil') or '') or None,
                       'village': parts.get(p, {}).get('village'), 'total': max(total, sum(votes.values())), 'electors': None, 'votes': votes,
                       'estimated': bool(note) and 'Form 20' not in note})

pb_voters = []
epic = 1
fam_by_house = {}
for r in sheet(os.path.join(SRC, 'AC50.xlsx'), 'Voters'):
    p, sno = num(r.get('part_no')), num(r.get('sl_no'))
    if not p or not sno:
        continue
    g = GEN.get(r.get('gender'), 'M')
    house = str(r.get('house_no') or '').strip()[:30] or None
    key = (p, house)
    fam = fam_by_house.get(key) if house else None
    if not fam:
        fam = rnd.choice(PB_SUR)
        if house:
            fam_by_house[key] = fam
    name, name_pa = person(g, PB_M, PB_F, PB_SUR, fam)
    rel = REL.get(r.get('relation_type'), 'F')
    rname, rname_pa = person('F' if rel == 'M' else 'M', PB_M, PB_F, PB_SUR, fam)
    age = num(r.get('age'))
    pb_voters.append([p, sno, f'ZZD{epic:07d}', name, name_pa, rel, rname, rname_pa, g, age if 18 <= age <= 110 else None, house,
                      num(r.get('section_no')) or None, (str(r.get('section_name') or '').strip() or None)])
    epic += 1

# ---------- UP AC 361 Ballia Nagar ----------
up_geo = coords_for('Uttar Pradesh', 'Ballia Nagar')
up_booths, up_results = {}, []
for r in sheet(os.path.join(SRC, 'up_361_data.xlsx')):
    p = num(r.get('part_no'))
    if not p:
        continue
    lat, lng = up_geo.get(p, (None, None))
    up_booths[p] = {'part': p, 'name': str(r.get('polling_station_name') or f'Booth {p}').strip(), 'address': (str(r.get('polling_station_address') or '').strip() or None),
                    'village': (str(r.get('main_village') or '').strip() or None), 'tehsil': (str(r.get('tehsil') or '').strip() or None), 'district': 'Ballia', 'lat': lat, 'lng': lng}
    votes = {k: num(r.get(f'{k} Votes')) for k in ('BJP', 'SP', 'BSP')}
    if sum(votes.values()):
        total = num(r.get('Total Votes')) or sum(votes.values())
        up_results.append({'ac': 361, 'part': p, 'year': 2022, 'name': up_booths[p]['name'], 'district': 'Ballia', 'tehsil': up_booths[p]['tehsil'],
                           'village': up_booths[p]['village'], 'total': max(total, sum(votes.values())), 'electors': None, 'votes': votes, 'estimated': False})
up_voters = []
epic = 1
for p in sorted(up_booths):
    sno, house = 1, rnd.randint(1, 30)
    while sno <= 200:
        fam = rnd.choice(UP_SUR)
        for k in range(min(rnd.randint(1, 6), 201 - sno)):
            g = 'M' if k == 0 else 'F' if k == 1 else rnd.choice('MF')
            name, name_hi = person(g, UP_M, UP_F, UP_SUR, fam)
            rel = 'H' if k == 1 else 'F'
            rname, rname_hi = person('M', UP_M, UP_F, UP_SUR, fam)
            age = rnd.randint(38, 80) if k < 2 else rnd.randint(18, 40)
            up_voters.append([p, sno, f'ZZU{epic:07d}', name, name_hi, rel, rname, rname_hi, g, age, str(house), 1 + (sno - 1) // 100, None])
            sno += 1
            epic += 1
        house += rnd.randint(1, 2)

out = {
    'pb50': {'state': 'PB', 'ac': 50, 'name': 'Rupnagar', 'nameLocal': 'ਰੂਪਨਗਰ', 'district': ['PBRUP', 'Rupnagar'], 'booths': sorted(parts.values(), key=lambda b: b['part']),
             'voters': pb_voters, 'results': pb_results, 'rollSource': 'Electoral roll 2026 (names made up)'},
    'up361': {'state': 'UP', 'ac': 361, 'name': 'Ballia Nagar', 'nameLocal': 'बलिया नगर', 'district': ['UPBAL', 'Ballia'], 'booths': sorted(up_booths.values(), key=lambda b: b['part']),
              'voters': up_voters, 'results': up_results, 'rollSource': 'Sample voters'},
}
json.dump(out, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False)
for k, v in out.items():
    epics = {x[2] for x in v['voters']}
    print(k, 'booths', len(v['booths']), 'with location', sum(1 for b in v['booths'] if b['lat']), 'results', len(v['results']),
          'estimated', sum(1 for r in v['results'] if r['estimated']), 'voters', len(v['voters']), 'unique EPIC', len(epics),
          'all made-up EPIC', all(e.startswith('ZZ') for e in epics))
print('file MB', round(os.path.getsize(OUT) / 1e6, 1))
