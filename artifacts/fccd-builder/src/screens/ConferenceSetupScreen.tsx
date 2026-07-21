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
      if (confIndex === 0) {
        store.setScreen('conference-count');
      }
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

  const handleNext = () => {
    if (confIndex < (store.conferenceCount || 6) - 1) {
      store.setConferenceSetupIndex(confIndex + 1);
      setFocusedIndex(0);
    } else {
      store.setScreen('draft-teams');
    }
  };

  const currentDivSet = availableDivisionSets.length > 0 
    ? availableDivisionSets[conference.divisionNameSetIndex % availableDivisionSets.length] 
    : [];

  return (
    <div className="min-h-screen flex flex-col p-8 max-w-5xl mx-auto pt-12 animate-in fade-in slide-in-from-right-8 duration-500">
      {/* Breadcrumb / Progress */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 rounded-full bg-primary animate-pulse shadow-[0_0_12px_rgba(250,204,21,0.8)]"></div>
          <div className="text-lg font-black text-foreground tracking-widest uppercase">
            Conference <span className="text-primary">{confIndex + 1}</span> <span className="opacity-50 mx-1">of</span> {store.conferenceCount}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-8 relative">
        {/* Name */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-bold text-primary uppercase tracking-widest">Conference Name</label>
          <div className="flex items-center gap-4">
            <input
              ref={el => { refs.current[0] = el; }}
              onFocus={() => setFocusedIndex(0)}
              value={conference.name}
              onChange={e => store.upsertConference(confIndex, { name: e.target.value })}
              className="flex-1 bg-card border-2 border-border rounded-xl p-5 text-4xl font-black outline-none transition-all focus:border-primary focus:bg-card/50"
            />
            <div className="flex flex-col gap-2 min-w-[140px] items-center">
              <div className="flex gap-3">
                <ControllerBadge action="LB" />
                <ControllerBadge action="RB" />
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${focusedIndex === 0 ? 'text-primary' : 'text-muted-foreground'}`}>Cycle Name</span>
            </div>
          </div>
        </div>

        {/* Layout */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-bold text-primary uppercase tracking-widest">Division Layout</label>
          <div className="flex items-center gap-4">
            <div className="flex-1 flex flex-col">
              <div 
                ref={el => { refs.current[1] = el; }}
                tabIndex={0}
                onFocus={() => setFocusedIndex(1)}
                className="flex p-2 bg-card border-2 border-border rounded-xl outline-none transition-all focus:border-primary focus:bg-card/50"
              >
                {LAYOUTS.map(layout => (
                  <div 
                    key={layout}
                    onClick={() => store.setConferenceLayout(confIndex, layout)}
                    className={`flex-1 text-center py-4 rounded-lg font-black text-xl cursor-pointer transition-all ${conference.layout === layout ? 'bg-primary text-primary-foreground shadow-[0_0_20px_rgba(250,204,21,0.2)]' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                  >
                    {LAYOUT_LABELS[layout]}
                  </div>
                ))}
              </div>
              
              {/* Layout Stats Info Bar */}
              <div className="flex justify-between items-center px-6 py-3 mt-3 bg-black/40 rounded-lg text-sm font-bold uppercase tracking-widest text-muted-foreground">
                <span>Total Teams: <strong className="text-foreground text-lg ml-2">{totalTeams(conference.layout)}</strong></span>
                <span>Divisions: <strong className="text-foreground text-lg ml-2">{numDivs}</strong></span>
                <span>Teams Per Div: <strong className="text-foreground text-lg ml-2">{teamsPerDivision(conference.layout)}</strong></span>
              </div>
            </div>
            
            <div className="flex flex-col gap-2 min-w-[140px] items-center">
              <div className="flex gap-3">
                <ControllerBadge action="dpadLeft" />
                <ControllerBadge action="dpadRight" />
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${focusedIndex === 1 ? 'text-primary' : 'text-muted-foreground'}`}>Change Layout</span>
            </div>
          </div>
        </div>

        {/* Division Names */}
        {numDivs > 1 && (
          <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
            <label className="text-sm font-bold text-primary uppercase tracking-widest">Division Names</label>
            <div className="flex items-center gap-4">
              <button
                ref={el => { refs.current[2] = el; }}
                onFocus={() => setFocusedIndex(2)}
                className="flex-1 bg-card border-2 border-border rounded-xl p-4 outline-none transition-all focus:border-primary focus:bg-card/50 flex gap-4 text-left"
              >
                {currentDivSet.map((name, i) => (
                  <div key={i} className="flex-1 bg-black/40 p-4 rounded-lg border border-white/5 text-center text-xl font-bold text-foreground">
                    {name}
                  </div>
                ))}
              </button>
              <div className="flex flex-col gap-2 min-w-[140px] items-center">
                <div className="flex gap-3">
                  <ControllerBadge action="LB" />
                  <ControllerBadge action="RB" />
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${focusedIndex === 2 ? 'text-primary' : 'text-muted-foreground'}`}>Cycle Set</span>
              </div>
            </div>
          </div>
        )}

        {/* CCG City */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-bold text-primary uppercase tracking-widest">Championship Host City</label>
          <div className="flex items-center gap-4">
            <button
              ref={el => { refs.current[3] = el; }}
              onFocus={() => setFocusedIndex(3)}
              onClick={() => setIsCityPickerOpen(true)}
              className="flex-1 bg-card border-2 border-border rounded-xl p-6 outline-none transition-all focus:border-primary focus:bg-card/50 flex items-center justify-between text-left group"
            >
              {conference.ccgCity ? (
                <div>
                  <div className="text-2xl font-black text-foreground group-focus:text-primary transition-colors">{conference.ccgCity.cityName}</div>
                  <div className="text-base text-muted-foreground font-medium flex items-center gap-3 mt-2">
                    <span>{conference.ccgCity.stadium}</span>
                    {conference.ccgCity.indoors && <span className="bg-primary/20 text-primary text-[10px] uppercase px-2 py-1 rounded font-black tracking-widest">Dome</span>}
                  </div>
                </div>
              ) : (
                <div className="text-2xl font-black text-muted-foreground opacity-50">Select a host city...</div>
              )}
              <ControllerBadge action="A" label="Browse" active={focusedIndex === 3} />
            </button>
          </div>
        </div>

      </div>

      {/* Bottom Bar */}
      <div className="mt-8 flex justify-between items-center border-t-2 border-border pt-8">
        <div className="flex items-center gap-4 text-muted-foreground font-medium">
          {confIndex === 0 && <ControllerBadge action="B" label="Back" active={true} />}
        </div>
        <button
          ref={el => { refs.current[4] = el; }}
          onFocus={() => setFocusedIndex(4)}
          onClick={handleNext}
          className="flex items-center gap-4 bg-primary text-primary-foreground px-10 py-5 rounded-xl font-black text-xl transition-all hover:scale-105 active:scale-95 outline-none"
        >
          <span>{confIndex < (store.conferenceCount || 6) - 1 ? 'Next Conference' : 'Finish Setup'}</span>
          <ControllerBadge action="A" active={focusedIndex === 4} />
        </button>
      </div>

      {/* City Picker Modal overlay */}
      {isCityPickerOpen && (
        <div className="absolute inset-0 bg-background/95 backdrop-blur-xl z-50 flex flex-col p-12 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-6 mb-8">
            <ControllerBadge action="B" label="Cancel" active={true} />
            <h2 className="text-4xl font-black text-foreground tracking-tight">Select Host City</h2>
          </div>
          
          <input 
            ref={cityInputRef}
            type="text" 
            placeholder="Search cities or stadiums..."
            value={citySearch}
            onChange={e => setCitySearch(e.target.value)}
            className="w-full bg-card border-2 border-primary rounded-xl p-6 text-2xl font-bold outline-none ring-4 ring-primary/20 mb-8 shadow-[0_0_30px_rgba(250,204,21,0.15)]"
          />

          <div className="flex-1 overflow-hidden relative rounded-xl border-2 border-border bg-card/80 flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredCities.map((city, idx) => (
                <div 
                  id={`city-item-${idx}`}
                  key={`${city.cityName}-${city.stadium}`}
                  className={`p-5 rounded-xl flex items-center justify-between transition-colors cursor-pointer border-2 ${highlightedCityIndex === idx ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_20px_rgba(250,204,21,0.2)]' : 'hover:bg-muted/50 text-foreground border-transparent'}`}
                  onMouseEnter={() => setHighlightedCityIndex(idx)}
                  onClick={() => {
                    store.upsertConference(confIndex, { ccgCity: city });
                    setIsCityPickerOpen(false);
                    setFocusedIndex(4);
                  }}
                >
                  <div>
                    <div className="font-black text-2xl">{city.cityName}</div>
                    <div className={`text-base font-medium mt-1 ${highlightedCityIndex === idx ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{city.stadium}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    {city.indoors && (
                      <div className={`text-[10px] uppercase px-3 py-1.5 rounded font-black tracking-widest ${highlightedCityIndex === idx ? 'bg-black/20' : 'bg-primary/20 text-primary'}`}>
                        Dome
                      </div>
                    )}
                    {highlightedCityIndex === idx && (
                      <ControllerBadge action="A" active={true} />
                    )}
                  </div>
                </div>
              ))}
              {filteredCities.length === 0 && (
                <div className="p-16 text-center text-muted-foreground text-2xl font-bold">No cities found.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
