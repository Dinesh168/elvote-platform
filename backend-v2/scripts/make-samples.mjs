// Made-up bilingual voter rolls for trying uploads (spec bilingual-roll U1–U7). No real people.
// Usage: node scripts/make-samples.mjs   → writes samples/*.csv
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(import.meta.dirname, '..', 'samples');
mkdirSync(OUT, { recursive: true });

const HEADER = ['part_no', 'booth_name', 'booth_name_local', 'booth_address', 'booth_address_local', 'locality', 'locality_local', 'sno', 'epic',
  'name', 'name_local', 'relation', 'relative_name', 'relative_name_local', 'gender', 'age', 'house_no', 'section_no', 'section', 'section_local'];
const q = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replaceAll('"', '""')}"` : String(v));

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = (a) => a[Math.floor(rnd() * a.length)];

const SETS = {
  pa: {
    men: [['Harjit', 'ਹਰਜੀਤ'], ['Balwinder', 'ਬਲਵਿੰਦਰ'], ['Sukhdev', 'ਸੁਖਦੇਵ'], ['Jaswinder', 'ਜਸਵਿੰਦਰ'], ['Gurdeep', 'ਗੁਰਦੀਪ'], ['Rajinder', 'ਰਾਜਿੰਦਰ'], ['Kulwant', 'ਕੁਲਵੰਤ'], ['Amrik', 'ਅਮਰੀਕ']],
    women: [['Gurpreet', 'ਗੁਰਪ੍ਰੀਤ'], ['Manpreet', 'ਮਨਪ੍ਰੀਤ'], ['Paramjit', 'ਪਰਮਜੀਤ'], ['Amandeep', 'ਅਮਨਦੀਪ'], ['Harpreet', 'ਹਰਪ੍ਰੀਤ'], ['Simran', 'ਸਿਮਰਨ']],
    last: [['Singh Sandhu', 'ਸਿੰਘ ਸੰਧੂ'], ['Singh Gill', 'ਸਿੰਘ ਗਿੱਲ'], ['Singh Dhillon', 'ਸਿੰਘ ਢਿੱਲੋਂ'], ['Singh Sidhu', 'ਸਿੰਘ ਸਿੱਧੂ'], ['Singh Bajwa', 'ਸਿੰਘ ਬਾਜਵਾ']],
    lastF: [['Kaur Sandhu', 'ਕੌਰ ਸੰਧੂ'], ['Kaur Gill', 'ਕੌਰ ਗਿੱਲ'], ['Kaur Dhillon', 'ਕੌਰ ਢਿੱਲੋਂ'], ['Kaur Sidhu', 'ਕੌਰ ਸਿੱਧੂ'], ['Kaur Bajwa', 'ਕੌਰ ਬਾਜਵਾ']],
    town: ['Sample Nagar', 'ਸੈਂਪਲ ਨਗਰ'], school: ['Govt. Senior Secondary School', 'ਸਰਕਾਰੀ ਸੀਨੀਅਰ ਸੈਕੰਡਰੀ ਸਕੂਲ'],
    road: ['Main Bazar', 'ਮੇਨ ਬਾਜ਼ਾਰ'], ward: ['Ward', 'ਵਾਰਡ'], room: 'ਕਮਰਾ', street: ['Gali No.', 'ਗਲੀ ਨੰ.'], epic: 'SPB',
  },
  hi: {
    men: [['Ramesh', 'रमेश'], ['Suresh', 'सुरेश'], ['Rajesh', 'राजेश'], ['Mahender', 'महेंद्र'], ['Vijay', 'विजय'], ['Satbir', 'सतबीर'], ['Naresh', 'नरेश'], ['Dinesh', 'दिनेश']],
    women: [['Sunita', 'सुनीता'], ['Kavita', 'कविता'], ['Pooja', 'पूजा'], ['Anita', 'अनीता'], ['Rekha', 'रेखा'], ['Savita', 'सविता']],
    last: [['Kumar', 'कुमार'], ['Yadav', 'यादव'], ['Malik', 'मलिक'], ['Sharma', 'शर्मा'], ['Saini', 'सैनी']],
    lastF: [['Devi', 'देवी'], ['Yadav', 'यादव'], ['Malik', 'मलिक'], ['Sharma', 'शर्मा'], ['Saini', 'सैनी']],
    town: ['Namuna Gaon', 'नमूना गाँव'], school: ['Govt. Senior Secondary School', 'राजकीय वरिष्ठ माध्यमिक विद्यालय'],
    road: ['Main Bazar', 'मेन बाज़ार'], ward: ['Ward', 'वार्ड'], room: 'कमरा', street: ['Gali No.', 'गली नं.'], epic: 'SHR',
  },
};

