import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { AlertCircle, ArrowRight, LockKeyhole, Newspaper } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { Button } from '../components/ui';
import { ADMIN_EMAIL, auth } from '../lib/firebase';
import { errorMessage } from '../lib/utils';

export function LoginPage() {
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      if (credential.user.email?.toLowerCase() !== ADMIN_EMAIL) {
        await signOut(auth);
        throw new Error('This account does not have administrator access.');
      }
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-identity">
        <img src="/app-logo.png" alt="Education News" />
        <div>
          <span className="eyebrow">Editorial operations</span>
          <h1>The newsroom,<br />under control.</h1>
          <p>Review stories, verify reporters, reconcile payments, and prepare each issue from one focused workspace.</p>
        </div>
        <div className="login-stat"><Newspaper /><span><strong>Education News</strong>Administration portal</span></div>
      </section>
      <section className="login-form-wrap">
        <form className="login-form" onSubmit={submit}>
          <div className="login-mark"><LockKeyhole /></div>
          <span className="eyebrow">Restricted access</span>
          <h2>Sign in to Admin</h2>
          <p>Use the administrator account registered with Education News.</p>
          {error ? <div className="form-error"><AlertCircle size={17} />{error}</div> : null}
          <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required /></label>
          <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
          <Button type="submit" loading={loading}>Continue <ArrowRight size={17} /></Button>
        </form>
      </section>
    </main>
  );
}
