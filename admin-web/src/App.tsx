import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import './App.css';
import { AppShell } from './components/AppShell';
import { ADMIN_EMAIL, auth } from './lib/firebase';
import { LoginPage } from './pages/LoginPage';

const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const ArticlesPage = lazy(() => import('./pages/ArticlesPage').then((module) => ({ default: module.ArticlesPage })));
const ArticleDetailPage = lazy(() => import('./pages/ArticleDetailPage').then((module) => ({ default: module.ArticleDetailPage })));
const CreateArticlePage = lazy(() => import('./pages/CreateArticlePage').then((module) => ({ default: module.CreateArticlePage })));
const ReportersPage = lazy(() => import('./pages/ReportersPage').then((module) => ({ default: module.ReportersPage })));
const ReporterDetailPage = lazy(() => import('./pages/ReporterDetailPage').then((module) => ({ default: module.ReporterDetailPage })));
const PublicReporterCardPage = lazy(() => import('./pages/PublicReporterCardPage').then((module) => ({ default: module.PublicReporterCardPage })));
const PaymentsPage = lazy(() => import('./pages/PaymentsPage').then((module) => ({ default: module.PaymentsPage })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then((module) => ({ default: module.NotificationsPage })));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then((module) => ({ default: module.AnalyticsPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })));

function AdminProtectedLayout({ user }: { user: User | null }) {
  if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL) {
    return <LoginPage />;
  }
  return <AppShell />;
}

function App() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => onAuthStateChanged(auth, (currentUser) => {
    setUser(currentUser);
    setLoading(false);
  }), []);

  if (loading) return <div className="app-loading">Preparing the newsroom...</div>;

  return (
    <Suspense fallback={<div className="app-loading">Loading...</div>}>
      <Routes>
        {/* Publicly accessible Press ID Card Verification routes */}
        <Route path="/reporter-card/:id" element={<PublicReporterCardPage />} />
        <Route path="/id-card/:id" element={<PublicReporterCardPage />} />

        {/* Protected Admin Routes */}
        <Route element={<AdminProtectedLayout user={user} />}>
          <Route index element={<DashboardPage />} />
          <Route path="articles" element={<ArticlesPage />} />
          <Route path="articles/new" element={<CreateArticlePage />} />
          <Route path="articles/:id/edit" element={<CreateArticlePage />} />
          <Route path="articles/:id" element={<ArticleDetailPage />} />
          <Route path="reporters" element={<ReportersPage />} />
          <Route path="reporters/:id" element={<ReporterDetailPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
