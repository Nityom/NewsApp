import { useQuery } from 'convex/react';
import { CheckCircle2, Download, Mail, MapPin, Phone, Printer, Share2, ShieldCheck, UserRound, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { LoadingState } from '../components/ui';
import { api } from '../lib/api';
import { downloadReporterIdCard } from '../lib/exportIdCard';
import { formatDate } from '../lib/utils';
import type { Reporter } from '../types';

export function PublicReporterCardPage() {
  const { id = '' } = useParams();
  const reporter = useQuery(api.reporters.getPublicCard, { id });
  const [photoSource, setPhotoSource] = useState('');
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (reporter) {
      setPhotoSource(reporter.photo || reporter.avatar || '');
    }
  }, [reporter]);

  if (reporter === undefined) {
    return (
      <div className="public-card-container">
        <LoadingState />
      </div>
    );
  }

  if (!reporter) {
    return (
      <div className="public-card-container">
        <div className="public-card-box not-found">
          <XCircle size={48} className="text-danger" />
          <h1>Press Credential Not Found</h1>
          <p>The requested reporter credential with ID <code>{id}</code> could not be found or has been revoked.</p>
          <a href="/" className="button button-secondary">Go to Homepage</a>
        </div>
      </div>
    );
  }

  const publicUrl = window.location.href;
  const isActive = Boolean(reporter.isActive);
  const designation = reporter.designation || 'News Reporter';

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${reporter.name} - Press Identity Card`,
          text: `Official Education News Press ID Card for ${reporter.name} (${designation})`,
          url: publicUrl,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await downloadReporterIdCard(reporter as Reporter);
    } catch (err) {
      console.error('Failed to download ID card', err);
      alert('Could not generate the ID card image. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="public-card-page">
      {/* Top Banner */}
      <header className="public-card-masthead">
        <div className="masthead-inner">
          <div className="masthead-brand">
            <img src="/app-logo.png" alt="Education News" className="masthead-logo" />
            <div>
              <strong>EDUCATION NEWS</strong>
              <span>OFFICIAL PRESS CREDENTIAL VERIFICATION SYSTEM</span>
            </div>
          </div>
          <div className={`verification-pill ${isActive ? 'verified' : 'unverified'}`}>
            {isActive ? <ShieldCheck size={16} /> : <XCircle size={16} />}
            <span>{isActive ? 'OFFICIALLY VERIFIED & ACTIVE' : 'INACTIVE / REVOKED'}</span>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="public-card-main">
        <div className="public-card-column">
          {/* Official Press Card */}
          <section className="press-id-card public-press-card" id="press-card-printable">
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
                <div className="profile-photo">
                  <img
                    src={photoSource}
                    alt={reporter.name}
                    referrerPolicy="no-referrer"
                    onError={() => setPhotoSource((curr) => (curr !== reporter.avatar ? reporter.avatar : ''))}
                  />
                </div>
              ) : (
                <div className="profile-photo">
                  <UserRound />
                </div>
              )}
              <div className="press-id-name">
                <h2>{reporter.name}</h2>
                <span className="press-id-designation-badge">{designation}</span>
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
              <span className={`press-id-status ${isActive ? 'active' : ''}`}>
                <span className={`press-id-dot ${isActive ? 'active' : ''}`} />
                {isActive ? 'ACTIVE CREDENTIAL' : 'INACTIVE CREDENTIAL'}
              </span>
              <strong>educationnews.com</strong>
            </footer>
          </section>

          {/* Quick Actions */}
          <div className="public-card-actions no-print">
            <button
              type="button"
              className="button button-primary"
              onClick={() => void handleDownload()}
              disabled={downloading}
            >
              <Download size={16} /> {downloading ? 'Generating...' : 'Download ID Card (PNG)'}
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => void handleShare()}
            >
              {copied ? <CheckCircle2 size={16} color="#1e8b52" /> : <Share2 size={16} />}
              {copied ? 'Link Copied to Clipboard!' : 'Share Public Link'}
            </button>
            <button
              type="button"
              className="button button-ghost"
              onClick={handlePrint}
              title="Print ID Card"
            >
              <Printer size={16} /> Print
            </button>
          </div>
        </div>

        {/* Verification Summary Details */}
        <div className="public-details-column no-print">
          <div className="panel public-details-panel">
            <header className="panel-header">
              <span className="eyebrow">Public Credential Record</span>
              <h2>Journalist Details</h2>
            </header>

            <dl className="credential-meta-list">
              <div>
                <dt>Full Name</dt>
                <dd><strong>{reporter.name}</strong></dd>
              </div>
              <div>
                <dt>Official Designation</dt>
                <dd className="badge-inline">{designation}</dd>
              </div>
              <div>
                <dt>Reporter Identification Number</dt>
                <dd><code>{reporter.reporterCode || reporter.id}</code></dd>
              </div>
              <div>
                <dt>Accreditation Status</dt>
                <dd className={isActive ? 'text-success' : 'text-danger'}>
                  <strong>{isActive ? 'Active Accredited Reporter' : 'Inactive / Under Review'}</strong>
                </dd>
              </div>
              <div>
                <dt>Member Since</dt>
                <dd>{formatDate(reporter.joinedAt)}</dd>
              </div>
              <div>
                <dt>Reporting Jurisdiction</dt>
                <dd>{[reporter.village, reporter.city].filter(Boolean).join(', ') || 'General Bureau'}</dd>
              </div>
            </dl>

            <div className="public-card-notice">
              <ShieldCheck size={20} className="notice-icon" />
              <p>
                This public identity card verifies that the individual named above is an accredited media contributor for <strong>Education News</strong>. For verification inquiries, contact the central editorial desk.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="public-card-footer no-print">
        <p>© {new Date().getFullYear()} Education News. Official Press & Media Identity System.</p>
      </footer>
    </div>
  );
}
