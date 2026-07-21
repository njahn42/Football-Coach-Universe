// ─── Raw data types (from public/data/*.json) ───────────────────────────────

export interface TeamAttributes {
  prestige: number;      // 1–10
  facilities: number;   // 1–10
  stadium: number;      // 1–10
  collegeLife: number;  // 1–10
  academics: number;    // 1–10
  marketing: number;    // 1–10
  fanbaseLevel: number; // 1–10
}

export interface Team {
  name: string;
  abbreviation: string;
  mascot: string;
  state: string;
  zipcode: string;
  division: 'FBS' | 'FCS';
  primaryColor: string;
  secondaryColor: string;
  attendance: number;
  attributes: TeamAttributes;
  archetype: string;
  fanbaseType: string;
  rating: number; // 35–194
}

export interface Bowl {
  name: string;
  zipcode: string;
  indoors: boolean;
}

export interface City {
  cityName: string; // e.g. "Atlanta, GA"
  zipcode: string;
  stadium: string;  // e.g. "Mercedes-Benz Stadium"
  indoors: boolean;
}

export interface Enums {
  archetypes: string[];
  fanbaseTypes: string[];
}

// ─── Division layout ──────────────────────────────────────────────────────────

/** All valid division layouts. Label shows the segmented control display text. */
export type DivisionLayout = '1x10' | '2x6' | '2x7' | '2x9' | '4x4' | '4x5';

export const LAYOUT_LABELS: Record<DivisionLayout, string> = {
  '1x10': '1 × 10',
  '2x6':  '2 × 6',
  '2x7':  '2 × 7',
  '2x9':  '2 × 9',
  '4x4':  '4 × 4',
  '4x5':  '4 × 5',
};

/** Number of divisions for a given layout. */
export function numDivisions(layout: DivisionLayout): 1 | 2 | 4 {
  if (layout === '1x10') return 1;
  if (layout.startsWith('2')) return 2;
  return 4;
}

/** Teams per division for a given layout. */
export function teamsPerDivision(layout: DivisionLayout): number {
  return parseInt(layout.split('x')[1], 10);
}

/** Total teams in a conference for a given layout. */
export function totalTeams(layout: DivisionLayout): number {
  return numDivisions(layout) * teamsPerDivision(layout);
}

// ─── Draft state types ────────────────────────────────────────────────────────

/**
 * A division slot array: length = teamsPerDivision(layout), null = empty slot.
 * Slots are positional — teams[0] occupies slot 0, etc.
 */
export interface DraftedDivision {
  name: string;
  teams: (Team | null)[];
}

export interface ConferenceDraft {
  id: string;
  name: string;              // from conference_names.json
  ccgCity: City;             // chosen city (zipcode pulled from here)
  layout: DivisionLayout;
  divisionNameSetIndex: number; // index into paired/quad sets from division_names.json
  divisions: DraftedDivision[];
}

// ─── Draft filter types ────────────────────────────────────────────────────────

export interface DraftFilters {
  division: '' | 'FBS' | 'FCS';
  state: string;       // '' = all states
  archetype: string;   // '' = all archetypes
  fanbaseType: string; // '' = all fanbase types
}

export const EMPTY_FILTERS: DraftFilters = {
  division: '',
  state: '',
  archetype: '',
  fanbaseType: '',
};

// ─── Prestige types ───────────────────────────────────────────────────────────

export interface ConferencePrestigeInfo {
  confId: string;
  confName: string;
  avgRating: number;    // mean rating of all drafted teams; 0 if none
  filledSlots: number;
  totalSlots: number;
  isFinal: boolean;     // true when all slots are filled
  autoPrestige: number; // auto-ranked 1–10 from avgRating; unique per conference
  prestigeLevel: number;// effective: override if set, else autoPrestige
}

// ─── Last draft assignment (for undo) ─────────────────────────────────────────

export interface LastAssignment {
  confIndex: number;
  divIndex: number;
  slotIndex: number;
  team: Team;
}

// ─── OOC Rivalries (Screen 7) ─────────────────────────────────────────────────

export interface OOCRivalry {
  teamAAbbr: string;
  teamBAbbr: string;
  /** Week slot in the season (1–15). */
  preferredSlot: number;
  /** Play cadence: 1 = every year, 2 = every other year, etc. (1–4). */
  cadence: number;
  /** Which year within the cadence to play (0 to cadence - 1). Auto-clamped. */
  offset: number;
}

// ─── Bowl draft (Screen 8) ────────────────────────────────────────────────────

export interface BowlTieIn {
  slot1Primary?: string;  // conference name or '' for none
  slot1Backup?: string;
  slot2Primary?: string;
  slot2Backup?: string;
}

export interface BowlSelection {
  bowl: Bowl;
  tieIn: BowlTieIn;
}

/** Maximum number of bowl games that can be selected. */
export const MAX_BOWL_SELECTIONS = 40;

// ─── Validation (Screen 9) ────────────────────────────────────────────────────

export type ValidationSeverity = 'blocking' | 'warning';

export interface ValidationResult {
  id: string;
  label: string;
  pass: boolean;
  errorMessage?: string;
  severity: ValidationSeverity;
  /** Screen to navigate to in order to fix this issue. */
  screen?: ScreenId;
}

// ─── Export JSON shapes ───────────────────────────────────────────────────────

/** Team as it appears in the exported JSON (adds rivalAbbreviation). */
export interface ExportedTeam extends Team {
  rivalAbbreviation: string;
}

export interface ExportedDivision {
  name: string;
  teams: ExportedTeam[];
}

export interface ExportedConference {
  name: string;
  prestigeLevel: number;
  zipcode: string; // CCG city zipcode
  divisions: ExportedDivision[];
}

export interface ExportedBowlGame {
  name: string;
  zipcode: string;
  indoors: boolean;
  tieIn?: BowlTieIn; // omitted if all slots are empty
}

export interface UniverseExport {
  name: string;
  startingYear: number;
  startingMessage: string;
  conferences: ExportedConference[];
  bowlGames: ExportedBowlGame[];
  oocRivalries?: OOCRivalry[]; // omitted entirely if empty
}

// ─── Screens ──────────────────────────────────────────────────────────────────

export type ScreenId =
  | 'universe-info'
  | 'conference-count'
  | 'conference-setup'
  | 'draft-teams'
  | 'prestige-review'
  | 'rivalries'
  | 'ooc-rivalries'
  | 'bowl-draft'
  | 'review-export';

// ─── Input ────────────────────────────────────────────────────────────────────

export type GamepadAction =
  | 'dpadUp'
  | 'dpadDown'
  | 'dpadLeft'
  | 'dpadRight'
  | 'A'
  | 'B'
  | 'X'
  | 'Y'
  | 'LB'
  | 'RB'
  | 'LT'
  | 'RT'
  | 'Start';

/** Standard Xbox button index mapping (works for Steam Deck in Desktop Mode). */
export const GAMEPAD_BUTTON_MAP: Record<number, GamepadAction> = {
  0:  'A',
  1:  'B',
  2:  'X',
  3:  'Y',
  4:  'LB',
  5:  'RB',
  6:  'LT',
  7:  'RT',
  8:  'Start', // Select/Back maps to Start in this context
  9:  'Start',
  12: 'dpadUp',
  13: 'dpadDown',
  14: 'dpadLeft',
  15: 'dpadRight',
};

// ─── Draft cap ────────────────────────────────────────────────────────────────

/** Maximum number of teams that can be drafted across all conferences. */
export const MAX_DRAFTED_TEAMS = 200;
