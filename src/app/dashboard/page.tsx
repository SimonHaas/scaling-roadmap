import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { loadPlacement, loadProgress } from '@/lib/progress';
import { gradeStage } from '@/lib/grade';
import { allStages, stageOf } from '@/lib/placement';
import { advanceStage } from '../actions';
import LadderFocus from '@/components/LadderFocus';
import SubmitButton from '@/components/SubmitButton';

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ cleared?: string }>;
}) {
  const sp = await searchParams;
  const user = await currentUser();
  if (!user) redirect('/');

  const placement = await loadPlacement(user.id);
  if (!placement || placement.stage === null) redirect('/start');

  const stage = stageOf(placement.stage);
  const rows = await loadProgress(user.id, placement.stage);
  const status = gradeStage(placement.stage, rows);
  const byId = new Map(rows.map((r) => [r.stepId, r]));
  const pct = Math.round((status.doneCount / status.total) * 100);
  const next = String(stage.n + 1).padStart(2, '0');

  const gap =
    placement.shape_stage !== null &&
    placement.work_stage !== null &&
    placement.shape_stage !== placement.work_stage
      ? {
          lower: Math.min(placement.shape_stage, placement.work_stage),
          higher: Math.max(placement.shape_stage, placement.work_stage),
          behind: placement.work_stage < placement.shape_stage
            ? 'the work inside it' : 'the shape of the company',
        }
      : null;

  return (
    <main className="wrap section stack s5">
      {/* the guides' stage lockup */}
      <div className="stack s2">
        <h1 className="stagebar" style={{ margin: 0 }}>
          <span className="n">Stage {stage.n}:</span>
          <span className="nm">{stage.name}</span>
        </h1>
        {sp.cleared ? (
          <div className="note" role="status">
            <p className="tiny" style={{ color: 'var(--navy)' }}>
              You cleared stage {sp.cleared}. This is what changes now: the constraint becomes
              &ldquo;{stage.bottom.constraint}&rdquo;
            </p>
          </div>
        ) : null}
        <span className="label">Typical at this stage, from the guide</span>
        <dl className="specs">
          <dt>Headcount</dt><dd>{stage.snapshot.headcount}</dd>
          <dt>Your role</dt><dd>{stage.snapshot.role}</dd>
          <dt>Leadership structure</dt><dd dangerouslySetInnerHTML={{ __html: stage.snapshot.structure }} /> 
          <dt># of companies here</dt><dd dangerouslySetInnerHTML={{ __html: stage.snapshot.companies }} /> 
        </dl>
      </div>

      <div className="split">
        <aside className="stack s2">
          <span className="label">The ladder</span>
          <div className="ladder">
            {allStages().slice().reverse().map((s) => (
              <a
                className="rung"
                key={s.key}
                href={`/stage/${s.key}`}
                data-here={s.n === stage.n ? '1' : undefined}
                data-past={s.n < stage.n ? '1' : undefined}
                aria-current={s.n === stage.n ? 'step' : undefined}
              >
                <span className="num">{s.key}</span>
                <span className="nm">{s.name}</span>
                <span className="meta" aria-label={s.n < stage.n ? 'cleared' : undefined}>
                  {s.n === stage.n ? `${status.doneCount}/${status.total}` : s.n < stage.n ? '✓' : ''}
                </span>
              </a>
            ))}
          </div>
          <LadderFocus />
          <p className="tiny"><a href="/map">See the whole map: every function, every stage &rarr;</a></p>
        </aside>

        <div className="stack s4">
          <div className="pair">
            <div>
              <div className="stagebar" style={{ padding: '8px 14px' }}>
                <span className="label" style={{ color: '#fff' }}>The constraint</span>
              </div>
              <p style={{ padding: '14px 14px 0', fontSize: '1.06rem' }}>{stage.bottom.constraint}</p>
            </div>
            <div>
              <div className="stagebar" style={{ padding: '8px 14px', background: 'var(--violet)' }}>
                <span className="label" style={{ color: '#fff' }}>To graduate</span>
              </div>
              <p style={{ padding: '14px 14px 0', fontSize: '1.06rem' }}>{stage.bottom.graduate}</p>
            </div>
          </div>

          {gap ? (
            <div className="note">
              <p className="tiny" style={{ color: 'var(--navy)' }}>
                Your company is built like stage {gap.higher} but {gap.behind} is still at stage{' '}
                {gap.lower}. That gap is the constraint. Finish stage {gap.lower} before you spend
                anything on stage {gap.higher} problems.
              </p>
            </div>
          ) : null}

          <div className="stack s2">
            <div className="meter" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
            <p className="tiny">{status.doneCount} of {status.total} parts cleared on this stage</p>
          </div>

          {/* the one thing to do */}
          {status.nextStep ? (
            <div className="focusblock stack s3">
              <span className="tag">Do this next</span>
              <div className="stack s1">
                <span className="label on">{status.nextStep.function}</span>
                <h2 className="display d3">{status.nextStep.title}</h2>
              </div>
              <p className="body" style={{ fontSize: '0.98rem' }}>{status.nextStep.theProblem}</p>
              <div><a className="btn" href={`/step/${status.nextStep.id}`}>Open this step</a></div>
            </div>
          ) : (
            <div className="focusblock stack s3" style={{ borderColor: 'var(--good)' }}>
              <span className="tag" style={{ background: 'var(--good)' }}>Stage {stage.key} cleared</span>
              <h2 className="display d3">{stage.graduation.bottomLine}</h2>
              <p className="tiny">All eight parts are done and recorded.</p>
              {stage.n < 9 ? (
                <>
                  <p className="tiny">
                    Next up, stage {next} {stageOf(stage.n + 1).name}: the constraint becomes{' '}
                    &ldquo;{stageOf(stage.n + 1).bottom.constraint}&rdquo;{' '}
                    <a href={`/stage/${next}`}>Read it first</a> or move straight on.
                  </p>
                  <form action={advanceStage}>
                    <input type="hidden" name="from" value={stage.n} />
                    <SubmitButton label={`Move me to stage ${next}`} pendingLabel="Moving…" />
                  </form>
                </>
              ) : (
                <p className="tiny">Stage 09 is the last stage in the roadmap.</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="stack s3">
        <div className="stack s1">
          <span className="label">The eight parts of stage {stage.key}</span>
          <p className="tiny">Detail opens for the parts you have started.</p>
        </div>
        <div className="rows">
          {stage.steps.map((s) => {
            const row = byId.get(s.id);
            const done = row?.status === 'done';
            const started = !!row && !done;
            const state = done ? 'done' : started ? 'part' : undefined;
            const verdict = status.outstanding.find((o) => o.step.id === s.id)?.verdict;
            return (
              <a className="row" key={s.id} href={`/step/${s.id}`} data-s={state}>
                <span className="stripe" />
                <span className="stack s1">
                  <span className="label">{s.function}</span>
                  <span className="rowtitle">{s.title}</span>
                  {started && row?.review?.verdict === 'needs_work' && row.review.note ? (
                    <span className="tiny" style={{ color: 'var(--warn)' }}>{row.review.note}</span>
                  ) : started && verdict?.missingChecks.length ? (
                    <span className="tiny">Still needed: {verdict.missingChecks.join('. ')}</span>
                  ) : started && verdict?.evidenceProblem ? (
                    <span className="tiny">{verdict.evidenceProblem}</span>
                  ) : null}
                </span>
                <span className="rowstate">{done ? 'Done' : started ? 'Started' : 'Not started'}</span>
              </a>
            );
          })}
        </div>
      </div>
    </main>
  );
}
