import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ConferenceDraft,
  DivisionLayout,
  ScreenId,
  City,
  Team,
  LastAssignment,
} from './types';
import { numDivisions, teamsPerDivision, totalTeams, MAX_DRAFTED_TEAMS } from './types';

// ─── Name/message suggestions ─────────────────────────────────────────────────

export function buildNameSuggestions(year: number): string[] {
  return [
    `${year} Custom Universe`,
    `${year} College Dynasty`,
    `${year} Gridiron Universe`,
    `${year} Custom College Season`,
    `${year} Champion's League`,
  ];
}

export function buildMessageSuggestions(name: string, year: number): string[] {
  return [
    `Welcome to the ${year} season of ${name}!`,
    `A new era of college football begins in ${year}. Welcome to ${name}!`,
    `${name}: ${year} kicks off. May the best program win!`,
  ];
}

// ─── Store state ──────────────────────────────────────────────────────────────

interface UniverseState {
  // Navigation
  currentScreen: ScreenId;
  conferenceSetupIndex: number; // which conference is being configured (0-based)

  // Screen 1: Universe Info
  universeName: string;
  nameIndex: number;
  startingYear: number;
  startingMessage: string;
  messageIndex: number;

  // Screen 2: Conference Count
  conferenceCount: 6 | 8 | 10 | null;

  // Screen 3+: Conference drafts (one per conference)
  conferences: ConferenceDraft[];

  // Screen 4: Team Pool (loaded once from teams.json)
  allTeams: Team[];

  // Screen 4: Last assignment — for undo within a session
  lastAssignment: LastAssignment | null;

  // Screen 5: Manual prestige overrides (confId → prestige 1–10)
  prestigeOverrides: Record<string, number>;

  // ── Computed helpers ───────────────────────────────────────────────────────
  /** Returns set of all drafted team abbreviations (used to exclude from pool). */
  getDraftedTeamAbbrs: () => Set<string>;
  /** Returns total drafted team count across all conferences. */
  getTotalDraftedCount: () => number;

  // ── Actions ────────────────────────────────────────────────────────────────
  setScreen: (screen: ScreenId) => void;
  setConferenceSetupIndex: (index: number) => void;

  // Universe Info
  setUniverseName: (name: string) => void;
  cycleNameSuggestion: (direction?: 'next' | 'prev') => void;
  setStartingYear: (year: number) => void;
  nudgeYear: (delta: number) => void;
  setStartingMessage: (msg: string) => void;
  cycleMessageSuggestion: (direction?: 'next' | 'prev') => void;

  // Conference Count
  setConferenceCount: (count: 6 | 8 | 10) => void;

  // Conference drafts (screens 3)
  upsertConference: (index: number, patch: Partial<ConferenceDraft>) => void;
  setConferenceLayout: (index: number, layout: DivisionLayout) => void;
  cycleConferenceDivisionNameSet: (index: number, direction?: 'next' | 'prev') => void;

  // Team pool (screen 4)
  setAllTeams: (teams: Team[]) => void;

  /**
   * Assign a team to a specific slot.
   * No-ops if: slot already filled, team already drafted, or cap reached.
   * Saves the assignment as lastAssignment for undo.
   */
  assignTeam: (team: Team, confIndex: number, divIndex: number, slotIndex: number) => void;

  /**
   * Remove the team from a specific slot (makes it empty again).
   * Clears lastAssignment if it matches.
   */
  removeTeamFromSlot: (confIndex: number, divIndex: number, slotIndex: number) => void;

  /** Undo the last assignment, restoring the team to the pool. */
  undoLastAssignment: () => void;

  // Prestige overrides (screen 5)
  setPrestigeOverride: (confId: string, level: number) => void;
  clearPrestigeOverride: (confId: string) => void;

  // Reset
  resetDraft: () => void;
}

// ─── Initial state ─────────────────────────────────────────────────────────────

const INITIAL_YEAR = new Date().getFullYear();
const INITIAL_NAME_IDX = 0;
const INITIAL_NAME = buildNameSuggestions(INITIAL_YEAR)[0];
const INITIAL_MSG = buildMessageSuggestions(INITIAL_NAME, INITIAL_YEAR)[0];

