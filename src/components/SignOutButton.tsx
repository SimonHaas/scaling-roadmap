'use client';

import { logout } from '@/app/actions';

/** Signing out clears every locally kept draft first, so the next person on
    this device never sees what the last one typed. */
export default function SignOutButton() {
  return (
    <form
      action={logout}
      onSubmit={() => {
        try {
          for (const k of Object.keys(localStorage)) {
            if (k.startsWith('rm-draft-') || k.startsWith('rm-place-')) localStorage.removeItem(k);
          }
        } catch { /* storage blocked: sign-out still proceeds */ }
      }}
    >
      <button className="linkbtn" type="submit">Sign out</button>
    </form>
  );
}
