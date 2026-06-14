import { BarChart3, History, Home } from 'lucide-react';
import { useAppStore, type ScreenName } from '../app/app-store';

const tabs: Array<{ screen: ScreenName; label: string; Icon: typeof Home }> = [
  { screen: 'home', label: 'Home', Icon: Home },
  { screen: 'stats', label: 'Stats', Icon: BarChart3 },
  { screen: 'history', label: 'History', Icon: History },
];

export function TabBar() {
  const screen = useAppStore((state) => state.screen);
  const showScreen = useAppStore((state) => state.showScreen);

  if (screen === 'live' || screen === 'detail') return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-neutral-800 bg-neutral-900 pb-[max(env(safe-area-inset-bottom),16px)] pt-2">
      {tabs.map(({ screen: tabScreen, label, Icon }) => (
        <button
          key={tabScreen}
          type="button"
          className={`flex flex-1 flex-col items-center gap-1 text-[10px] font-medium ${screen === tabScreen ? 'text-white' : 'text-neutral-600'}`}
          onClick={() => showScreen(tabScreen)}
        >
          <Icon size={24} />
          {label}
        </button>
      ))}
    </nav>
  );
}
