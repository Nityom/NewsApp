import { useMutation, useQuery } from 'convex/react';
import { ArrowLeft, Ban, Check, Download, Mail, MapPin, Phone, RotateCcw, ShieldCheck, Trash2, UserRound, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Button, Dialog, EmptyState, LoadingState, PageHeader, StatusBadge } from '../components/ui';
import { api } from '../lib/api';
import { currency, dedupeReporters, errorMessage, formatDate } from '../lib/utils';
import type { Payment } from '../types';

export function ReporterDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const reporterData = useQuery(api.reporters.list, {});
  const articles = useQuery(api.articles.list, {});
  const payments = useQuery(api.payments.list, {});
  const patchReporter = useMutation(api.reporters.patch);
  const removeReporter = useMutation(api.reporters.remove);
  const updateJoiningFee = useMutation(api.payments.updateJoiningFeeStatus);
  const addNotification = useMutation(api.notifications.add);
  const reporter = dedupeReporters(reporterData ?? []).find((item) => item.id === id)!;
  const [feeDialog, setFeeDialog] = useState(false);
  const [fee, setFee] = useState('');
  const [rejectDialog, setRejectDialog] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [photoSource, setPhotoSource] = useState('');

  useEffect(() => {
    setPhotoSource(reporter?.photo || reporter?.avatar || '');
  }, [reporter?.photo, reporter?.avatar]);

  useEffect(() => {
    if (!photoPreview) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setPhotoPreview(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [photoPreview]);

  if (!reporterData || !articles || !payments) return <LoadingState />;
  if (!reporter) return <div className="page"><EmptyState title="Reporter not found" message="This account may have been deleted." /></div>;
  const reporterArticles = articles.filter((article) => article.reporterId === reporter.id);
  const reporterPayments = payments.filter((payment) => payment.reporterId === reporter.id);

  async function run(name: string, action: () => Promise<unknown>) {
    setBusy(name); setMessage('');
    try { await action(); } catch (error) { setMessage(errorMessage(error)); } finally { setBusy(''); }
  }

  async function notify(title: string, notificationMessage: string) {
    await addNotification({ notification: { type: 'system', audience: 'reporter', reporterId: reporter.id, title, message: notificationMessage } });
  }

  function requestFee() {
    const amount = Number(fee);
    if (!Number.isFinite(amount) || amount <= 0) return;
    return run('fee', async () => {
      await patchReporter({ id: reporter.id, patch: { requestStatus: 'awaiting_payment', joinFeeAmount: amount } });
      await notify('Joining Fee Set', `Your joining fee is ${currency.format(amount)}. Complete payment in the app to continue.`);
      setFeeDialog(false);
    });
  }

  function reject() {
    if (!reason.trim()) return;
    return run('reject', async () => {
      await patchReporter({ id: reporter.id, patch: { requestStatus: 'rejected', requestRejectionReason: reason.trim(), joinFeeAmount: 0 } });
      await notify('Application Update', reason.trim());
      setRejectDialog(false);
    });
  }

  function syntheticPayment(): Payment {
    return {
      id: `join-${reporter.id}`, reporterId: reporter.id, reporterName: reporter.name,
      reporterAvatar: reporter.avatar, amount: reporter.joinFeeAmount ?? 0, status: 'pending',
      method: 'admin confirmation', articlesCount: 0, period: 'Joining fee', createdAt: new Date().toISOString(), purpose: 'joining_fee',
    };
  }

  function downloadReporterPhoto() {
    const photo = photoSource || reporter.photo || reporter.avatar;
    if (!photo) return;
    return run('download-photo', async () => {
      const safeName = reporter.name.trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'reporter';
      const cloudinaryUrl = photo.match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/);
      if (cloudinaryUrl) {
        const link = document.createElement('a');
        link.href = `${cloudinaryUrl[1]}fl_attachment:${encodeURIComponent(`${safeName}-photo`)}/${cloudinaryUrl[2]}`;
        link.click();
        return;
      }
      const response = await fetch(photo, { mode: 'cors' });
      if (!response.ok) throw new Error('Could not download the reporter photo.');
      const blob = await response.blob();
      const extension = blob.type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${safeName}-photo.${extension}`;
      link.href = url;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }

  const reporterCard = (
    <section className="press-id-card">
      <header className="press-id-header">
        <img src="/app-logo.png" alt="Education News" />
        <div><strong>EDUCATION NEWS</strong><span>PRESS IDENTITY CARD</span></div>
      </header>
      <div className="press-id-accent" />
      <div className="press-id-body">
        {photoSource ? <button type="button" className="profile-photo profile-photo-button" onClick={() => setPhotoPreview(true)} aria-label={`Preview ${reporter.name}'s photo`}><img src={photoSource} alt={reporter.name} referrerPolicy="no-referrer" onError={() => setPhotoSource((current) => current !== reporter.avatar ? reporter.avatar : '')} /></button> : <div className="profile-photo"><UserRound /></div>}
        <div className="press-id-name"><h2>{reporter.name}</h2><span>News Reporter</span></div>
        <div className="press-id-number"><span>Reporter ID</span><strong>{reporter.reporterCode || reporter.id}</strong></div>
        <div className="contact-list"><a href={`mailto:${reporter.email}`}><Mail />{reporter.email}</a><a href={`tel:${reporter.phone}`}><Phone />{reporter.phone}</a><p><MapPin />{[reporter.village, reporter.city].filter(Boolean).join(', ') || 'Location unavailable'}</p></div>
      </div>
      <footer className="press-id-footer"><span className={`press-id-dot ${reporter.isActive ? 'active' : ''}`} />{reporter.isActive ? 'ACTIVE CREDENTIAL' : 'INACTIVE CREDENTIAL'}<strong>educationnews.com</strong></footer>
    </section>
  );

  return (
    <div className="page reporter-detail-page">
      <Link to="/reporters" className="back-link"><ArrowLeft size={17} /> Back to reporters</Link>
      <PageHeader title={reporter.name} description={reporter.reporterCode || reporter.email} actions={<><StatusBadge value={reporter.requestStatus} /><StatusBadge value={reporter.isActive ? 'active' : 'suspended'} /></>} />
      {message ? <div className="form-error">{message}</div> : null}
      <div className="reporter-grid">
        <aside className="reporter-identity-column">
          {reporterCard}
          <section className="panel reporter-summary">
            <dl><div><dt>Joined</dt><dd>{formatDate(reporter.joinedAt)}</dd></div><div><dt>Aadhar</dt><dd>{reporter.aadharNumber || '—'}</dd></div><div><dt>Articles</dt><dd>{reporterArticles.length}</dd></div><div><dt>Earnings</dt><dd>{currency.format(reporter.totalEarnings || 0)}</dd></div></dl>
          </section>
        </aside>
        <div className="reporter-main">
          <section className="panel action-panel"><header><span className="eyebrow">Account decisions</span><h2>Administrative controls</h2></header>
            <div className="action-grid">
              {reporter.requestStatus === 'pending' ? <><Button onClick={() => setFeeDialog(true)}><ShieldCheck size={17} /> Set joining fee</Button><Button variant="secondary" onClick={() => setRejectDialog(true)}><X size={17} /> Reject request</Button></> : null}
              {reporter.requestStatus === 'rejected' ? <Button onClick={() => void run('reconsider', () => patchReporter({ id: reporter.id, patch: { requestStatus: 'pending' } }))} loading={busy === 'reconsider'}><RotateCcw size={17} /> Reconsider</Button> : null}
              {['awaiting_payment', 'payment_submitted'].includes(reporter.requestStatus) ? <Button onClick={() => void run('confirm', async () => { await updateJoiningFee({ payment: reporterPayments.find((payment) => payment.purpose === 'joining_fee') ?? syntheticPayment(), status: 'paid' }); await notify('Account Approved', 'Your joining fee is confirmed and your reporter account is active.'); })} loading={busy === 'confirm'}><Check size={17} /> Confirm payment</Button> : null}
              {reporter.requestStatus === 'approved' ? <Button variant={reporter.isActive ? 'secondary' : 'primary'} onClick={() => void run('active', async () => { await patchReporter({ id: reporter.id, patch: { isActive: !reporter.isActive } }); await notify(reporter.isActive ? 'Account Suspended' : 'Account Activated', reporter.isActive ? 'Your reporter account has been suspended by an administrator.' : 'Your reporter account is active again.'); })} loading={busy === 'active'}>{reporter.isActive ? <Ban size={17} /> : <Check size={17} />}{reporter.isActive ? 'Suspend account' : 'Activate account'}</Button> : null}
              <Button variant="danger" onClick={() => { if (window.confirm(`Delete ${reporter.name}'s account?`)) void run('delete', async () => { await removeReporter({ id: reporter.id }); navigate('/reporters'); }); }} loading={busy === 'delete'}><Trash2 size={17} /> Delete account</Button>
            </div>
          </section>
          <section className="panel"><header><span className="eyebrow">Publishing record</span><h2>Recent articles</h2></header><div className="compact-list">{reporterArticles.slice(0, 6).map((article) => <Link to={`/articles/${article.id}`} key={article.id}><span><strong>{article.title}</strong><small>{formatDate(article.createdAt)}</small></span><StatusBadge value={article.status} /></Link>)}{!reporterArticles.length ? <p className="muted">No articles submitted.</p> : null}</div></section>
          <section className="panel"><header><span className="eyebrow">Transactions</span><h2>Payment history</h2></header><div className="compact-list">{reporterPayments.map((payment) => <div key={payment.id}><span><strong>{currency.format(payment.amount)}</strong><small>{formatDate(payment.createdAt)} · {payment.method}</small></span><StatusBadge value={payment.status} /></div>)}{!reporterPayments.length ? <p className="muted">No payment records.</p> : null}</div></section>
        </div>
      </div>
      {feeDialog ? <Dialog title="Set joining fee" onClose={() => setFeeDialog(false)}><div className="dialog-body"><label>Amount in rupees<input type="number" min="1" value={fee} onChange={(event) => setFee(event.target.value)} placeholder="500" /></label><div className="dialog-actions"><Button variant="secondary" onClick={() => setFeeDialog(false)}>Cancel</Button><Button disabled={Number(fee) <= 0} loading={busy === 'fee'} onClick={() => void requestFee()}>Send fee request</Button></div></div></Dialog> : null}
      {rejectDialog ? <Dialog title="Reject application" onClose={() => setRejectDialog(false)}><div className="dialog-body"><label>Reason<textarea rows={5} value={reason} onChange={(event) => setReason(event.target.value)} /></label><div className="dialog-actions"><Button variant="secondary" onClick={() => setRejectDialog(false)}>Cancel</Button><Button variant="danger" disabled={!reason.trim()} loading={busy === 'reject'} onClick={() => void reject()}>Reject request</Button></div></div></Dialog> : null}
      {photoPreview && photoSource ? <div className="photo-viewer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPhotoPreview(false); }}><section className="photo-viewer-dialog" role="dialog" aria-modal="true" aria-label={`${reporter.name}'s photo`}>
        <header><div><strong>{reporter.name}</strong><span>Reporter photo</span></div><button type="button" onClick={() => void downloadReporterPhoto()} disabled={busy === 'download-photo'} aria-label="Download reporter photo" title="Download"><Download /></button><button type="button" onClick={() => setPhotoPreview(false)} aria-label="Close photo preview" title="Close"><X /></button></header>
        <div className="photo-viewer-image"><img src={photoSource} alt={reporter.name} referrerPolicy="no-referrer" onError={() => setPhotoSource((current) => current !== reporter.avatar ? reporter.avatar : '')} /></div>
      </section></div> : null}
    </div>
  );
}
