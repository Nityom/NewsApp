import { useQuery } from 'convex/react';
import { ArrowRight, BookOpenText, Clock3, IndianRupee, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

import { LoadingState, PageHeader, StatusBadge } from '../components/ui';
import { api } from '../lib/api';
import { currency, dedupeReporters, formatDate } from '../lib/utils';

export function DashboardPage() {
  const articles = useQuery(api.articles.list, {});
  const reporterData = useQuery(api.reporters.list, {});
  const payments = useQuery(api.payments.list, {});
  const notifications = useQuery(api.notifications.list, {});

  if (!articles || !reporterData || !payments || !notifications) return <LoadingState />;
  const reporters = dedupeReporters(reporterData);
  const pendingArticles = articles.filter((article) => article.status === 'pending');
  const openRequests = reporters.filter((reporter) => ['pending', 'awaiting_payment', 'payment_submitted'].includes(reporter.requestStatus));
  const month = new Date().toISOString().slice(0, 7);
  const monthlyRevenue = payments
    .filter((payment) => payment.status === 'paid' && payment.createdAt.startsWith(month))
    .reduce((sum, payment) => sum + payment.amount, 0);
  const unread = notifications.filter((notification) => !notification.isRead).length;
  const recent = [...articles].sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, 6);

  return (
    <div className="page dashboard-page">
      <PageHeader eyebrow="Live overview" title="Newsroom dashboard" description="Today’s editorial queue, memberships, and collections at a glance." />
      <section className="metric-grid">
        <article className="metric-card metric-dark"><div><span>Pending review</span><strong>{pendingArticles.length}</strong><small>Articles awaiting a decision</small></div><Clock3 /></article>
        <article className="metric-card"><div><span>Reporters</span><strong>{reporters.length}</strong><small>{openRequests.length} open join requests</small></div><Users /></article>
        <article className="metric-card"><div><span>Monthly revenue</span><strong>{currency.format(monthlyRevenue)}</strong><small>Confirmed payments this month</small></div><IndianRupee /></article>
        <article className="metric-card"><div><span>Unread alerts</span><strong>{unread}</strong><small>Admin notifications</small></div><BookOpenText /></article>
      </section>
      <section className="dashboard-grid">
        <div className="panel recent-panel">
          <header><div><span className="eyebrow">Editorial queue</span><h2>Recent articles</h2></div><Link to="/articles">View all <ArrowRight size={16} /></Link></header>
          <div className="article-list">
            {recent.map((article) => (
              <Link to={`/articles/${article.id}`} key={article.id} className="article-list-row">
                <img src={article.banner} alt="" />
                <div><strong>{article.title}</strong><span>{article.reporterName} · {formatDate(article.createdAt)}</span></div>
                <StatusBadge value={article.status} />
                <ArrowRight size={17} />
              </Link>
            ))}
          </div>
        </div>
        <aside className="panel queue-panel">
          <header><span className="eyebrow">Needs attention</span></header>
          <Link to="/articles?status=pending"><span>Article reviews</span><strong>{pendingArticles.length}</strong></Link>
          <Link to="/reporters"><span>Join requests</span><strong>{openRequests.length}</strong></Link>
          <Link to="/payments?status=pending"><span>Pending payments</span><strong>{payments.filter((payment) => payment.status === 'pending').length}</strong></Link>
          <Link to="/notifications"><span>Unread alerts</span><strong>{unread}</strong></Link>
        </aside>
      </section>
    </div>
  );
}
