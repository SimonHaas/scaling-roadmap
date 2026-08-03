'use client';

import { useActionState, useEffect, useState } from 'react';
import { login, signup } from '@/app/actions';
import SubmitButton from './SubmitButton';

export default function AuthForms({
  startMode,
  signedOut,
  backTo,
}: {
  startMode?: 'signup' | 'login';
  signedOut?: boolean;
  backTo?: string;
}) {
  const [tab, setTab] = useState<'signup' | 'login'>(startMode ?? 'signup');
  const [signupState, signupAction] = useActionState(signup, undefined);
  const [loginState, loginAction] = useActionState(login, undefined);

  /* "Sign in" links land with #sign-in or ?mode=signin; honor both. */
  useEffect(() => {
    if (startMode) return;
    if (window.location.hash === '#sign-in' || new URLSearchParams(window.location.search).get('mode') === 'signin') {
      setTab('login');
    }
  }, [startMode]);

  /* A signup that hits "already exists" flips to sign-in with the email kept. */
  const existing = signupState?.error?.includes('already has an account');

  const tabStyle = (t: typeof tab) => ({
    color: tab === t ? 'var(--violet)' : undefined,
    borderBottom: tab === t ? '2px solid var(--violet)' : '2px solid transparent',
    paddingBottom: 3,
  });

  return (
    <div className="stack s3">
      {signedOut ? (
        <p className="note tiny" role="status">
          You were signed out. Sign back in to continue; anything you typed is kept on this device.
        </p>
      ) : null}

      <div className="guidenav" role="tablist" aria-label="Create an account or sign in">
        <button className="linkbtn" role="tab" aria-selected={tab === 'signup'}
                style={tabStyle('signup')} onClick={() => setTab('signup')} type="button">
          New account
        </button>
        <button className="linkbtn" role="tab" aria-selected={tab === 'login'}
                style={tabStyle('login')} onClick={() => setTab('login')} type="button">
          Sign in
        </button>
      </div>

      {tab === 'signup' ? (
        <form action={signupAction} className="stack s3">
          {signupState?.error ? (
            <p className="err">
              {signupState.error}{' '}
              {existing ? (
                <button className="linkbtn" type="button" style={{ textDecoration: 'underline' }}
                        onClick={() => setTab('login')}>
                  Go to sign in
                </button>
              ) : null}
            </p>
          ) : null}
          <label className="field">
            <span className="label">Your email</span>
            <input type="email" name="email" autoComplete="email" required
                   defaultValue={signupState?.email ?? ''} />
          </label>
          <label className="field">
            <span className="label">Password, 8 characters or more</span>
            <input type="password" name="password" autoComplete="new-password" required minLength={8} />
          </label>
          <label className="field">
            <span className="label">Business name, optional</span>
            <input type="text" name="business" autoComplete="organization"
                   defaultValue={signupState?.business ?? ''} />
          </label>
          <div><SubmitButton label="Find my stage" pendingLabel="Creating your account…" /></div>
          <p className="tiny">Five questions next. About two minutes.</p>
        </form>
      ) : (
        <form action={loginAction} className="stack s3">
          {backTo ? <input type="hidden" name="back" value={backTo} /> : null}
          {loginState?.error ? <p className="err">{loginState.error}</p> : null}
          <label className="field">
            <span className="label">Your email</span>
            <input type="email" name="email" autoComplete="email" required
                   defaultValue={loginState?.email ?? signupState?.email ?? ''} />
          </label>
          <label className="field">
            <span className="label">Password</span>
            <input type="password" name="password" autoComplete="current-password" required />
          </label>
          <div><SubmitButton label="Sign in" pendingLabel="Signing you in…" /></div>
          <p className="tiny">No password recovery in this demo, so keep your password somewhere safe.</p>
        </form>
      )}
    </div>
  );
}
