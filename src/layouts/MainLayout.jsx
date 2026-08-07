import { NavLink, Outlet } from 'react-router-dom';
import { HiOutlineHome, HiHome } from 'react-icons/hi';
import { HiOutlineArchiveBox, HiArchiveBox } from 'react-icons/hi2';
import { HiOutlineChartBar, HiChartBar } from 'react-icons/hi2';
import { HiOutlineCog6Tooth, HiCog6Tooth } from 'react-icons/hi2';

const NAV_ITEMS = [
  { to: '/billing', label: 'Billing', Icon: HiOutlineHome, ActiveIcon: HiHome },
  { to: '/inventory', label: 'Inventory', Icon: HiOutlineArchiveBox, ActiveIcon: HiArchiveBox },
  { to: '/reports', label: 'Reports', Icon: HiOutlineChartBar, ActiveIcon: HiChartBar },
  { to: '/settings', label: 'Settings', Icon: HiOutlineCog6Tooth, ActiveIcon: HiCog6Tooth }
];

export default function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <main className="flex-1 pb-20" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
        <Outlet />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-100 bg-white/95 backdrop-blur"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <ul className="mx-auto flex max-w-lg items-stretch justify-around">
          {NAV_ITEMS.map(({ to, label, Icon, ActiveIcon }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex min-h-[3rem] flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium transition-transform duration-150 ${
                    isActive ? 'scale-105 text-brand-500' : 'text-gray-400 active:scale-95'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive ? <ActiveIcon className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
