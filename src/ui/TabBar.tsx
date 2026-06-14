import { BarChart3, History, Home } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { useAppStore, type ScreenName } from '../app/app-store';
import { useT } from '../i18n';

export function TabBar() {
  const t = useT();
  const screen = useAppStore((state) => state.screen);
  const navigate = useNavigate();

  const tabs: Array<{ screen: ScreenName; label: string; Icon: typeof Home; path: string }> = [
    { screen: 'home', label: t.nav.home, Icon: Home, path: '/' },
    { screen: 'stats', label: t.nav.stats, Icon: BarChart3, path: '/stats' },
    { screen: 'history', label: t.nav.history, Icon: History, path: '/history' },
  ];

  if (screen === 'live' || screen === 'detail') return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-neutral-800 bg-neutral-900 pb-[max(env(safe-area-inset-bottom),16px)] pt-2">
      {tabs.map(({ screen: tabScreen, label, Icon, path }) => (
        <button
          key={tabScreen}
          type="button"
          className={`flex flex-1 flex-col items-center gap-1 text-[10px] font-medium ${screen === tabScreen ? 'text-white' : 'text-neutral-600'}`}
          onClick={() => void navigate({ to: path })}
        >
          <Icon size={24} />
          {label}
        </button>
      ))}
    </nav>
  );
}
