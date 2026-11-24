/**
 * API contract for the v2 app. The mock API implements it now; the backend phase
 * implements the same contract over HTTP (this file becomes the source for docs/API.md v1).
 */

export type GroupCode = 'our' | 'target' | 'opp';
export type Relation = 'S/o' | 'W/o' | 'D/o';
export type Gender = 'M' | 'F' | 'T';
export type Residence = 'here' | 'moved' | 'died' | 'not_found';

export interface Voter {
  id: string; // mock: `${booth}-${sno}`; server: numeric id as a string
  booth: number;
  sno: number; // serial number in the booth's electoral roll
  name: string;
  relation: Relation;
  relative: string;
  age: number;
  gender: Gender;
  house: string;
  ward: string;
  village: string;
  epic: string;
  mobile?: string;
  group?: GroupCode; // undefined = not met
  residence: Residence;
  needsHelp: boolean;
  votedAt?: string; // ISO time, polling day
  updatedAt?: string;
  /** Regional script (spec bilingual-roll L2); absent when the roll has none. */
  nameLocal?: string;
  relativeLocal?: string;
  villageLocal?: string;
  /** Added by the latest roll (U5). */
  isNew?: boolean;
  /** English values kept when the regional ones are shown (search both scripts). */
  nameEn?: string;
  relativeEn?: string;
  villageEn?: string;
}

/** Fields a volunteer can change. */
export type VoterPatch = Partial<Pick<Voter, 'group' | 'residence' | 'needsHelp' | 'mobile' | 'votedAt'>> & {
  group?: GroupCode | null;
  votedAt?: string | null;
};

export interface Booth {
  no: number;
  name: string;
  village: string;
  lat?: number | null;
  lng?: number | null;
  voters?: number;
  nameLocal?: string;
  villageLocal?: string;
  address?: string;
  addressLocal?: string;
  nameEn?: string;
  villageEn?: string;
  addressEn?: string;
}

export interface TaskCriteria {
  gender?: Gender;
  ageMin?: number;
  ageMax?: number;
  group?: GroupCode;
  residence?: Residence;
}

export interface Task {
  id: string;
  name: string;
  kind?: string; // drive kind from the server (women, first_time, …) for translated names
  booths: number[];
  criteria: TaskCriteria;
  startDate?: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  lastWorkedAt?: string; // ISO, set by the client when the volunteer saves a voter in this task
}

export interface Volunteer {
  id: string;
  name: string;
  mobile: string;
  booths: number[];
  status: 'pending' | 'approved';
}

/** Party branding for the voter slip and headers (D8). */
export interface Branding {
  partyName: string;
  /** Set by the super-admin (spec customer-cms C2/C6). */
  candidatePhotoUrl?: string | null;
  slogan?: string | null;
  logoUrl?: string | null;
  slipShareText?: string | null;
  appName?: string | null;
  candidateName?: string | null;
  ballotNo?: number | null;
  brandColour?: string | null;
  electionName?: string | null;
  pollDate?: string | null; // YYYY-MM-DD
}

export interface Api {
  getMe(): Promise<Volunteer>;
  getBooths(): Promise<Booth[]>;
  getVoters(booth: number): Promise<Voter[]>;
  getTasks(): Promise<Task[]>;
  getBranding(): Promise<Branding>;
  updateVoter(id: string, patch: VoterPatch, meta?: { opId: string }): Promise<Voter>;
  /** Spec sync-modes S4: send queued changes of one team in order; one result per change. */
  syncBatch(mid: string | null, ops: SyncOp[], unsent: number): Promise<{ results: SyncResult[] }>;
}

export interface SyncOp { opId: string; voterId: string; clientAt: string; patch: VoterPatch }
export interface SyncResult { opId: string; status: 'ok' | 'duplicate' | 'error'; code?: string; message?: string }
