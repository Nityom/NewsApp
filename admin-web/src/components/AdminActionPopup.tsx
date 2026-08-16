import { useMutation, useQuery } from 'convex/react';
import { Check, CreditCard, IndianRupee, UserRound, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { api } from '../lib/api';
import { currency, dedupeReporters, errorMessage, formatDate } from '../lib/utils';
import type { Payment, Reporter } from '../types';
import { Button } from './ui';

type ActionItem =
  | { key: string; kind: 'application'; reporter: Reporter; createdAt: string }
  | { key: string; kind: 'payment'; payment: Payment; createdAt: string };

const DISMISSED_KEY = 'education-news-dismissed-admin-actions';

function dismissedActions() {
  try { return new Set<string>(JSON.parse(sessionStorage.getItem(DISMISSED_KEY) ?? '[]')); }
  catch { return new Set<string>(); }
}

export function AdminActionPopup() {
  const reporterData = useQuery(api.reporters.list, {});
  const paymentData = useQuery(api.payments.list, {});
  const patchReporter = useMutation(api.reporters.patch);
  const updateStatus = useMutation(api.payments.updateStatus);
  const updateJoiningFee = useMutation(api.payments.updateJoiningFeeStatus);
  const addNotification = useMutation(api.notifications.add);
  const [dismissed, setDismissed] = useState(dismissedActions);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [joiningFee, setJoiningFee] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const reporters = dedupeReporters(reporterData ?? []);
  const knownJoiningFees = new Set((paymentData ?? []).filter((payment) => payment.purpose === 'joining_fee').map((payment) => payment.reporterId));
  const legacyPayments: Payment[] = reporters
    .filter((reporter) => reporter.requestStatus === 'payment_submitted' && reporter.joinFeeAmount && !knownJoiningFees.has(reporter.id))
    .map((reporter) => ({
      id: `join-${reporter.id}`,
      reporterId: reporter.id,
      reporterName: reporter.name,
      reporterAvatar: reporter.photo || reporter.avatar,
      amount: reporter.joinFeeAmount ?? 0,
      status: 'pending',
      method: 'manual submission',
      articlesCount: 0,
      period: 'Joining fee',
      createdAt: reporter.joinedAt,
      purpose: 'joining_fee',
    }));

  const actions: ActionItem[] = [
    ...reporters
      .filter((reporter) => reporter.requestStatus === 'pending')
      .map((reporter): ActionItem => ({ key: `application:${reporter.id}`, kind: 'application', reporter, createdAt: reporter.joinedAt })),
    ...[...(paymentData ?? []), ...legacyPayments]
      .filter((payment) => payment.status === 'pending')
      .map((payment): ActionItem => ({ key: `payment:${payment.id}`, kind: 'payment', payment, createdAt: payment.createdAt })),
  ].filter((item) => !dismissed.has(item.key)).sort((left, right) => left.createdAt.localeCompare(right.createdAt));

  const current = actions[0];
  const currentApplicationFee = current?.kind === 'application' ? current.reporter.joinFeeAmount : undefined;

  useEffect(() => {
    setMessage('');
    setJoiningFee(currentApplicationFee ? String(currentApplicationFee) : '');
    setRejectionReason('');
  }, [current?.key, currentApplicationFee]);

  function dismiss() {
    if (!current) return;
    setDismissed((previous) => {
      const next = new Set(previous).add(current.key);
      sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  async function decidePayment(payment: Payment, status: 'paid' | 'failed') {
    setBusy(status);
    setMessage('');
    try {
      if (payment.purpose === 'joining_fee') await updateJoiningFee({ payment, status });
      else await updateStatus({ id: payment.id, status });
      await addNotification({ notification: {
        type: 'payment',
        audience: 'reporter',
        reporterId: payment.reporterId,
        title: status === 'paid' ? 'Payment Confirmed' : 'Payment Rejected',
        message: status === 'paid'
          ? `${currency.format(payment.amount)} has been confirmed.`
          : 'The submitted payment could not be confirmed. Please contact the administrator.',
      } });
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy('');
    }
  }

  async function acceptApplication(reporter: Reporter) {
    const amount = Number(joiningFee);
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage('Enter a valid joining fee.');
      return;
    }
    setBusy('accept-application');
    setMessage('');
    try {
      await patchReporter({ id: reporter.id, patch: { requestStatus: 'awaiting_payment', joinFeeAmount: amount } });
      await addNotification({ notification: {
        type: 'system',
        audience: 'reporter',
        reporterId: reporter.id,
        title: 'Application Accepted',
        message: `Your application is accepted. Pay the ${currency.format(amount)} joining fee to activate your reporter account.`,
      } });
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy('');
    }
  }

  async function rejectApplication(reporter: Reporter) {
    if (!rejectionReason.trim()) {
      setMessage('Enter a reason before rejecting the application.');
      return;
    }
    setBusy('reject-application');
    setMessage('');
    try {
      await patchReporter({ id: reporter.id, patch: { requestStatus: 'rejected', requestRejectionReason: rejectionReason.trim(), joinFeeAmount: 0 } });
      await addNotification({ notification: {
        type: 'system',
        audience: 'reporter',
        reporterId: reporter.id,
        title: 'Application Update',
        message: rejectionReason.trim(),
      } });
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy('');
    }
  }

  if (!current) return null;

  const remaining = actions.length - 1;
  if (current.kind === 'application') {
    const { reporter } = current;
    return (
      <div className="admin-action-backdrop" role="presentation">
        <section className="admin-action-popup" role="dialog" aria-modal="true" aria-label="Reporter application requires review">
          <header><div className="admin-action-icon"><UserRound /></div><div><span>New reporter application</span><h2>{reporter.name}</h2></div><button type="button" className="icon-button" onClick={dismiss} aria-label="Review later"><X /></button></header>
          <div className="admin-action-body">
            <p>A reporter application is waiting for your decision.</p>
            <dl><div><dt>Email</dt><dd>{reporter.email}</dd></div><div><dt>Phone</dt><dd>{reporter.phone}</dd></div><div><dt>Location</dt><dd>{[reporter.village, reporter.city].filter(Boolean).join(', ') || 'Not provided'}</dd></div><div><dt>Applied</dt><dd>{formatDate(reporter.joinedAt, true)}</dd></div></dl>
            <div className="admin-action-form"><label>Joining fee<input type="number" min="1" value={joiningFee} onChange={(event) => setJoiningFee(event.target.value)} placeholder="Enter amount in rupees" /></label><label>Rejection reason<textarea rows={2} value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Required only when rejecting" /></label></div>
            {message ? <p className="form-error">{message}</p> : null}
            {remaining ? <small>{remaining} more request{remaining === 1 ? '' : 's'} waiting</small> : null}
          </div>
          <footer><Button variant="secondary" onClick={dismiss}>Later</Button><Button variant="danger" loading={busy === 'reject-application'} disabled={Boolean(busy)} onClick={() => void rejectApplication(reporter)}><X size={16} /> Reject</Button><Button loading={busy === 'accept-application'} disabled={Boolean(busy)} onClick={() => void acceptApplication(reporter)}><Check size={16} /> Accept &amp; request fee</Button></footer>
        </section>
      </div>
    );
  }

  const { payment } = current;
  return (
    <div className="admin-action-backdrop" role="presentation">
      <section className="admin-action-popup" role="dialog" aria-modal="true" aria-label="Reporter payment requires review">
        <header><div className="admin-action-icon payment"><CreditCard /></div><div><span>Payment approval</span><h2>{payment.reporterName}</h2></div><button type="button" className="icon-button" onClick={dismiss} aria-label="Review later"><X /></button></header>
        <div className="admin-action-body">
          <div className="admin-action-amount"><IndianRupee /><strong>{currency.format(payment.amount)}</strong><span>{(payment.purpose ?? 'admin_payment').replaceAll('_', ' ')}</span></div>
          <dl><div><dt>Method</dt><dd>{payment.method}</dd></div><div><dt>Submitted</dt><dd>{formatDate(payment.createdAt, true)}</dd></div>{payment.transactionId ? <div><dt>Transaction ID</dt><dd>{payment.transactionId}</dd></div> : null}</dl>
          {message ? <p className="form-error">{message}</p> : null}
          {remaining ? <small>{remaining} more request{remaining === 1 ? '' : 's'} waiting</small> : null}
        </div>
        <footer className="admin-action-payment-buttons"><Button variant="secondary" onClick={dismiss}>Later</Button><Button variant="danger" loading={busy === 'failed'} disabled={Boolean(busy)} onClick={() => void decidePayment(payment, 'failed')}><X size={16} /> Reject</Button><Button loading={busy === 'paid'} disabled={Boolean(busy)} onClick={() => void decidePayment(payment, 'paid')}><Check size={16} /> Confirm</Button></footer>
      </section>
    </div>
  );
}
