import { signOut } from 'firebase/auth';
import {
  BarChart3,
  Bell,
  BookOpen,
  BookOpenText,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Newspaper,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Users,
  Video
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

import { ADMIN_NAME } from '../lib/admin';
import { auth } from '../lib/firebase';
import { AdminActionPopup } from './AdminActionPopup';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/articles', label: 'Articles', icon: BookOpenText },
  { to: '/publications', label: 'Other Publications', icon: Newspaper },
  { to: '/monthly-booklets', label: 'Monthly Booklets', icon: BookOpen },
  { to: '/video-studio', label: 'Video Studio', icon: Video },
  { to: '/reporters', label: 'Reporters', icon: Users },
  { to: '/payments', label: 'Payments', icon: CreditCard },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function AppShell() {
  const [open, setOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('admin_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('admin_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const location = useLocation();
  const active = links.find((link) => link.to === '/' ? location.pathname === '/' : location.pathname.startsWith(link.to));

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'sidebar-open' : ''} ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className={`brand-block flex ${isCollapsed ? 'flex-col gap-2 items-center justify-center' : 'items-center justify-between'}`}>
          <img
            src="/app-logo.png"
            alt="Education News"
            className={isCollapsed ? 'cursor-pointer hover:opacity-85' : ''}
            onClick={isCollapsed ? toggleCollapse : undefined}
            title={isCollapsed ? 'Expand Sidebar' : undefined}
          />
          <button
            type="button"
            className={`icon-button text-stone-400 hover:text-white cursor-pointer hidden md:grid ${isCollapsed ? 'mt-1' : 'ml-auto'}`}
            onClick={toggleCollapse}
            title={isCollapsed ? 'Expand Navigation Sidebar' : 'Minimize Navigation Sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Minimize sidebar'}
          >
            {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>
        <nav>
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setOpen(false)}
              title={isCollapsed ? label : undefined}
            >
              <Icon size={19} />
              <span>{label}</span>
              <ChevronRight size={15} className="nav-arrow" />
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-account">
          <div className="admin-avatar">EN</div>
          <div><strong>{ADMIN_NAME}</strong><span>{auth.currentUser?.email}</span></div>
          <button type="button" className="icon-button" onClick={() => void signOut(auth)} aria-label="Sign out" title="Sign Out"><LogOut size={18} /></button>
        </div>
      </aside>
      {open ? <button type="button" className="sidebar-scrim" onClick={() => setOpen(false)} aria-label="Close menu" /> : null}
      <div className={`workspace ${isCollapsed ? 'workspace-expanded' : ''}`}>
        <header className="topbar">
          {/* Mobile hamburger menu toggle */}
          <button
            type="button"
            className="icon-button menu-button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu />
          </button>

          <div><span>Admin Console</span><strong>{active?.label ?? 'Management'}</strong></div>
          <NavLink to="/notifications" className="topbar-action" aria-label="Notifications"><Bell size={20} /></NavLink>
        </header>
        <main><Outlet /></main>
      </div>
      <AdminActionPopup />
    </div>
  );
}
