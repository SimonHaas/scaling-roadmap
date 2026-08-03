import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { loadAllProgress, loadPlacement } from '@/lib/progress';
import { allStages } from '@/lib/placement';

/* The one view the ten PDFs structurally cannot give: every function's whole
   journey, stage 0 to 9, with your own state on every cell. Each guide only
   carries a three-stage window; software can show the ladder side-on. */

const FUNCTIONS = [
  'PRODUCT', 'MARKETING', 'SALES', 'CUSTOMER SERVICE',
  'INFORMATION TECH (IT)', 'RECRUITING', 'HUMAN RESOURCES (HR)', 'FINANCE',
];

export default async function MapPage() {
  const user = await currentUser();
  if (!user) redirect('/?signedout=1');

  const placement = await loadPlacement(user.id);
  if (!placement || placement.stage === null) redirect('/start');
  const placedAt = placement.stage;

  const stages = allStages();
  const rows = await loadAllProgress(user.id);
  const byStep = new Map(rows.map((r) => [r.stepId, r]));

  const cell = (stageN: number, fnIndex: number) => {
    const step = stages[stageN].steps[fnIndex];
    if (!step) return null;
    const row = byStep.get(step.id);
    const state =
      row?.status === 'done' ? 'done'
      : row ? 'started'
      : stageN < placedAt ? 'placed'
      : stageN === placedAt ? 'open'
      : 'ahead';
    return { step, state };
  };

  return (
    <main className="wrap section stack s4">
      <div className="stack s3">
        <span className="label">
          <a href="/dashboard" style={{ textDecoration: 'none' }}>&larr; Dashboard</a>
          {' / '}The whole map
        </span>
        <div className="stagebar" style={{ display: 'block' }}>
          <span className="n" style={{ display: 'block' }}>Every function,</span>
          <span className="nm" style={{ display: 'block' }}>every stage</span>
        </div>
        <p className="lede">
          Each guide only shows a three-stage window. This is the ladder side-on: one row per part
          of the business, one column per stage, your own state in every cell. Click any cell to
          read or work that step.
        </p>
        <p className="tiny">
          <span className="mapkey" data-k="done" /> done &nbsp;
          <span className="mapkey" data-k="started" /> started &nbsp;
          <span className="mapkey" data-k="placed" /> done by placement &nbsp;
          <span className="mapkey" data-k="open" /> your stage &nbsp;
          <span className="mapkey" data-k="ahead" /> ahead
        </p>
      </div>

      <div className="cwrap">
        <table className="mapgrid">
          <thead>
            <tr>
              <th scope="col" aria-label="Function" />
              {stages.map((s) => (
                <th scope="col" key={s.key} data-here={s.n === placedAt ? '1' : undefined}>
                  <a href={`/stage/${s.key}`} title={s.name}>{s.key}</a>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FUNCTIONS.map((fn, fi) => (
              <tr key={fn}>
                <th scope="row">{fn.replace(' (IT)', '').replace(' (HR)', '')}</th>
                {stages.map((s) => {
                  const c = cell(s.n, fi);
                  return (
                    <td key={s.key} data-here={s.n === placedAt ? '1' : undefined}>
                      {c ? (
                        <a
                          className="mapcell"
                          data-s={c.state}
                          href={`/step/${c.step.id}`}
                          title={`${s.name}: ${c.step.title}`}
                          aria-label={`Stage ${s.key} ${fn}: ${c.step.title}`}
                        />
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="tiny body">
        The jagged edge is the point: the roadmap&apos;s rule places you at the earliest stage with
        unfinished work, so a business that is ahead on product and behind on money shows exactly
        that shape here.
      </p>
    </main>
  );
}