function voter(S, n, part, sno) {
  const female = rnd() < 0.48;
  const [fe, fl] = pick(female ? S.women : S.men);
  const [le, ll] = pick(female ? S.lastF : S.last);
  const [re, rl] = pick(S.men);
  const [rle, rll] = pick(S.last);
  const married = female && rnd() < 0.7;
  const sec = 1 + Math.floor((sno - 1) / 15);
  return {
    part, sno, epic: `${S.epic}${String(2000000 + n)}`, name: `${fe} ${le}`, nameL: `${fl} ${ll}`,
    relation: married ? 'W/o' : female ? 'D/o' : 'S/o', rel: `${re} ${rle}`, relL: `${rl} ${rll}`,
    gender: female ? 'F' : 'M', age: 18 + Math.floor(rnd() * 70), house: String(1 + Math.floor((sno - 1) / 3)), sec,
  };
}

function row(S, v) {
  return [v.part, `${S.school[0]}, ${S.town[0]} (Room ${v.part})`, `${S.school[1]}, ${S.town[1]} (${S.room} ${v.part})`,
    `${S.road[0]}, ${S.town[0]}`, `${S.road[1]}, ${S.town[1]}`, S.town[0], S.town[1], v.sno, v.epic, v.name, v.nameL, v.relation, v.rel, v.relL,
    v.gender, v.age, v.house, v.sec, `${S.street[0]} ${v.sec}`, `${S.street[1]} ${v.sec}`].map(q).join(',');
}

function rolls(lang, file) {
  const S = SETS[lang];
  const booths = 3;
  const per = 40;
  const draft = [];
  let n = 0;
  for (let b = 1; b <= booths; b++) for (let s = 1; s <= per; s++) draft.push(voter(S, ++n, b, s));
  // Final: 3 moved from booth 1 to 2, 3 removed, 4 new, 3 details corrected.
  const final = draft.map((v) => ({ ...v }));
  const at = (i) => final[i];
  for (const i of [4, 5, 6]) { at(i).part = 2; at(i).sno = per + i; }
  final.splice(80, 3); // three voters of booth 3 are not in the final roll
  at(10).house = `${at(10).house}A`;
  at(20).age += 1;
  at(30).sno = 41;
  for (let k = 0; k < 4; k++) final.push(voter(S, 900 + k, 1 + (k % booths), per + 10 + k));
  writeFileSync(path.join(OUT, `${file}-draft.csv`), [HEADER.join(','), ...draft.map((v) => row(S, v))].join('\n') + '\n');
  writeFileSync(path.join(OUT, `${file}-final.csv`), [HEADER.join(','), ...final.map((v) => row(S, v))].join('\n') + '\n');
  return draft;
}

const pb = rolls('pa', 'pb-ac81-punjabi');
rolls('hi', 'hr-ac13-hindi');
// The same EPICs in a different assembly → "held" on upload (U2/U7).
const clash = pb.slice(0, 3).map((v, i) => ({ ...v, part: 1, sno: i + 1 }));
writeFileSync(path.join(OUT, 'pb-ac82-epic-clash.csv'), [HEADER.join(','), ...clash.map((v) => row(SETS.pa, v))].join('\n') + '\n');
console.log('samples written to', OUT);
