import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { allStages } from '@/lib/placement';
import AuthForms from '@/components/AuthForms';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ signedout?: string; back?: string; mode?: string }>;
}) {
  const sp = await searchParams;
  if (await currentUser()) redirect(sp.back && /^\/(dashboard|start|step\/[a-z0-9-]+|stage\/\d{2})$/.test(sp.back) ? sp.back : '/dashboard');
  const stages = allStages();

  return (
    <main className="wrap section stack s5">
      {/* the cover lockup from the guides */}
      <div className="stagebar" style={{ display: 'block' }}>
        <span className="n" style={{ display: 'block' }}>$100M Scaling</span>
        <span className="nm" style={{ display: 'block' }}>Roadmap</span>
      </div>

      <div className="splitwide">
        <div className="stack s4">
          <div className="stack s3">
            <span className="label on">Ten stages &middot; zero to nine</span>
            <h1 className="display d1">Stop reading the roadmap. Start working it.</h1>
            <p className="lede">
              Every stage names the one constraint holding your business back, and the one action
              that gets you out of it. This finds your stage, hands you a single step at a time,
              and checks your work before it lets you move up.
            </p>
            <a className="btn" href="#get-started" style={{ alignSelf: 'flex-start' }}>
              Find my stage
            </a>
          </div>

          <ol className="numbered">
            <li>
              <div className="stack s1">
                <h3 className="display d3">Answer five questions</h3>
                <p className="tiny">
                  It places you using the roadmap&apos;s own rule: you are in the earliest stage
                  whose graduation action is not done yet, no matter how big your headcount looks.
                </p>
              </div>
            </li>
            <li>
              <div className="stack s1">
                <h3 className="display d3">Get one step, not eighty</h3>
                <p className="tiny">
                  Your stage has eight parts, one for each side of the business. You see the one you
                  are on and what done actually means.
                </p>
              </div>
            </li>
            <li>
              <div className="stack s1">
                <h3 className="display d3">Write down what you did</h3>
                <p className="tiny">It saves. Come back next week and it knows where you left off.</p>
              </div>
            </li>
            <li>
              <div className="stack s1">
                <h3 className="display d3">It checks you before you advance</h3>
                <p className="tiny">
                  Clear all eight and you graduate. Miss two and it names the two and what is still
                  missing.
                </p>
              </div>
            </li>
          </ol>
        </div>

        <aside className="stack s4">
          <div className="stack s3" id="get-started">
            <span className="label">Get started</span>
            <AuthForms startMode={sp.signedout || sp.mode === 'signin' ? 'login' : undefined} signedOut={!!sp.signedout} backTo={sp.back} />
          </div>

          <div className="stack s2">
            <span className="label">The ladder</span>
            <div className="ladder">
              {stages.slice().reverse().map((s) => (
                <div className="rung" key={s.key}>
                  <span className="num">{s.key}</span>
                  <span className="nm">{s.name}</span>
                  <span className="meta">{s.snapshot.headcount}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
