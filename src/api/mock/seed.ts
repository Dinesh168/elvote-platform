/**
 * Deterministic synthetic data for mock mode. No real voter data is ever used.
 * Same seed → same output, so tests and screenshots are stable.
 */
import type { Booth, Gender, GroupCode, Relation, Task, Volunteer, Voter } from '../types';

export interface Seed {
  booths: Booth[];
  voters: Voter[];
  tasks: Task[];
  volunteer: Volunteer;
}

/** mulberry32: tiny, fast, deterministic PRNG. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MALE = ['Gurpreet', 'Harjit', 'Ramesh', 'Balwinder', 'Kuldeep', 'Jaswant', 'Karnail', 'Darshan', 'Amarjit', 'Sukhdev', 'Manjit', 'Paramjit', 'Rajinder', 'Surinder', 'Harbans', 'Jagdish', 'Mohan', 'Vinod', 'Anil', 'Rohit', 'Aman', 'Simranjeet', 'Lakhwinder', 'Baljit', 'Tarsem', 'Kartar', 'Jarnail', 'Prem', 'Ashok', 'Deepak'];
const FEMALE = ['Sunita', 'Harjit', 'Manpreet', 'Balwinder', 'Gurmeet', 'Paramjit', 'Simran', 'Rajwant', 'Kamaljit', 'Jaspreet', 'Navneet', 'Sukhwinder', 'Bachan', 'Shanti', 'Kiran', 'Neha', 'Pooja', 'Rani', 'Amandeep', 'Harpreet', 'Kulwinder', 'Rupinder', 'Satwant', 'Veena', 'Usha'];
const FAMILY: { m: string; f: string; w: number }[] = [
  { m: 'Singh', f: 'Kaur', w: 62 },
  { m: 'Kumar', f: 'Devi', w: 18 },
  { m: 'Sharma', f: 'Sharma', w: 8 },
  { m: 'Gill', f: 'Gill', w: 4 },
  { m: 'Sandhu', f: 'Sandhu', w: 4 },
  { m: 'Verma', f: 'Rani', w: 4 },
];

export function createSeed(seed = 20261118): Seed {
  const r = rng(seed);
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  const between = (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
  const chance = (p: number) => r() < p;
  const family = () => {
    let x = r() * 100;
    for (const f of FAMILY) {
      if ((x -= f.w) < 0) return f;
    }
    return FAMILY[0];
  };

  const booths: Booth[] = [
    { no: 112, name: 'Govt. School, Rampur', village: 'Rampur' },
    { no: 113, name: 'Govt. School East', village: 'Rampur East' },
  ];
  const sizes: Record<number, { total: number; ward: string }> = {
    112: { total: 1200, ward: '3' },
    113: { total: 1054, ward: '4' },
  };

  const voters: Voter[] = [];
  for (const b of booths) {
    const { total, ward } = sizes[b.no];
    let sno = 0;
    let houseNo = 0;
    let thirdGenderDone = false;
    while (sno < total) {
      houseNo += 1;
      const house = chance(0.08) ? `${houseNo}-A` : String(houseNo);
      const fam = family();
      const headFirst = pick(MALE);
      const headName = `${headFirst} ${fam.m}`;
      const headAge = between(30, 72);
      type Member = { name: string; relation: Relation; relative: string; age: number; gender: Gender };
      const members: Member[] = [];
      if (headAge > 55 || chance(0.15)) {
        // an elderly parent of the head lives in the house
        members.push({ name: `${pick(FEMALE)} ${fam.f}`, relation: 'W/o', relative: `${pick(MALE)} ${fam.m}`, age: Math.min(95, headAge + between(22, 30)), gender: 'F' });
      }
      members.push({ name: headName, relation: 'S/o', relative: `${pick(MALE)} ${fam.m}`, age: headAge, gender: 'M' });
      if (chance(0.9)) {
        members.push({ name: `${pick(FEMALE)} ${fam.f}`, relation: 'W/o', relative: headName, age: Math.max(18, headAge - between(1, 7)), gender: 'F' });
      }
      if (headAge >= 40) {
        const kids = between(0, 3);
        for (let k = 0; k < kids; k++) {
          const male = chance(0.5);
          members.push({
            name: `${pick(male ? MALE : FEMALE)} ${male ? fam.m : fam.f}`,
            relation: male ? 'S/o' : 'D/o',
            relative: headName,
            age: Math.max(18, Math.min(headAge - 18, between(18, 34))),
            gender: male ? 'M' : 'F',
          });
        }
      }
      for (const m of members.slice(0, 6)) {
        if (sno >= total) break;
        sno += 1;
        let gender = m.gender;
        if (!thirdGenderDone && sno === Math.floor(total / 2)) {
          gender = 'T';
          thirdGenderDone = true;
        }
        const met = chance(0.42);
        const g = r();
        const groupCode: GroupCode | undefined = met ? (g < 0.62 ? 'our' : g < 0.87 ? 'target' : 'opp') : undefined;
        const v: Voter = {
          id: `${b.no}-${sno}`,
          booth: b.no,
          sno,
          name: m.name,
          relation: m.relation,
          relative: m.relative,
          age: m.age,
          gender,
          house,
          ward,
          village: b.village,
          epic: `PBX${String(b.no * 10000 + sno).padStart(7, '0')}`,
          residence: chance(0.02) ? 'moved' : 'here',
          needsHelp: m.age > 75 && chance(0.3),
        };
        if (chance(0.4)) v.mobile = `${between(6, 9)}${String(between(0, 999999999)).padStart(9, '0')}`;
        if (groupCode) v.group = groupCode;
        voters.push(v);
      }
    }
  }

  const tasks: Task[] = [
    { id: 'women', name: 'Women outreach', booths: [112, 113], criteria: { gender: 'F' }, dueDate: '2026-11-25', lastWorkedAt: '2026-11-17T16:20:00Z' },
    { id: 'first', name: 'First-time voters', booths: [112, 113], criteria: { ageMax: 20 }, dueDate: '2026-11-29' },
    { id: 'seniors', name: 'Senior citizens', booths: [112, 113], criteria: { ageMin: 61 }, dueDate: '2026-12-05' },
  ];

  const volunteer: Volunteer = { id: 'vol-1', name: 'Suresh Kumar', mobile: '9876543210', booths: [112, 113], status: 'approved' };

  return { booths, voters, tasks, volunteer };
}
