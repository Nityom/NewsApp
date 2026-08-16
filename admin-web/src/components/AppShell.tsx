import { signOut } from 'firebase/auth';
import {
    BarChart3,
    Bell,
    BookOpenText,
    ChevronRight,
    CreditCard,
    LayoutDashboard,
    LogOut,
    Menu,
    Settings,
    Users,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

import { ADMIN_NAME } from '../lib/admin';
import { auth } from '../lib/firebase';
import { AdminActionPopup } from './AdminActionPopup';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/articles', label: 'Articles', icon: BookOpenText },
  { to: '/reporters', label: 'Reporters', icon: Users },
  { to: '/payments', label: 'Payments', icon: CreditCard },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function AppShell() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const active = links.find((link) => link.to === '/' ? location.pathname === '/' : location.pathname.startsWith(link.to));

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="brand-block">
          <img src="/app-logo.png" alt="Education News" />
          <button type="button" className="icon-button sidebar-close" onClick={() => setOpen(false)} aria-label="Close menu"><X /></button>
        </div>
        <nav>
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}>
              <Icon size={19} />
              <span>{label}</span>
              <ChevronRight size={15} className="nav-arrow" />
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-account">
          <div className="admin-avatar">EN</div>
          <div><strong>{ADMIN_NAME}</strong><span>{auth.currentUser?.email}</span></div>
          <button type="button" className="icon-button" onClick={() => void signOut(auth)} aria-label="Sign out"><LogOut size={18} /></button>
        </div>
      </aside>
      {open ? <button type="button" className="sidebar-scrim" onClick={() => setOpen(false)} aria-label="Close menu" /> : null}
      <div className="workspace">
        <header className="topbar">
          <button type="button" className="icon-button menu-button" onClick={() => setOpen(true)} aria-label="Open menu"><Menu /></button>
          <div><span>Admin Console</span><strong>{active?.label ?? 'Management'}</strong></div>
          <NavLink to="/notifications" className="topbar-action" aria-label="Notifications"><Bell size={20} /></NavLink>
        </header>
        <main><Outlet /></main>
      </div>
      <AdminActionPopup />
    </div>
  );
}
