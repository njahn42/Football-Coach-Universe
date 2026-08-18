import JSZip from 'jszip';
import type {
  ConferenceDraft,
  ConferencePrestigeInfo,
  OOCRivalry,
  BowlSelection,
  UniverseExport,
  ExportedConference,
  ExportedDivision,
  ExportedTeam,
  ExportedBowlGame,
} from '@/types';

// ─── Filename normalization for logo paths ─────────────────────────────────────

export function normalizeLogoName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[''`]/g, '')           // apostrophes / smart quotes
    .replace(/&/g, 'and')             // ampersands
    .replace(/[^a-z0-9 _-]/g, '')    // any remaining special chars
    .replace(/\s+/g, '_')             // spaces → underscores
    .replace(/_+/g, '_')             // collapse runs of underscores
    .replace(/^_|_$/g, '');           // strip leading/trailing underscores
}

export function logoPath(type: 'teams' | 'conferences' | 'bowls', name: string): string {
  return `/images/${type}/${normalizeLogoName(name)}.png`;
}

// ─── Universe filename ─────────────────────────────────────────────────────────

export function buildExportFilename(universeName: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const safe = universeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return `${safe}_${today}`;
}

// ─── Archetype mapping ────────────────────────────────────────────────────────
// teams.json stores football-strategy archetypes; the game validates against
// school-identity archetypes. Map each source value to the closest game value.
const ARCHETYPE_MAP: Record<string, string> = {
  balance:     'balanced',
  tradition:   'tradition-rich',
  rivalry:     'tradition-rich',
  academic:    'academic-powerhouse',
  athletes:    'the-main-attraction',
  recruiting:  'the-main-attraction',
  speed:       'future-forward',
  passing:     'media-mogul',
  line:        'football-focused',
  defense:     'football-focused',
  development: 'football-focused',
};

function mapArchetype(raw: string): string {
  return ARCHETYPE_MAP[raw] ?? 'balanced';
}

// fanbaseType mapping: source values → game-expected values
const FANBASE_TYPE_MAP: Record<string, string> = {
  casual:    'reasonable',
  passionate: 'ride-or-die',
  loyal:     'stubborn',
  'fair-weather': 'volatile',
};

function mapFanbaseType(raw: string): string {
  return FANBASE_TYPE_MAP[raw] ?? 'reasonable';
}

// ─── JSON assembly ────────────────────────────────────────────────────────────

export function generateUniverseExport(
  universeName: string,
  startingYear: number,
  startingMessage: string,
  conferences: ConferenceDraft[],
  rivalries: Record<string, string>,
  selectedBowls: BowlSelection[],
  oocRivalries: OOCRivalry[],
  prestigeInfos: ConferencePrestigeInfo[],
): UniverseExport {
  const prestigeMap = new Map(prestigeInfos.map(p => [p.confId, p.prestigeLevel]));

  const exportedConferences: ExportedConference[] = conferences.map(conf => {
    const prestige = prestigeMap.get(conf.id) ?? 5;
    const zipcode = conf.ccgCity?.zipcode ?? '';

    const divisions: ExportedDivision[] = conf.divisions.map(div => {
      const teams: ExportedTeam[] = div.teams
        .filter((t): t is NonNullable<typeof t> => t != null)
        .map(team => ({
          ...team,
          archetype: mapArchetype(team.archetype),
          fanbaseType: mapFanbaseType(team.fanbaseType),
          attributes: {
            ...team.attributes,
            attendance: team.attendance,
          },
          rivalAbbreviation: rivalries[team.abbreviation] ?? '',
        }));
      return { name: div.name, teams };
    });

    return {
      name: conf.name,
      prestigeLevel: prestige,
      zipcode,
      divisions,
    };
  });

  const exportedBowls: ExportedBowlGame[] = selectedBowls.map(({ bowl, tieIn }) => {
    const hasTieIn = !!(
      tieIn.slot1Primary ||
      tieIn.slot1Backup ||
      tieIn.slot2Primary ||
      tieIn.slot2Backup
    );
    const base: ExportedBowlGame = {
      name: bowl.name,
      zipcode: bowl.zipcode,
      indoors: bowl.indoors,
    };
    if (hasTieIn) {
      // Strip empty strings from tieIn before including
      const cleanTieIn: Record<string, string> = {};
      if (tieIn.slot1Primary) cleanTieIn.slot1Primary = tieIn.slot1Primary;
      if (tieIn.slot1Backup)  cleanTieIn.slot1Backup  = tieIn.slot1Backup;
      if (tieIn.slot2Primary) cleanTieIn.slot2Primary = tieIn.slot2Primary;
      if (tieIn.slot2Backup)  cleanTieIn.slot2Backup  = tieIn.slot2Backup;
      base.tieIn = cleanTieIn;
    }
    return base;
  });

  const result: UniverseExport = {
    name: universeName,
    startingYear,
    startingMessage,
    conferences: exportedConferences,
    bowlGames: exportedBowls,
  };

  if (oocRivalries.length > 0) {
    result.oocRivalries = oocRivalries;
  }

  return result;
}

// ─── File download helpers ─────────────────────────────────────────────────────

/** Triggers a JSON file download in the browser. */
export function downloadJSON(filename: string, data: UniverseExport): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Builds a ZIP containing the JSON plus any available logo PNGs and triggers download.
 * Missing logos (404) are silently skipped.
 */
export async function downloadZIP(
  filename: string,
  data: UniverseExport,
): Promise<void> {
  const zip = new JSZip();

  // Add the JSON
  zip.file(`${filename}.json`, JSON.stringify(data, null, 2));

  // Collect logo paths to attempt
  const logoPaths: Array<{ zipPath: string; fetchPath: string }> = [];

  // Team logos
  for (const conf of data.conferences) {
    for (const div of conf.divisions) {
      for (const team of div.teams) {
        const name = normalizeLogoName(team.name);
        logoPaths.push({
          fetchPath: `/images/teams/${name}.png`,
          zipPath: `images/teams/${name}.png`,
        });
      }
    }
  }

  // Conference logos
  for (const conf of data.conferences) {
    const name = normalizeLogoName(conf.name);
    logoPaths.push({
      fetchPath: `/images/conferences/${name}.png`,
      zipPath: `images/conferences/${name}.png`,
    });
  }

  // Bowl logos
  for (const bowl of data.bowlGames) {
    const name = normalizeLogoName(bowl.name);
    logoPaths.push({
      fetchPath: `/images/bowls/${name}.png`,
      zipPath: `images/bowls/${name}.png`,
    });
  }

  // De-duplicate
  const seen = new Set<string>();
  const uniquePaths = logoPaths.filter(p => {
    if (seen.has(p.zipPath)) return false;
    seen.add(p.zipPath);
    return true;
  });

  // Fetch all logos in parallel, silently skip 404s
  const fetchResults = await Promise.allSettled(
    uniquePaths.map(async ({ fetchPath, zipPath }) => {
      const res = await fetch(fetchPath);
      if (!res.ok) return null;
      const blob = await res.blob();
      return { zipPath, blob };
    }),
  );

  for (const result of fetchResults) {
    if (result.status === 'fulfilled' && result.value) {
      zip.file(result.value.zipPath, result.value.blob);
    }
  }

  // Generate and download
  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
