import { useUniverseStore } from '@/store';
import type { ScreenId } from '@/types';

import UniverseInfoScreen    from '@/screens/UniverseInfoScreen';
import ConferenceCountScreen from '@/screens/ConferenceCountScreen';
import ConferenceSetupScreen from '@/screens/ConferenceSetupScreen';
import DraftTeamsScreen      from '@/screens/DraftTeamsScreen';
import PrestigeReviewScreen  from '@/screens/PrestigeReviewScreen';
import RivalriesScreen       from '@/screens/RivalriesScreen';

const SCREENS: Record<ScreenId, React.ComponentType> = {
  'universe-info':    UniverseInfoScreen,
  'conference-count': ConferenceCountScreen,
  'conference-setup': ConferenceSetupScreen,
  'draft-teams':      DraftTeamsScreen,
  'prestige-review':  PrestigeReviewScreen,
  'rivalries':        RivalriesScreen,
};

export default function App() {
  const currentScreen = useUniverseStore((s) => s.currentScreen);
  const Screen = SCREENS[currentScreen] ?? UniverseInfoScreen;
  return <Screen />;
}
