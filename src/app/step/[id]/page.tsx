import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { loadPlacement, loadProgress, loadStep } from '@/lib/progress';
import { gradeStage } from '@/lib/grade';
import { allStages } from '@/lib/placement';
import StepForm from '@/components/StepForm';

export default async function StepPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect(`/?signedout=1&back=${encodeURIComponent(`/step/${id}`)}`);

  const stage = allStages().find((s) => s.steps.some((x) => x.id === id));
  const step = stage?.steps.find((x) => x.id === id);
  if (!stage || !step) notFound();

  const placement = await loadPlacement(user.id);
  const placedAt = placement?.stage ?? 0;
  const row = await loadStep(user.id, id);
  const idx = stage.steps.findIndex((x) => x.id === id);
  const position = idx + 1;

  /* Ahead of you: read-only until you get there. Behind you: your record stays
     live and editable, because the placement rule assumed it done and a person
     is allowed to disagree with that. */
  const rel = stage.n === placedAt ? 'current' : stage.n < placedAt ? 'past' : 'future';
  const readOnly = rel === 'future';
  const lockReason =
    rel === 'future'
      ? `This stage is still ahead of you. Finish stage ${String(placedAt).padStart(2, '0')} first; you can read this any time.`
      : null;

  /* Where to send them when this part is done: the next part of this stage
     that still needs work, so finishing one step flows straight into the next. */
  const rows = await loadProgress(user.id, stage.n);
  const status = gradeStage(stage.n, rows);
  const nextOutstanding =
    rel === 'current'
      ? status.outstanding.map((o) => o.step).find((s) => s.id !== id) ?? null
      : null;
  const stageCleared = rel === 'current' && status.outstanding.every((o) => o.step.id === id);

  const prev = idx > 0 ? stage.steps[idx - 1] : null;
  const next = idx < stage.steps.length - 1 ? stage.steps[idx + 1] : null;

  return (
    <main className="wrap reading section stack s5">
      <div className="stack s3">
        <span className="label">
          <a href="/dashboard" style={{ textDecoration: 'none' }}>&larr; Dashboard</a>
          {' / '}Stage {stage.key} {stage.name} / part {position} of {stage.steps.length}
        </span>
        <span className="label on">{step.function}</span>
        <h1 className="display d2">{step.title}</h1>
      </div>

      {rel === 'past' && !row ? (
        <div className="note stack s1">
          <p className="tiny" style={{ color: 'var(--navy)' }}>
            Your placement marks stage {stage.key} as already behind you, so this part counts as
            done. If that is not actually true for your business, work it right here; what you
            save is recorded like any other step.
          </p>
        </div>
      ) : null}

      <div className="stack s2">
        <div className="stagebar" style={{ padding: '8px 14px' }}>
          <span className="label" style={{ color: '#fff' }}>What is going wrong</span>
        </div>
        <p style={{ fontSize: '1.06rem' }}>{step.theProblem}</p>
      </div>

      <div className="stack s2">
        <div className="stagebar" style={{ padding: '8px 14px', background: 'var(--violet)' }}>
          <span className="label" style={{ color: '#fff' }}>What to do</span>
        </div>
        <p className="body" style={{ fontSize: '1.06rem' }}>{step.whatToDo}</p>
      </div>

      <StepForm
        step={step}
        stage={stage.n}
        saved={row}
        readOnly={readOnly}
        lockReason={lockReason}
        nextStep={nextOutstanding ? { id: nextOutstanding.id, title: nextOutstanding.title, fn: nextOutstanding.function } : null}
        stageCleared={stageCleared}
        uid={user.id.slice(0, 8)}
      />

      {/* walk the eight parts in order without going back to the dashboard */}
      <nav className="partnav" aria-label="Parts of this stage">
        {prev ? (
          <a className="partlink" href={`/step/${prev.id}`}>
            <span className="label">&larr; Part {position - 1}</span>
            <span className="partname">{prev.title}</span>
          </a>
        ) : <span />}
        {next ? (
          <a className="partlink right" href={`/step/${next.id}`}>
            <span className="label">Part {position + 1} &rarr;</span>
            <span className="partname">{next.title}</span>
          </a>
        ) : <span />}
      </nav>
    </main>
  );
}
