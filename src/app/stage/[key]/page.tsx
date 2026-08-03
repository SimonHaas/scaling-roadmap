import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { loadPlacement, loadProgress } from '@/lib/progress';
import { STAGES } from '@/data/roadmap';

export default async function StagePage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const user = await currentUser();
  if (!user) redirect('/');

  // hand-typed /stage/5 means /stage/05
  if (/^\d$/.test(key)) redirect(`/stage/0${key}`);
  const stage = STAGES[key];
  if (!stage) notFound();

  const placement = await loadPlacement(user.id);
  const yours = placement?.stage === stage.n;
  const behind = (placement?.stage ?? 0) > stage.n;
  const progress = await loadProgress(user.id, stage.n);
  const statusOf = (stepId: string) => {
    const row = progress.find((r) => r.stepId === stepId);
    if (row?.status === 'done') return 'Done';
    if (row) return 'Started';
    if (behind) return 'Done by placement';
    return '';
  };

  return (
    <main className="wrap section stack s5">
      <div className="stack s3">
        <span className="label">
          <a href="/dashboard" style={{ textDecoration: 'none' }}>Dashboard</a>
          {' / '}Stage {stage.key}
        </span>
        
        <div className="stagebar">
          <span className="n">Stage {stage.n}:</span>
          <span className="nm">{stage.name}</span>
        </div>
        <dl className="specs">
          <dt>Headcount</dt><dd>{stage.snapshot.headcount}</dd>
          <dt>Your role</dt><dd>{stage.snapshot.role}</dd>
          <dt>Leadership structure</dt><dd>{stage.snapshot.structure}</dd>
          <dt># of companies here</dt><dd>{stage.snapshot.companies}</dd>
        </dl>
        {yours ? (
          <div className="note">
            <p className="tiny">This is the stage you are on. Work it from the dashboard.</p>
          </div>
        ) : null}
      </div>

      

      <div className="pair">
        <div className="stack s1">
          <span className="label">The constraint</span>
          <p style={{ fontSize: "1.04rem", padding: "12px 0 0" }}>{stage.bottom.constraint}</p>
        </div>
        <div className="stack s1">
          <span className="label">To graduate</span>
          <p style={{ fontSize: "1.04rem", padding: "12px 0 0" }}>{stage.bottom.graduate}</p>
        </div>
      </div>

      <div className="stack s2">
        <span className="label">If you only do one thing at this stage</span>
        <p className="body" style={{ fontSize: '1.06rem' }}>{stage.graduation.theOneThing}</p>
      </div>

      

      <div className="stack s3">
        <span className="label">The eight functions, as printed in the guide</span>
        <div className="cwrap">
          <table className="cgrid">
            <thead>
              <tr>
                <th scope="col">Function</th>
                <th scope="col">Constraint</th>
                <th scope="col">To graduate</th>
              </tr>
            </thead>
            <tbody>
              {stage.rows.map((r, i) => {
                const step = stage.steps[i];
                const st = step ? statusOf(step.id) : '';
                return (
                  <tr key={r.function}>
                    <th scope="row">
                      {step ? (
                        <a href={`/step/${step.id}`} style={{ color: 'inherit' }}>
                          {r.function}
                          {st ? <span style={{ display: 'block', fontSize: '0.6rem', opacity: 0.85 }}>{st}</span> : null}
                        </a>
                      ) : r.function}
                    </th>
                    <td dangerouslySetInnerHTML={{ __html: r.constraint }} />
                    <td dangerouslySetInnerHTML={{ __html: r.graduate }} />
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Bottom line</th>
                <td>{stage.bottom.constraint}</td>
                <td>{stage.bottom.graduate}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </main>
  );
}
