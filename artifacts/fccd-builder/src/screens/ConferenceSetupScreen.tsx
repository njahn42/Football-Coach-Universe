import { useEffect, useRef, useState } from 'react';
import { useUniverseStore } from '@/store';
import { useGamepad } from '@/hooks/useGamepad';
import { ControllerBadge } from '@/components/ControllerBadge';
import type { DivisionLayout, City } from '@/types';
import { LAYOUT_LABELS, numDivisions, totalTeams, teamsPerDivision } from '@/types';

const LAYOUTS: DivisionLayout[] = ['1x10', '2x6', '2x7', '2x9', '4x4', '4x5'];

export default function ConferenceSetupScreen() {
  const store = useUniverseStore();
  const confIndex = store.conferenceSetupIndex;
  const conference = store.conferences[confIndex];
  
  const [conferenceNames, setConferenceNames] = useState<string[]>([]);
  const [divisionNames, setDivisionNames] = useState<{ paired: string[][], quad: string[][] }>({ paired: [], quad: [] });
  const [cities, setCities] = useState<City[]>([]);
  
  const [focusedIndex, setFocusedIndex] = useState(0); 
  // 0: Name, 1: Layout, 2: Div Names, 3: City, 4: Next/Done
  const [isCityPickerOpen, setIsCityPickerOpen] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [highlightedCityIndex, setHighlightedCityIndex] = useState(0);

  const refs = useRef<(HTMLElement | null)[]>([]);
  const cityInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    fetch('/data/conference_names.json').then(r => r.json()).then(setConferenceNames);
    fetch('/data/division_names.json').then(r => r.json()).then(setDivisionNames);
    fetch('/data/cities.json').then(r => r.json()).then(setCities);
  }, []);

  // Sync focus
  useEffect(() => {
    if (isCityPickerOpen) {
      cityInputRef.current?.focus();
    } else {
      refs.current[focusedIndex]?.focus();
    }
  }, [focusedIndex, isCityPickerOpen]);

  // Derived state for Division sets
  const numDivs = conference ? numDivisions(conference.layout) : 1;
  const availableDivisionSets = numDivs === 2 ? divisionNames.paired : (numDivs === 4 ? divisionNames.quad : []);
  
  const filteredCities = cities.filter(c => 
    c.cityName.toLowerCase().includes(citySearch.toLowerCase()) || 
    c.stadium.toLowerCase().includes(citySearch.toLowerCase())
  );

  useGamepad((action) => {
    if (isCityPickerOpen) {
      if (action === 'dpadDown') {
        setHighlightedCityIndex(i => Math.min(filteredCities.length - 1, i + 1));
      } else if (action === 'dpadUp') {
        setHighlightedCityIndex(i => Math.max(0, i - 1));
      } else if (action === 'A') {
        const selected = filteredCities[highlightedCityIndex];
        if (selected) {
          store.upsertConference(confIndex, { ccgCity: selected });
          setIsCityPickerOpen(false);
          setFocusedIndex(4); // Move to Next
        }
      } else if (action === 'B') {
        setIsCityPickerOpen(false);
        setFocusedIndex(3);
      }
      return;
    }

    if (action === 'dpadDown') {
      setFocusedIndex(i => {
        let next = i + 1;
        if (next === 2 && numDivs === 1) next = 3; // skip div names if 1x10
        return Math.min(4, next);
      });
    } else if (action === 'dpadUp') {
      setFocusedIndex(i => {
        let prev = i - 1;
        if (prev === 2 && numDivs === 1) prev = 1;
        return Math.max(0, prev);
      });
    } else if (action === 'dpadRight' && focusedIndex === 1) {
      if (conference) {
        const curr = LAYOUTS.indexOf(conference.layout);
        const next = LAYOUTS[Math.min(LAYOUTS.length - 1, curr + 1)];
        store.setConferenceLayout(confIndex, next);
      }
    } else if (action === 'dpadLeft' && focusedIndex === 1) {
      if (conference) {
        const curr = LAYOUTS.indexOf(conference.layout);
        const prev = LAYOUTS[Math.max(0, curr - 1)];
        store.setConferenceLayout(confIndex, prev);
      }
    } else if (action === 'RB') {
      if (focusedIndex === 0) {
        const curr = conferenceNames.indexOf(conference.name);
        const next = conferenceNames[(curr + 1) % conferenceNames.length] || conferenceNames[0];
        store.upsertConference(confIndex, { name: next });
      } else if (focusedIndex === 2 && numDivs > 1) {
        store.cycleConferenceDivisionNameSet(confIndex, 'next');
      }
    } else if (action === 'LB') {
      if (focusedIndex === 0) {
        const curr = conferenceNames.indexOf(conference.name);
        const prev = conferenceNames[(curr - 1 + conferenceNames.length) % conferenceNames.length] || conferenceNames[0];
        store.upsertConference(confIndex, { name: prev });
      } else if (focusedIndex === 2 && numDivs > 1) {
        store.cycleConferenceDivisionNameSet(confIndex, 'prev');
      }
    } else if (action === 'A') {
      if (focusedIndex === 3) {
        setIsCityPickerOpen(true);
      } else if (focusedIndex === 4) {
        handleNext();
      }
    } else if (action === 'B') {
      handleBack();
    }
  });

  // Re-sync highlighted city when search changes
  useEffect(() => {
    setHighlightedCityIndex(0);
  }, [citySearch]);

  // Scroll active city into view
  useEffect(() => {
    if (isCityPickerOpen) {
      const el = document.getElementById(`city-item-${highlightedCityIndex}`);
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedCityIndex, isCityPickerOpen]);

  // Initialize conference draft if it doesn't exist yet (e.g. just entered from ConferenceCountScreen)
  useEffect(() => {
    if (!conference) {
      store.upsertConference(confIndex, {
        id: `conf-${confIndex}`,
        name: '',
        ccgCity: null as unknown as import('@/types').City,
        layout: '2x6',
        divisionNameSetIndex: 0,
        divisions: [{ name: '', teams: [] }, { name: '', teams: [] }],
      });
    }
  }, [conference, confIndex, store]);

  // Load a default name if empty
  useEffect(() => {
    if (conference && !conference.name && conferenceNames.length > 0) {
      store.upsertConference(confIndex, { name: conferenceNames[0] });
    }
  }, [conference, conferenceNames, confIndex, store]);

  if (!conference) return null;

  // Unique-name check: another conference (different index) with the same non-empty name
  const isDuplicateName =
    conference.name.trim().length > 0 &&
    store.conferences.some(
      (c, i) => i !== confIndex && c.name.trim().toLowerCase() === conference.name.trim().toLowerCase()
    );

  const handleNext = () => {
    if (isDuplicateName) return;
    if (confIndex < (store.conferenceCount || 6) - 1) {
      store.setConferenceSetupIndex(confIndex + 1);
      setFocusedIndex(0);
    } else {
      store.setScreen('draft-teams');
    }
  };

  const handleBack = () => {
    if (confIndex > 0) {
      store.setConferenceSetupIndex(confIndex - 1);
      setFocusedIndex(0);
    } else {
      store.setScreen('conference-count');
    }
  };

  const currentDivSet = availableDivisionSets.length > 0 
    ? availableDivisionSets[conference.divisionNameSetIndex % availableDivisionSets.length] 
    : [];

  return (
    <div className="min-h-screen flex flex-col px-8 py-10 max-w-5xl mx-auto">
      {/* Breadcrumb / Progress */}
      <div className="mb-8 pb-5 border-b border-border">
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1.5">Step 3 of 3</p>
        <h1 className="text-2xl font-bold text-foreground">
          Conference {confIndex + 1}
          <span className="text-muted-foreground font-normal text-lg ml-2">of {store.conferenceCount}</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Configure name, division structure, and championship city.</p>
      </div>

      <div className="flex-1 flex flex-col gap-6 relative">
        {/* Name */}
        <div className="flex flex-col gap-3">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Conference Name</label>
          <div className="flex items-center gap-4">
            <div className="flex-1 flex flex-col gap-1">
              <input
                ref={el => { refs.current[0] = el; }}
                onFocus={() => setFocusedIndex(0)}
                value={conference.name}
                onChange={e => store.upsertConference(confIndex, { name: e.target.value })}
                className={`w-full bg-card border rounded-lg px-4 py-3 text-xl font-bold text-foreground outline-none transition-colors ${isDuplicateName ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-ring'}`}
              />
              {isDuplicateName && (
                <p className="text-xs text-red-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  Another conference already uses this name — each conference must be unique.
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2 min-w-[110px] items-center shrink-0">
              <div className="flex gap-2">
                <ControllerBadge action="LB" active={focusedIndex === 0} />
                <ControllerBadge action="RB" active={focusedIndex === 0} />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Cycle Name</span>
            </div>
          </div>
        </div>

        {/* Layout */}
        <div className="flex flex-col gap-3">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Division Layout</label>
          <div className="flex items-center gap-4">
            <div className="flex-1 flex flex-col">
              <div
                ref={el => { refs.current[1] = el; }}
                tabIndex={0}
                onFocus={() => setFocusedIndex(1)}
                className="flex p-1 bg-card border border-border rounded-lg outline-none transition-colors focus:border-ring"
              >
                {LAYOUTS.map(layout => (
                  <div
                    key={layout}
                    onClick={() => store.setConferenceLayout(confIndex, layout)}
                    className={`flex-1 text-center py-2.5 rounded-md font-bold text-sm cursor-pointer transition-all ${conference.layout === layout ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                  >
                    {LAYOUT_LABELS[layout]}
                  </div>
                ))}
              </div>

              {/* Layout Stats */}
              <div className="flex gap-6 items-center px-4 py-2 mt-2 bg-muted/30 rounded-lg text-xs font-mono text-muted-foreground">
                <span>Total <strong className="text-foreground ml-1">{totalTeams(conference.layout)}</strong></span>
                <span>Divisions <strong className="text-foreground ml-1">{numDivs}</strong></span>
                <span>Per Division <strong className="text-foreground ml-1">{teamsPerDivision(conference.layout)}</strong></span>
              </div>
            </div>

            <div className="flex flex-col gap-2 min-w-[110px] items-center">
              <div className="flex gap-2">
                <ControllerBadge action="dpadLeft" active={focusedIndex === 1} />
                <ControllerBadge action="dpadRight" active={focusedIndex === 1} />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Layout</span>
            </div>
          </div>
        </div>

        {/* Division Names */}
        {numDivs > 1 && (
          <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Division Names</label>
            <div className="flex items-center gap-4">
              <button
                ref={el => { refs.current[2] = el; }}
                onFocus={() => setFocusedIndex(2)}
                className="flex-1 bg-card border border-border rounded-lg px-4 py-3 outline-none transition-colors focus:border-ring flex gap-3 text-left"
              >
                {currentDivSet.map((name, i) => (
                  <div key={i} className="flex-1 bg-muted/40 py-2.5 px-3 rounded-md border border-border/50 text-center text-sm font-semibold text-foreground">
                    {name}
                  </div>
                ))}
              </button>
              <div className="flex flex-col gap-2 min-w-[110px] items-center">
                <div className="flex gap-2">
                  <ControllerBadge action="LB" active={focusedIndex === 2} />
                  <ControllerBadge action="RB" active={focusedIndex === 2} />
                </div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Cycle Set</span>
              </div>
            </div>
          </div>
        )}

        {/* CCG City */}
        <div className="flex flex-col gap-3">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Championship Host City</label>
          <div className="flex items-center gap-4">
            <button
              ref={el => { refs.current[3] = el; }}
              onFocus={() => setFocusedIndex(3)}
              onClick={() => setIsCityPickerOpen(true)}
              className="flex-1 bg-card border border-border rounded-lg px-4 py-3 outline-none transition-colors focus:border-ring flex items-center justify-between text-left"
            >
              {conference.ccgCity ? (
                <div>
                  <div className="text-base font-semibold text-foreground">{conference.ccgCity.cityName}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2 mt-0.5">
                    <span>{conference.ccgCity.stadium}</span>
                    {conference.ccgCity.indoors && <span className="bg-primary/20 text-primary text-[10px] uppercase px-1.5 py-0.5 rounded font-bold tracking-wider">Dome</span>}
                  </div>
                </div>
              ) : (
                <span className="text-muted-foreground/50 text-sm">Select a host city…</span>
              )}
              <ControllerBadge action="A" label="Browse" active={focusedIndex === 3} />
            </button>
          </div>
        </div>

      </div>

      {/* Bottom Bar */}
      <div className="mt-8 flex justify-between items-center border-t border-border pt-5">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors outline-none"
        >
          <ControllerBadge action="B" active />
          <span className="text-xs font-medium uppercase tracking-wider">
            {confIndex > 0 ? 'Prev Conference' : 'Back'}
          </span>
        </button>
        <button
          ref={el => { refs.current[4] = el; }}
          onFocus={() => setFocusedIndex(4)}
          onClick={handleNext}
          disabled={isDuplicateName}
          className={`flex items-center gap-3 px-6 py-2.5 rounded-lg font-bold text-sm transition-all outline-none ${isDuplicateName ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-60' : 'bg-primary text-primary-foreground hover:brightness-110 active:brightness-90'}`}
        >
          <span>{confIndex < (store.conferenceCount || 6) - 1 ? 'Next Conference' : 'Finish Setup'}</span>
          <ControllerBadge action="A" active={focusedIndex === 4 && !isDuplicateName} />
        </button>
      </div>

      {/* City Picker Modal overlay */}
      {isCityPickerOpen && (
        <div className="absolute inset-0 bg-background/97 backdrop-blur-sm z-50 flex flex-col p-8">
          <div className="flex items-center gap-4 mb-6 pb-5 border-b border-border">
            <ControllerBadge action="B" label="Cancel" active />
            <h2 className="text-xl font-bold text-foreground">Select Host City</h2>
          </div>

          <input
            ref={cityInputRef}
            type="text"
            placeholder="Search cities or stadiums…"
            value={citySearch}
            onChange={e => setCitySearch(e.target.value)}
            className="w-full bg-card border border-border rounded-lg px-4 py-3 text-base font-medium text-foreground outline-none focus:border-ring transition-colors mb-4"
          />

          <div className="flex-1 overflow-hidden rounded-lg border border-border bg-card/60 flex flex-col">
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredCities.map((city, idx) => (
                <div
                  id={`city-item-${idx}`}
                  key={`${city.cityName}-${city.stadium}`}
                  className={`px-4 py-3 rounded-lg flex items-center justify-between cursor-pointer border transition-colors ${highlightedCityIndex === idx ? 'bg-ring/15 border-ring/50 text-foreground' : 'hover:bg-muted/40 text-foreground border-transparent'}`}
                  onMouseEnter={() => setHighlightedCityIndex(idx)}
                  onClick={() => {
                    store.upsertConference(confIndex, { ccgCity: city });
                    setIsCityPickerOpen(false);
                    setFocusedIndex(4);
                  }}
                >
                  <div>
                    <div className="font-semibold text-base">{city.cityName}</div>
                    <div className={`text-sm mt-0.5 ${highlightedCityIndex === idx ? 'text-muted-foreground' : 'text-muted-foreground'}`}>{city.stadium}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    {city.indoors && (
                      <span className="text-[10px] uppercase px-2 py-1 rounded bg-primary/15 text-primary font-bold tracking-wider">
                        Dome
                      </span>
                    )}
                    {highlightedCityIndex === idx && <ControllerBadge action="A" active />}
                  </div>
                </div>
              ))}
              {filteredCities.length === 0 && (
                <div className="py-12 text-center text-muted-foreground text-sm">No cities found.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
