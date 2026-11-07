import { useMutation, useQuery } from 'convex/react';
import { Save } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';

import { Button, LoadingState, PageHeader } from '../components/ui';
import { ADMIN_NAME, ADMIN_PHONE } from '../lib/admin';
import { api } from '../lib/api';
import { ADMIN_EMAIL } from '../lib/firebase';
import { errorMessage } from '../lib/utils';
import type { PublicationInfo } from '../types';

const PROFILE_KEY = 'education-news-admin-profile';

export function SettingsPage() {
  const publication = useQuery(api.settings.getPublicationInfo, {});
  const updatePublication = useMutation(api.settings.updatePublicationInfo);
  const [info, setInfo] = useState<PublicationInfo>({ year: '', issueNumber: '', price: '', pageLabel: '1' });
  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY) ?? '') as { name: string; phone: string }; }
    catch { return { name: ADMIN_NAME, phone: ADMIN_PHONE }; }
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (publication) {
      setInfo({
        year: publication.year || '',
        issueNumber: publication.issueNumber || '',
        price: publication.price || '',
        pageLabel: publication.pageLabel || '1',
      });
    }
  }, [publication]);
  if (publication === undefined) return <LoadingState />;

  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      await updatePublication({ info });
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      setMessage('Settings saved.');
    } catch (error) { setMessage(errorMessage(error)); } finally { setBusy(false); }
  }

  return (
    <div className="page settings-page">
      <PageHeader eyebrow="Configuration" title="Settings" description="Control newspaper issue metadata and administrator contact details." />
      <form className="settings-layout" onSubmit={save}>
        <section className="panel settings-section">
          <header>
            <span className="eyebrow">Masthead data</span>
            <h2>Publication information (नोंदणी तपशील)</h2>
            <p>These values define the yellow registration strip across all articles and Other Publications.</p>
          </header>
          <div className="form-grid">
            <label>
              वर्ष (Year)
              <input value={info.year} onChange={(event) => setInfo({ ...info, year: event.target.value })} placeholder="e.g. 3" required />
            </label>
            <label>
              अंक (Issue number)
              <input value={info.issueNumber} onChange={(event) => setInfo({ ...info, issueNumber: event.target.value })} placeholder="e.g. 38" required />
            </label>
            <label>
              पृष्ठ (Page / Default label)
              <input value={info.pageLabel ?? '1'} onChange={(event) => setInfo({ ...info, pageLabel: event.target.value })} placeholder="e.g. 1" />
            </label>
            <label>
              मूल्य (Price)
              <input value={info.price} onChange={(event) => setInfo({ ...info, price: event.target.value })} placeholder="e.g. निःशुल्क" required />
            </label>
          </div>
          <div
            style={{
              marginTop: '16px',
              background: '#ffe600',
              borderTop: '1px solid #000',
              borderBottom: '1px solid #000',
              padding: '7px 12px',
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '12px',
              color: '#000',
              letterSpacing: '0.02em',
              userSelect: 'none',
            }}
          >
            वर्ष : {info.year || '3'} &nbsp;|&nbsp; अंक : {info.issueNumber || '38'} &nbsp;|&nbsp; पृष्ठ : {info.pageLabel || '1'} &nbsp;|&nbsp; मूल्य : {info.price || 'निःशुल्क'}
          </div>
        </section>
        <section className="panel settings-section"><header><span className="eyebrow">Local profile</span><h2>Administrator details</h2><p>Stored in this browser, matching the mobile app’s device-local admin profile.</p></header><div className="form-grid"><label>Name<input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></label><label>Phone<input type="tel" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} /></label><label>Email<input value={ADMIN_EMAIL} disabled /></label></div></section>
        <div className="settings-save">{message ? <span className={message.includes('saved') ? 'success-message' : 'form-error'}>{message}</span> : null}<Button type="submit" loading={busy}><Save size={17} /> Save settings</Button></div>
      </form>
    </div>
  );
}
