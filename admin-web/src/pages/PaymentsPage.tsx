import { useMutation, useQuery } from 'convex/react';
import { Check, CreditCard, X } from 'lucide-react';
import { useState } from 'react';

import { Button, EmptyState, LoadingState, PageHeader, SearchInput, StatusBadge } from '../components/ui';
import { api } from '../lib/api';
import { currency, dedupeReporters, errorMessage, formatDate } from '../lib/utils';
import type { Payment, PaymentStatus } from '../types';

export function PaymentsPage() {
  const paymentsData = useQuery(api.payments.list, {});
  const reporterData = useQuery(api.reporters.list, {});
  const updateStatus = useMutation(api.payments.updateStatus);
  const updateJoiningFee = useMutation(api.payments.updateJoiningFeeStatus);
  const addNotification = useMutation(api.notifications.add);
  const [filter, setFilter] = useState<'all' | PaymentStatus>('all');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  if (!paymentsData || !reporterData) return <LoadingState />;
  const reporters = dedupeReporters(reporterData);
  const knownReporterIds = new Set(paymentsData.filter((payment) => payment.purpose === 'joining_fee').map((payment) => payment.reporterId));
  const legacy: Payment[] = reporters.filter((reporter) => reporter.requestStatus === 'payment_submitted' && reporter.joinFeeAmount && !knownReporterIds.has(reporter.id)).map((reporter) => ({
    id: `join-${reporter.id}`, reporterId: reporter.id, reporterName: reporter.name, reporterAvatar: reporter.avatar,
    amount: reporter.joinFeeAmount ?? 0, status: 'pending', method: 'manual submission', articlesCount: 0,
    period: 'Joining fee', createdAt: reporter.joinedAt, purpose: 'joining_fee',
  }));
  const payments = [...paymentsData, ...legacy];
  const term = search.toLowerCase();
  const visible = payments.filter((payment) => filter === 'all' || payment.status === filter).filter((payment) => `${payment.reporterName} ${payment.transactionId ?? ''} ${payment.method}`.toLowerCase().includes(term)).sort((left, right) => left.status === 'pending' && right.status !== 'pending' ? -1 : right.createdAt.localeCompare(left.createdAt));

  async function decide(payment: Payment, status: 'paid' | 'failed') {
    setBusy(`${payment.id}-${status}`); setMessage('');
    try {
      if (payment.purpose === 'joining_fee') await updateJoiningFee({ payment, status });
      else await updateStatus({ id: payment.id, status });
      await addNotification({ notification: {
        type: 'payment', audience: 'reporter', reporterId: payment.reporterId,
        title: status === 'paid' ? 'Payment Confirmed' : 'Payment Rejected',
        message: status === 'paid' ? `${currency.format(payment.amount)} has been confirmed.` : 'The submitted payment could not be confirmed. Please contact the administrator.',
      } });
    } catch (error) { setMessage(errorMessage(error)); } finally { setBusy(''); }
  }

  return (
    <div className="page">
      <PageHeader eyebrow="Finance" title="Payments" description="Confirm joining fees and reconcile reporter transactions." />
      {message ? <div className="form-error">{message}</div> : null}
      <div className="toolbar"><div className="segmented-control">{(['all', 'pending', 'paid', 'failed'] as const).map((status) => <button type="button" className={filter === status ? 'active' : ''} onClick={() => setFilter(status)} key={status}>{status}<span>{status === 'all' ? payments.length : payments.filter((payment) => payment.status === status).length}</span></button>)}</div><SearchInput value={search} onChange={setSearch} placeholder="Search reporter or transaction" /></div>
      <section className="data-panel"><div className="table payment-table"><div className="table-head"><span>Reporter</span><span>Purpose</span><span>Amount</span><span>Date</span><span>Status</span><span>Decision</span></div>
        {visible.map((payment) => <div className="table-row" key={payment.id}><div className="person-cell">{payment.reporterAvatar ? <img src={payment.reporterAvatar} alt="" /> : <div className="avatar-fallback"><CreditCard /></div>}<span><strong>{payment.reporterName}</strong><small>{payment.transactionId || payment.method}</small></span></div><span>{(payment.purpose ?? 'admin_payment').replaceAll('_', ' ')}</span><strong>{currency.format(payment.amount)}</strong><span>{formatDate(payment.createdAt)}</span><StatusBadge value={payment.status} /><div className="row-actions">{payment.status === 'pending' ? <><Button onClick={() => void decide(payment, 'paid')} loading={busy === `${payment.id}-paid`}><Check size={15} /> Confirm</Button><Button variant="danger" onClick={() => void decide(payment, 'failed')} loading={busy === `${payment.id}-failed`}><X size={15} /></Button></> : <span className="muted">Completed</span>}</div></div>)}
      </div>{!visible.length ? <EmptyState title="No payments found" message="There are no transactions matching this view." /> : null}</section>
      <div className="mobile-records">{visible.map((payment) => <div key={payment.id}><CreditCard /><div><strong>{payment.reporterName}</strong><span>{currency.format(payment.amount)} · {formatDate(payment.createdAt)}</span></div><StatusBadge value={payment.status} /></div>)}</div>
    </div>
  );
}