const initialState = {
  currentScreen: 'universe-info' as ScreenId,
  conferenceSetupIndex: 0,
  universeName: INITIAL_NAME,
  nameIndex: INITIAL_NAME_IDX,
  startingYear: INITIAL_YEAR,
  startingMessage: INITIAL_MSG,
  messageIndex: 0,
  conferenceCount: null as (6 | 8 | 10 | null),
  conferences: [] as ConferenceDraft[],
  allTeams: [] as Team[],
  lastAssignment: null as LastAssignment | null,
  prestigeOverrides: {} as Record<string, number>,
};

// ─── Store ─────────────────────────────────────────────────────────────────────

export const useUniverseStore = create<UniverseState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ── Computed helpers ─────────────────────────────────────────────────────
      getDraftedTeamAbbrs: () => {
        const { conferences } = get();
        const abbrs = new Set<string>();
        for (const conf of conferences) {
          for (const div of conf.divisions) {
            for (const team of div.teams) {
              if (team != null) abbrs.add(team.abbreviation);
            }
          }
        }
        return abbrs;
      },

      getTotalDraftedCount: () => {
        const { conferences } = get();
        let count = 0;
        for (const conf of conferences) {
          for (const div of conf.divisions) {
            for (const team of div.teams) {
              if (team != null) count++;
            }
          }
        }
        return count;
      },

      // ── Navigation ───────────────────────────────────────────────────────────
      setScreen: (screen) => set({ currentScreen: screen }),
      setConferenceSetupIndex: (index) => set({ conferenceSetupIndex: index }),

      // ── Universe Info ────────────────────────────────────────────────────────
      setUniverseName: (name) => {
        const { startingYear, messageIndex } = get();
        const msg = buildMessageSuggestions(name, startingYear)[messageIndex]
          ?? buildMessageSuggestions(name, startingYear)[0];
        set({ universeName: name, startingMessage: msg });
      },

      cycleNameSuggestion: (direction = 'next') => {
        const { nameIndex, startingYear } = get();
        const suggestions = buildNameSuggestions(startingYear);
        const next = direction === 'next'
          ? (nameIndex + 1) % suggestions.length
          : (nameIndex - 1 + suggestions.length) % suggestions.length;
        const name = suggestions[next];
        const { messageIndex } = get();
        const msg = buildMessageSuggestions(name, startingYear)[messageIndex]
          ?? buildMessageSuggestions(name, startingYear)[0];
        set({ nameIndex: next, universeName: name, startingMessage: msg });
      },

      setStartingYear: (year) => {
        const clamped = Math.min(2100, Math.max(1950, year));
        const { nameIndex, messageIndex } = get();
        const name = buildNameSuggestions(clamped)[nameIndex] ?? buildNameSuggestions(clamped)[0];
        const msg = buildMessageSuggestions(name, clamped)[messageIndex]
          ?? buildMessageSuggestions(name, clamped)[0];
        set({ startingYear: clamped, universeName: name, startingMessage: msg });
      },

      nudgeYear: (delta) => get().setStartingYear(get().startingYear + delta),

      setStartingMessage: (msg) => set({ startingMessage: msg }),

      cycleMessageSuggestion: (direction = 'next') => {
        const { messageIndex, universeName, startingYear } = get();
        const suggestions = buildMessageSuggestions(universeName, startingYear);
        const next = direction === 'next'
          ? (messageIndex + 1) % suggestions.length
          : (messageIndex - 1 + suggestions.length) % suggestions.length;
        set({ messageIndex: next, startingMessage: suggestions[next] });
      },

      // ── Conference Count ─────────────────────────────────────────────────────
      setConferenceCount: (count) => set({ conferenceCount: count, conferences: [] }),

      // ── Conference drafts ────────────────────────────────────────────────────
      upsertConference: (index, patch) => {
        const { conferences } = get();
        const next = [...conferences];
        while (next.length <= index) {
          next.push({
            id: `conf-${next.length}`,
            name: '',
            ccgCity: null as unknown as City,
            layout: '2x6',
            divisionNameSetIndex: 0,
            divisions: [],
          });
        }
        next[index] = { ...next[index], ...patch };
        set({ conferences: next });
      },

      setConferenceLayout: (index, layout) => {
        const { conferences } = get();
        const conf = conferences[index];
        if (!conf) return;
        const n = numDivisions(layout);
        const tpd = teamsPerDivision(layout);
        const divisions = Array.from({ length: n }, (_, i) => ({
          name: conf.divisions[i]?.name ?? '',
          // Pre-fill slots with null so slot positions are stable
          teams: Array<null>(tpd).fill(null),
        }));
        get().upsertConference(index, { layout, divisions, divisionNameSetIndex: 0 });
      },

      cycleConferenceDivisionNameSet: (index, direction = 'next') => {
        const { conferences } = get();
        const conf = conferences[index];
        if (!conf) return;
        const current = conf.divisionNameSetIndex ?? 0;
        const next = direction === 'next' ? current + 1 : Math.max(0, current - 1);
        get().upsertConference(index, { divisionNameSetIndex: next });
      },

      // ── Team pool ─────────────────────────────────────────────────────────────
      setAllTeams: (teams) => set({ allTeams: teams }),

      assignTeam: (team, confIndex, divIndex, slotIndex) => {
        const { conferences, getTotalDraftedCount, getDraftedTeamAbbrs } = get();

        // Guard: cap check
        if (getTotalDraftedCount() >= MAX_DRAFTED_TEAMS) return;

        // Guard: team already drafted
        if (getDraftedTeamAbbrs().has(team.abbreviation)) return;

        const conf = conferences[confIndex];
        if (!conf) return;

        const division = conf.divisions[divIndex];
        if (!division) return;

        const tpd = teamsPerDivision(conf.layout);

        // Ensure slot array is properly sized
        const currentTeams: (Team | null)[] = Array.from(
          { length: tpd },
          (_, i) => division.teams[i] ?? null,
        );

        // Guard: slot already filled
        if (currentTeams[slotIndex] != null) return;

        currentTeams[slotIndex] = team;

        const newDivisions = [...conf.divisions];
        newDivisions[divIndex] = { ...division, teams: currentTeams };

        const nextConferences = [...conferences];
        nextConferences[confIndex] = { ...conf, divisions: newDivisions };

        set({
          conferences: nextConferences,
          lastAssignment: { confIndex, divIndex, slotIndex, team },
        });
      },

      removeTeamFromSlot: (confIndex, divIndex, slotIndex) => {
        const { conferences, lastAssignment } = get();
        const conf = conferences[confIndex];
        if (!conf) return;

        const division = conf.divisions[divIndex];
        if (!division) return;

        const tpd = teamsPerDivision(conf.layout);
        const currentTeams: (Team | null)[] = Array.from(
          { length: tpd },
          (_, i) => division.teams[i] ?? null,
        );

        currentTeams[slotIndex] = null;

        const newDivisions = [...conf.divisions];
        newDivisions[divIndex] = { ...division, teams: currentTeams };

        const nextConferences = [...conferences];
        nextConferences[confIndex] = { ...conf, divisions: newDivisions };

        // Clear lastAssignment if it matches
        const newLast =
          lastAssignment?.confIndex === confIndex &&
          lastAssignment?.divIndex === divIndex &&
          lastAssignment?.slotIndex === slotIndex
            ? null
            : lastAssignment;

        set({ conferences: nextConferences, lastAssignment: newLast });
      },

      undoLastAssignment: () => {
        const { lastAssignment } = get();
        if (!lastAssignment) return;
        const { confIndex, divIndex, slotIndex } = lastAssignment;
        get().removeTeamFromSlot(confIndex, divIndex, slotIndex);
        set({ lastAssignment: null });
      },

      // ── Prestige overrides ───────────────────────────────────────────────────
      setPrestigeOverride: (confId, level) => {
        const { prestigeOverrides } = get();
        set({ prestigeOverrides: { ...prestigeOverrides, [confId]: level } });
      },

      clearPrestigeOverride: (confId) => {
        const { prestigeOverrides } = get();
        const next = { ...prestigeOverrides };
        delete next[confId];
        set({ prestigeOverrides: next });
      },

      // ── Reset ─────────────────────────────────────────────────────────────────
      resetDraft: () => set(initialState),
    }),
    {
      name: 'fccd-universe-draft',
      // Exclude transient/re-fetchable state from localStorage persistence
      partialize: (state) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { allTeams, lastAssignment, getDraftedTeamAbbrs, getTotalDraftedCount, ...persisted } = state;
        return persisted;
      },
    }
  ),
);
