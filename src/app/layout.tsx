import './globals.css';
import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import { currentUser } from '@/lib/auth';
import SignOutButton from '@/components/SignOutButton';

/* The guides embed exactly three cuts of Poppins, so this loads exactly those.
   Self-hosted at build time, no CDN request at runtime. */
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '600', '800'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'The $100M Scaling Roadmap',
  description:
    'Find the stage your business is on, then work one step at a time until you graduate to the next one.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <html lang="en" className={poppins.variable}>
      <body>
        {/* the running header from every page of the guides */}
        <header className="guidehead">
          <div className="wrap row">
            <a className="crumb" href={user ? '/dashboard' : '/'}>
              <b>$100M SCALING ROADMAP</b>
              <span className="v">&nbsp;&middot;&nbsp;INTERACTIVE</span>
            </a>
            <nav className="guidenav">
              {user ? (
                <>
                  <a href="/dashboard">Dashboard</a>
                  <a href="/start">Re-place me</a>
                  <SignOutButton />
                </>
              ) : (
                <a href="/?mode=signin#get-started">Sign in</a>
              )}
            </nav>
          </div>
        </header>

        {children}

        <footer className="site">
          <div className="wrap stack s2">
            <span className="mark">A CONCEPT BUILT ON THE $100M SCALING ROADMAP</span>
            <p>
              Every stage, constraint and graduation action here is transcribed from the ten free
              stage guides Acquisition.com publishes at acquisition.com/roadmap. Not affiliated
              with, endorsed by, or connected to Acquisition.com or Alex Hormozi.
            </p>
            <p>
              Built by August Turner. A concept demonstration: real accounts and saved progress,
              but no security review.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
