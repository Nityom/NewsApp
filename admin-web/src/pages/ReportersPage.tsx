import { useQuery } from 'convex/react';
import { ArrowRight, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState, LoadingState, PageHeader, SearchInput, StatusBadge } from '../components/ui';
import { api } from '../lib/api';
import { dedupeReporters, formatDate } from '../lib/utils';

const priority: Record<string, number> = { pending: 0, payment_submitted: 1, awaiting_payment: 2, approved: 3, rejected: 4 };

export function ReportersPage() {
  const reporterData = useQuery(api.reporters.list, {});
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  if (!reporterData) return <LoadingState />;
  const reporters = dedupeReporters(reporterData);
  const term = search.toLowerCase();
  const visible = reporters
    .filter((reporter) => filter === 'all' || reporter.requestStatus === filter)
    .filter((reporter) => `${reporter.name} ${reporter.email} ${reporter.city} ${reporter.reporterCode ?? ''}`.toLowerCase().includes(term))
    .sort((left, right) => (priority[left.requestStatus] ?? 9) - (priority[right.requestStatus] ?? 9));

  return (
    <div className="page">
      <PageHeader eyebrow="Membership" title="Reporters" description="Review applications and manage active newsroom accounts." />
      <div className="toolbar">
        <div className="segmented-control">{['all', 'pending', 'awaiting_payment', 'approved', 'rejected'].map((status) => <button type="button" className={filter === status ? 'active' : ''} onClick={() => setFilter(status)} key={status}>{status.replaceAll('_', ' ')}</button>)}</div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search reporter, city, or ID" />
      </div>
      <section className="data-panel"><div className="table reporter-table">
        <div className="table-head"><span>Reporter</span><span>Location</span><span>Joined</span><span>Account</span><span>Request</span><span /></div>
        {visible.map((reporter) => <Link className="table-row" to={`/reporters/${reporter.id}`} key={reporter.id}>
          <div className="person-cell">{reporter.photo || reporter.avatar ? <img src={reporter.photo || reporter.avatar} alt="" /> : <div className="avatar-fallback"><UserRound /></div>}<span><strong>{reporter.name}</strong><small>{reporter.email}</small></span></div>
          <span>{reporter.village || reporter.city || '—'}</span><span>{formatDate(reporter.joinedAt)}</span>
          <StatusBadge value={reporter.isActive ? 'active' : 'suspended'} /><StatusBadge value={reporter.requestStatus} /><ArrowRight size={17} />
        </Link>)}</div>{!visible.length ? <EmptyState title="No reporters found" message="Try a different filter or search term." /> : null}</section>
      <div className="mobile-records">{visible.map((reporter) => <Link to={`/reporters/${reporter.id}`} key={reporter.id}><UserRound /><div><strong>{reporter.name}</strong><span>{reporter.city || reporter.email}</span></div><StatusBadge value={reporter.requestStatus} /></Link>)}</div>
    </div>
  );
}
