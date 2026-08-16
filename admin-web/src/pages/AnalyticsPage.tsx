import { useQuery } from 'convex/react';
import { BarChart3, IndianRupee, Newspaper, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { LoadingState, PageHeader } from '../components/ui';
import { api } from '../lib/api';
import { currency, dedupeReporters } from '../lib/utils';

export function AnalyticsPage() {
  const articles = useQuery(api.articles.list, {});
  const payments = useQuery(api.payments.list, {});
  const reporterData = useQuery(api.reporters.list, {});
  if (!articles || !payments || !reporterData) return <LoadingState />;
  const reporters = dedupeReporters(reporterData);
  const now = new Date();
  const month = now.toISOString().slice(0, 7);
  const monthRevenue = payments.filter((payment) => payment.status === 'paid' && payment.createdAt.startsWith(month)).reduce((sum, payment) => sum + payment.amount, 0);
  const days = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(now); date.setDate(now.getDate() - (6 - offset));
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      day: new Intl.DateTimeFormat('en-IN', { weekday: 'short' }).format(date),
      approved: articles.filter((article) => article.status === 'approved' && (article.reviewedAt ?? article.updatedAt).startsWith(key)).length,
      payments: payments.filter((payment) => payment.status === 'paid' && (payment.updatedAt ?? payment.createdAt).startsWith(key)).length,
    };
  });
  const approvedMonth = articles.filter((article) => article.status === 'approved' && (article.reviewedAt ?? '').startsWith(month)).length;
  const rejectedMonth = articles.filter((article) => article.status === 'rejected' && (article.reviewedAt ?? '').startsWith(month)).length;

  return (
    <div className="page analytics-page">
      <PageHeader eyebrow="Performance" title="Analytics" description="Seven-day editorial throughput and current-month financial performance." />
      <section className="metric-grid analytics-metrics">
        <article className="metric-card metric-dark"><div><span>Revenue this month</span><strong>{currency.format(monthRevenue)}</strong><small>Confirmed collections</small></div><IndianRupee /></article>
        <article className="metric-card"><div><span>Approved this month</span><strong>{approvedMonth}</strong><small>{rejectedMonth} rejected</small></div><Newspaper /></article>
        <article className="metric-card"><div><span>Active reporters</span><strong>{reporters.filter((reporter) => reporter.isActive).length}</strong><small>{reporters.length} total accounts</small></div><Users /></article>
        <article className="metric-card"><div><span>Approval rate</span><strong>{approvedMonth + rejectedMonth ? Math.round((approvedMonth / (approvedMonth + rejectedMonth)) * 100) : 0}%</strong><small>Reviewed this month</small></div><BarChart3 /></article>
      </section>
      <section className="chart-grid">
        <div className="panel chart-panel"><header><span className="eyebrow">Editorial</span><h2>Approved articles</h2></header><ResponsiveContainer width="100%" height={280}><BarChart data={days}><CartesianGrid stroke="#e4e1db" vertical={false} /><XAxis dataKey="day" axisLine={false} tickLine={false} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: '#f3f1ec' }} /><Bar dataKey="approved" fill="#171717" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div>
        <div className="panel chart-panel"><header><span className="eyebrow">Finance</span><h2>Confirmed payments</h2></header><ResponsiveContainer width="100%" height={280}><BarChart data={days}><CartesianGrid stroke="#e4e1db" vertical={false} /><XAxis dataKey="day" axisLine={false} tickLine={false} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: '#f3f1ec' }} /><Bar dataKey="payments" fill="#c9372c" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div>
      </section>
    </div>
  );
}
