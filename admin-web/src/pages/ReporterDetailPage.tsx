import { useMutation, useQuery } from 'convex/react';
import {
  ArrowLeft,
  Ban,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  Share2,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Button, Dialog, EmptyState, LoadingState, PageHeader, StatusBadge } from '../components/ui';
import { api } from '../lib/api';
import { downloadReporterIdCard } from '../lib/exportIdCard';
import { plainRichText } from '../lib/richText';
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
  const [designationDialog, setDesignationDialog] = useState(false);
  const [designationInput, setDesignationInput] = useState('');
  const [photoPreview, setPhotoPreview] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [photoSource, setPhotoSource] = useState('');
  const [shareDropdown, setShareDropdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPhotoSource(reporter?.photo || reporter?.avatar || '');
    if (reporter?.designation) {
      setDesignationInput(reporter.designation);
    }
  }, [reporter?.photo, reporter?.avatar, reporter?.designation]);

  useEffect(() => {
    if (!photoPreview) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPhotoPreview(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [photoPreview]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShareDropdown(false);
      }
    };
    if (shareDropdown) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [shareDropdown]);

  if (!reporterData || !articles || !payments) return <LoadingState />;
  if (!reporter) {
    return (
      <div className="page">
        <EmptyState title="Reporter not found" message="This account may have been deleted." />
      </div>
    );
  }

  const reporterArticles = articles.filter((article) => article.reporterId === reporter.id);
  const reporterPayments = payments.filter((payment) => payment.reporterId === reporter.id);
  const publicCardUrl = `${window.location.origin}/reporter-card/${reporter.id}`;
  const currentDesignation = reporter.designation || 'News Reporter';

  async function run(name: string, action: () => Promise<unknown>) {
    setBusy(name);
    setMessage('');
    try {
      await action();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy('');
    }
  }

  async function notify(title: string, notificationMessage: string) {
    await addNotification({
      notification: {
        type: 'system',
        audience: 'reporter',
        reporterId: reporter.id,
        title,
        message: notificationMessage,
      },
    });
  }

  function requestFee() {
    const amount = Number(fee);
    if (!Number.isFinite(amount) || amount <= 0) return;
    return run('fee', async () => {
      await patchReporter({
        id: reporter.id,
        patch: { requestStatus: 'awaiting_payment', joinFeeAmount: amount },
      });
      await notify(
        'Joining Fee Set',
        `Your joining fee is ${currency.format(amount)}. Complete payment in the app to continue.`,
      );
      setFeeDialog(false);
    });
  }

  function reject() {
    if (!reason.trim()) return;
    return run('reject', async () => {
      await patchReporter({
        id: reporter.id,
        patch: { requestStatus: 'rejected', requestRejectionReason: reason.trim(), joinFeeAmount: 0 },
      });
      await notify('Application Update', reason.trim());
      setRejectDialog(false);
    });
  }

  function saveDesignation() {
    const trimmed = designationInput.trim() || 'News Reporter';
    return run('designation', async () => {
      await patchReporter({
        id: reporter.id,
        patch: { designation: trimmed },
      });
      await notify('Designation Updated', `Your official designation has been set to: ${trimmed}`);
      setDesignationDialog(false);
    });
  }

  function handleDownloadIdCard() {
    return run('download-id', async () => {
      await downloadReporterIdCard(reporter);
      setShareDropdown(false);
    });
  }

  async function handleSharePublicLink() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${reporter.name} - Press Identity Card`,
          text: `Official Education News Press Identity Card for ${reporter.name} (${currentDesignation})`,
          url: publicCardUrl,
        });
        setShareDropdown(false);
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    await navigator.clipboard.writeText(publicCardUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
    setShareDropdown(false);
  }

  function syntheticPayment(): Payment {
    return {
      id: `join-${reporter.id}`,
      reporterId: reporter.id,
      reporterName: reporter.name,
      reporterAvatar: reporter.avatar,
      amount: reporter.joinFeeAmount ?? 0,
      status: 'pending',
      method: 'admin confirmation',
      articlesCount: 0,
      period: 'Joining fee',
      createdAt: new Date().toISOString(),
      purpose: 'joining_fee',
    };
  }

  function downloadReporterPhoto() {
    const photo = photoSource || reporter.photo || reporter.avatar;
    if (!photo) return;
    return run('download-photo', async () => {
      const safeName =
        reporter.name.trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'reporter';
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
        <div>
          <strong>EDUCATION NEWS</strong>
          <span>PRESS IDENTITY CARD</span>
        </div>
      </header>
      <div className="press-id-accent" />
      <div className="press-id-body">
        {photoSource ? (
          <button
            type="button"
            className="profile-photo profile-photo-button"
            onClick={() => setPhotoPreview(true)}
            aria-label={`Preview ${reporter.name}'s photo`}
          >
            <img
              src={photoSource}
              alt={reporter.name}
              referrerPolicy="no-referrer"
              onError={() => setPhotoSource((current) => (current !== reporter.avatar ? reporter.avatar : ''))}
            />
          </button>
        ) : (
          <div className="profile-photo">
            <UserRound />
          </div>
        )}
        <div className="press-id-name">
          <h2>{reporter.name}</h2>
          <div className="press-id-designation-container">
            <span className="press-id-designation-badge">{currentDesignation}</span>
            <button
              type="button"
              className="icon-mini-btn"
              onClick={() => {
                setDesignationInput(reporter.designation || 'News Reporter');
                setDesignationDialog(true);
              }}
              title="Change Designation"
              aria-label="Change Designation"
            >
              <Edit3 size={12} />
            </button>
          </div>
        </div>
        <div className="press-id-number">
          <span>Reporter ID</span>
          <strong>{reporter.reporterCode || reporter.id}</strong>
        </div>
        <div className="contact-list">
          {reporter.email ? (
            <a href={`mailto:${reporter.email}`}>
              <span className="contact-icon-wrap"><Mail /></span>
              <span>{reporter.email}</span>
            </a>
          ) : null}
          {reporter.phone ? (
            <a href={`tel:${reporter.phone}`}>
              <span className="contact-icon-wrap"><Phone /></span>
              <span>{reporter.phone}</span>
            </a>
          ) : null}
          <p>
            <span className="contact-icon-wrap"><MapPin /></span>
            <span>{[reporter.village, reporter.city].filter(Boolean).join(', ') || 'Location unavailable'}</span>
          </p>
        </div>
      </div>
      <footer className="press-id-footer">
        <span className={`press-id-status ${reporter.isActive ? 'active' : ''}`}>
          <span className={`press-id-dot ${reporter.isActive ? 'active' : ''}`} />
          {reporter.isActive ? 'ACTIVE CREDENTIAL' : 'INACTIVE CREDENTIAL'}
        </span>
        <strong>educationnews.com</strong>
      </footer>
    </section>
  );

  return (
    <div className="page reporter-detail-page">
      <Link to="/reporters" className="back-link">
        <ArrowLeft size={17} /> Back to reporters
      </Link>
      <PageHeader
        title={reporter.name}
        description={reporter.reporterCode || reporter.email}
        actions={
          <>
            <StatusBadge value={reporter.requestStatus} />
            <StatusBadge value={reporter.isActive ? 'active' : 'suspended'} />
          </>
        }
      />
      {message ? <div className="form-error">{message}</div> : null}
      {copied ? (
        <div className="form-success banner-toast">
          <CheckCircle2 size={16} /> Public reporter card link copied to clipboard!
        </div>
      ) : null}

      <div className="reporter-grid">
        <aside className="reporter-identity-column">
          {reporterCard}

          {/* ID Card Actions Toolbar */}
          <div className="id-card-actions-bar">
            {/* Share Dropdown Button */}
            <div className="share-menu-wrapper" ref={shareRef}>
              <Button
                variant="primary"
                className="w-full flex-center gap-2"
                onClick={() => setShareDropdown((prev) => !prev)}
                aria-expanded={shareDropdown}
              >
                <Share2 size={16} /> Share & Actions
              </Button>

              {shareDropdown ? (
                <div className="share-dropdown-menu">
                  <button
                    type="button"
                    className="share-dropdown-item"
                    onClick={() => void handleDownloadIdCard()}
                    disabled={busy === 'download-id'}
                  >
                    <Download size={16} />
                    <div className="dropdown-item-text">
                      <strong>Download Reporter ID</strong>
                      <small>Export high-res PNG press card</small>
                    </div>
                  </button>

                  <button
                    type="button"
                    className="share-dropdown-item"
                    onClick={() => void handleSharePublicLink()}
                  >
                    <Copy size={16} />
                    <div className="dropdown-item-text">
                      <strong>Share Public Link</strong>
                      <small>Copy public ID card verification link</small>
                    </div>
                  </button>

                  <a
                    href={`/reporter-card/${reporter.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="share-dropdown-item"
                    onClick={() => setShareDropdown(false)}
                  >
                    <ExternalLink size={16} />
                    <div className="dropdown-item-text">
                      <strong>Open Public View</strong>
                      <small>View public card page in new tab</small>
                    </div>
                  </a>
                </div>
              ) : null}
            </div>

            {/* Quick Designation Edit Button */}
            <Button
              variant="secondary"
              className="w-full flex-center gap-2"
              onClick={() => {
                setDesignationInput(reporter.designation || 'News Reporter');
                setDesignationDialog(true);
              }}
            >
              <Edit3 size={15} /> Set Designation
            </Button>
          </div>

          <section className="panel reporter-summary">
            <dl>
              <div>
                <dt>Designation</dt>
                <dd><strong>{currentDesignation}</strong></dd>
              </div>
              <div>
                <dt>Joined</dt>
                <dd>{formatDate(reporter.joinedAt)}</dd>
              </div>
              <div>
                <dt>Aadhar</dt>
                <dd>{reporter.aadharNumber || '—'}</dd>
              </div>
              <div>
                <dt>Articles</dt>
                <dd>{reporterArticles.length}</dd>
              </div>
              <div>
                <dt>Earnings</dt>
                <dd>{currency.format(reporter.totalEarnings || 0)}</dd>
              </div>
            </dl>
          </section>
        </aside>

        <div className="reporter-main">
          <section className="panel action-panel">
            <header>
              <span className="eyebrow">Account decisions</span>
              <h2>Administrative controls</h2>
            </header>
            <div className="action-grid">
              {reporter.requestStatus === 'pending' ? (
                <>
                  <Button onClick={() => setFeeDialog(true)}>
                    <ShieldCheck size={17} /> Set joining fee
                  </Button>
                  <Button variant="secondary" onClick={() => setRejectDialog(true)}>
                    <X size={17} /> Reject request
                  </Button>
                </>
              ) : null}
              {reporter.requestStatus === 'rejected' ? (
                <Button
                  onClick={() =>
                    void run('reconsider', () =>
                      patchReporter({ id: reporter.id, patch: { requestStatus: 'pending' } }),
                    )
                  }
                  loading={busy === 'reconsider'}
                >
                  <RotateCcw size={17} /> Reconsider
                </Button>
              ) : null}
              {['awaiting_payment', 'payment_submitted'].includes(reporter.requestStatus) ? (
                <Button
                  onClick={() =>
                    void run('confirm', async () => {
                      await updateJoiningFee({
                        payment:
                          reporterPayments.find((payment) => payment.purpose === 'joining_fee') ??
                          syntheticPayment(),
                        status: 'paid',
                      });
                      await notify(
                        'Account Approved',
                        'Your joining fee is confirmed and your reporter account is active.',
                      );
                    })
                  }
                  loading={busy === 'confirm'}
                >
                  <Check size={17} /> Confirm payment
                </Button>
              ) : null}
              {reporter.requestStatus === 'approved' ? (
                <Button
                  variant={reporter.isActive ? 'secondary' : 'primary'}
                  onClick={() =>
                    void run('active', async () => {
                      await patchReporter({ id: reporter.id, patch: { isActive: !reporter.isActive } });
                      await notify(
                        reporter.isActive ? 'Account Suspended' : 'Account Activated',
                        reporter.isActive
                          ? 'Your reporter account has been suspended by an administrator.'
                          : 'Your reporter account is active again.',
                      );
                    })
                  }
                  loading={busy === 'active'}
                >
                  {reporter.isActive ? <Ban size={17} /> : <Check size={17} />}
                  {reporter.isActive ? 'Suspend account' : 'Activate account'}
                </Button>
              ) : null}
              <Button
                variant="danger"
                onClick={() => {
                  if (window.confirm(`Delete ${reporter.name}'s account?`)) {
                    void run('delete', async () => {
                      await removeReporter({ id: reporter.id });
                      navigate('/reporters');
                    });
                  }
                }}
                loading={busy === 'delete'}
              >
                <Trash2 size={17} /> Delete account
              </Button>
            </div>
          </section>

          <section className="panel">
            <header>
              <span className="eyebrow">Publishing record</span>
              <h2>Recent articles</h2>
            </header>
            <div className="compact-list">
              {reporterArticles.slice(0, 6).map((article) => (
                <Link to={`/articles/${article.id}`} key={article.id}>
                  <span>
                    <strong>{plainRichText(article.title)}</strong>
                    <small>{formatDate(article.createdAt)}</small>
                  </span>
                  <StatusBadge value={article.status} />
                </Link>
              ))}
              {!reporterArticles.length ? <p className="muted">No articles submitted.</p> : null}
            </div>
          </section>

          <section className="panel">
            <header>
              <span className="eyebrow">Transactions</span>
              <h2>Payment history</h2>
            </header>
            <div className="compact-list">
              {reporterPayments.map((payment) => (
                <div key={payment.id}>
                  <span>
                    <strong>{currency.format(payment.amount)}</strong>
                    <small>
                      {formatDate(payment.createdAt)} · {payment.method}
                    </small>
                  </span>
                  <StatusBadge value={payment.status} />
                </div>
              ))}
              {!reporterPayments.length ? <p className="muted">No payment records.</p> : null}
            </div>
          </section>
        </div>
      </div>

      {/* Designation Modal */}
      {designationDialog ? (
        <Dialog title="Set Reporter Designation" onClose={() => setDesignationDialog(false)}>
          <div className="dialog-body">
            <p className="dialog-subtext">
              Assign the official editorial title/designation to <strong>{reporter.name}</strong>. This title will appear prominently on the press identity card and public credentials.
            </p>

            <label className="mt-3">
              Official Designation / Role Title
              <input
                type="text"
                value={designationInput}
                onChange={(e) => setDesignationInput(e.target.value)}
                placeholder="e.g. Senior Reporter, Bureau Chief"
                maxLength={60}
              />
            </label>

            <div className="dialog-actions">
              <Button variant="secondary" onClick={() => setDesignationDialog(false)}>
                Cancel
              </Button>
              <Button
                disabled={!designationInput.trim()}
                loading={busy === 'designation'}
                onClick={() => void saveDesignation()}
              >
                Save Designation
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}

      {feeDialog ? (
        <Dialog title="Set joining fee" onClose={() => setFeeDialog(false)}>
          <div className="dialog-body">
            <label>
              Amount in rupees
              <input
                type="number"
                min="1"
                value={fee}
                onChange={(event) => setFee(event.target.value)}
                placeholder="500"
              />
            </label>
            <div className="dialog-actions">
              <Button variant="secondary" onClick={() => setFeeDialog(false)}>
                Cancel
              </Button>
              <Button disabled={Number(fee) <= 0} loading={busy === 'fee'} onClick={() => void requestFee()}>
                Send fee request
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}

      {rejectDialog ? (
        <Dialog title="Reject application" onClose={() => setRejectDialog(false)}>
          <div className="dialog-body">
            <label>
              Reason
              <textarea rows={5} value={reason} onChange={(event) => setReason(event.target.value)} />
            </label>
            <div className="dialog-actions">
              <Button variant="secondary" onClick={() => setRejectDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={!reason.trim()}
                loading={busy === 'reject'}
                onClick={() => void reject()}
              >
                Reject request
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}

      {photoPreview && photoSource ? (
        <div
          className="photo-viewer"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPhotoPreview(false);
          }}
        >
          <section
            className="photo-viewer-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={`${reporter.name}'s photo`}
          >
            <header>
              <div>
                <strong>{reporter.name}</strong>
                <span>Reporter photo</span>
              </div>
              <button
                type="button"
                onClick={() => void downloadReporterPhoto()}
                disabled={busy === 'download-photo'}
                aria-label="Download reporter photo"
                title="Download"
              >
                <Download />
              </button>
              <button
                type="button"
                onClick={() => setPhotoPreview(false)}
                aria-label="Close photo preview"
                title="Close"
              >
                <X />
              </button>
            </header>
            <div className="photo-viewer-image">
              <img
                src={photoSource}
                alt={reporter.name}
                referrerPolicy="no-referrer"
                onError={() =>
                  setPhotoSource((current) => (current !== reporter.avatar ? reporter.avatar : ''))
                }
              />
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
