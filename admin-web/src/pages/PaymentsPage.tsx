import { useQuery } from 'convex/react';
import { CreditCard } from 'lucide-react';
import { useState } from 'react';

import { EmptyState, LoadingState, PageHeader, SearchInput, StatusBadge } from '../components/ui';
import { api } from '../lib/api';
import { currency, dedupeReporters, formatDate } from '../lib/utils';
import type { Payment, PaymentStatus } from '../types';

export function PaymentsPage() {
  const paymentsData = useQuery(api.payments.list, {});
  const reporterData = useQuery(api.reporters.list, {});
  const [filter, setFilter] = useState<'all' | PaymentStatus>('all');
  const [search, setSearch] = useState('');

  if (!paymentsData || !reporterData) return <LoadingState />;
  const reporters = dedupeReporters(reporterData);
  const knownReporterIds = new Set(paymentsData.filter((payment) => payment.purpose === 'joining_fee').map((payment) => payment.reporterId));
  const legacy: Payment[] = reporters.filter((reporter) => reporter.requestStatus === 'payment_submitted' && reporter.joinFeeAmount && !knownReporterIds.has(reporter.id)).map((reporter) => ({
    id: `join-${reporter.id}`, reporterId: reporter.id, reporterName: reporter.name, reporterAvatar: reporter.avatar,
    amount: reporter.joinFeeAmount ?? 0, status: 'pending', method: 'Razorpay pending', articlesCount: 0,
    period: 'Joining fee', createdAt: reporter.joinedAt, purpose: 'joining_fee',
  }));
  const payments = [...paymentsData, ...legacy];
  const term = search.toLowerCase();
  const visible = payments.filter((payment) => filter === 'all' || payment.status === filter).filter((payment) => `${payment.reporterName} ${payment.transactionId ?? ''} ${payment.method}`.toLowerCase().includes(term)).sort((left, right) => left.status === 'pending' && right.status !== 'pending' ? -1 : right.createdAt.localeCompare(left.createdAt));

  return (
    <div className="page">
      <PageHeader eyebrow="Finance" title="Payments" description="Track and reconcile reporter transactions verified via Razorpay." />
      <div className="toolbar"><div className="segmented-control">{(['all', 'pending', 'paid', 'failed'] as const).map((status) => <button type="button" className={filter === status ? 'active' : ''} onClick={() => setFilter(status)} key={status}>{status}<span>{status === 'all' ? payments.length : payments.filter((payment) => payment.status === status).length}</span></button>)}</div><SearchInput value={search} onChange={setSearch} placeholder="Search reporter or transaction" /></div>
      <section className="data-panel"><div className="table payment-table"><div className="table-head"><span>Reporter</span><span>Purpose</span><span>Amount</span><span>Date</span><span>Status</span><span>Verification</span></div>
        {visible.map((payment) => <div className="table-row" key={payment.id}><div className="person-cell">{payment.reporterAvatar ? <img src={payment.reporterAvatar} alt="" /> : <div className="avatar-fallback"><CreditCard /></div>}<span><strong>{payment.reporterName}</strong><small>{payment.transactionId || payment.method}</small></span></div><span>{(payment.purpose ?? 'admin_payment').replaceAll('_', ' ')}</span><strong>{currency.format(payment.amount)}</strong><span>{formatDate(payment.createdAt)}</span><StatusBadge value={payment.status} /><div className="row-actions">{payment.status === 'pending' ? <span className="muted">Razorpay pending</span> : payment.status === 'paid' ? <span className="muted">Confirmed</span> : <span className="muted">Failed</span>}</div></div>)}
      </div>{!visible.length ? <EmptyState title="No payments found" message="There are no transactions matching this view." /> : null}</section>
      <div className="mobile-records">{visible.map((payment) => <div key={payment.id}><CreditCard /><div><strong>{payment.reporterName}</strong><span>{currency.format(payment.amount)} · {formatDate(payment.createdAt)}</span></div><StatusBadge value={payment.status} /></div>)}</div>
    </div>
  );
}
