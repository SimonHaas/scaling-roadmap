'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { saveStep, type StepResult } from '@/app/actions';
import type { Step } from '@/data/roadmap';
import { gradeStep, type ProgressRow, type Review } from '@/lib/grade';
import MicButton from './MicButton';
import SubmitButton from './SubmitButton';

type NextStep = { id: string; title: string; fn: string } | null;

export default function StepForm({
  step,
  stage,
  saved,
  readOnly,
  lockReason,
  nextStep,
  stageCleared,
  uid,
}: {
  step: Step;
  stage: number;
  saved: ProgressRow | null;
  readOnly: boolean;
  lockReason: string | null;
  nextStep: NextStep;
  stageCleared: boolean;
  uid: string;
}) {
  const [state, action, pending] = useActionState(saveStep, undefined);
  const [checked, setChecked] = useState<number[]>(saved?.checked ?? []);
  const [evidence, setEvidence] = useState(saved?.evidence ?? '');
  const [draftRestored, setDraftRestored] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const verdictRef = useRef<HTMLDivElement>(null);
  const draftKey = `rm-draft-${uid}-${step.id}`;

  /* The submitted result beats the page's stale props: the moment the server
     answers, the verdict shows and the ticks stay exactly as submitted. */
  const fresh = state && 'ok' in state ? state : null;
  const status = fresh ? fresh.status : saved?.status ?? null;
  const review: Review | null = fresh ? fresh.review : saved?.review ?? null;
  const savedDone = status === 'done';
  const everSaved = !!fresh || !!saved;

  useEffect(() => {
    if (!fresh) return;
    setChecked(fresh.checked);
    setEvidence(fresh.evidence);
    if (textRef.current) textRef.current.value = fresh.evidence;
    // the verdict must be seen where the thumb is, especially on a phone
    verdictRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (fresh.status === 'done') { try { localStorage.removeItem(draftKey); } catch { /* fine */ } }
  }, [fresh, draftKey]);

  /* A half-written answer must survive navigating away. Kept on this device,
     scoped to this account; cleared on acceptance and on sign-out. */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft.evidence && !saved?.evidence) {
        setEvidence(draft.evidence);
        if (textRef.current) textRef.current.value = draft.evidence;
        setDraftRestored(true);
      }
      if (Array.isArray(draft.checked) && !saved?.checked?.length) setChecked(draft.checked);
    } catch { /* a bad draft never blocks the form */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (readOnly || savedDone) return;
    try { localStorage.setItem(draftKey, JSON.stringify({ evidence, checked })); }
    catch { /* storage full or blocked: typing still works */ }
  }, [evidence, checked, savedDone, draftKey, readOnly]);

  const live = gradeStep(step, checked, evidence);

  const submittedVerdict = everSaved
    ? gradeStep(step, fresh ? fresh.checked : saved!.checked, fresh ? fresh.evidence : saved!.evidence)
    : null;
  const rejected = everSaved && !savedDone;
  const nothingRecorded =
    rejected && !(fresh ? fresh.evidence : saved?.evidence)?.trim() &&
    !(fresh ? fresh.checked : saved?.checked ?? []).length;
  const rejectionNote = nothingRecorded
    ? 'Nothing recorded yet. Tick what is true and answer the question.'
    : review?.verdict === 'needs_work' && review.note
      ? review.note
      : submittedVerdict?.evidenceProblem
        ? submittedVerdict.evidenceProblem
        : submittedVerdict?.missingChecks.length
          ? `${submittedVerdict.missingChecks.length} of the ${step.doneWhen.length} conditions are not ticked yet.`
          : 'Saved, but this is not done yet.';
  const rejectionList = nothingRecorded
    ? []
    : review?.verdict === 'needs_work' && review.missing.length
      ? review.missing
      : (submittedVerdict?.missingChecks ?? []);

  const toggle = (i: number, on: boolean) =>
    setChecked((c) => (on ? [...new Set([...c, i])] : c.filter((x) => x !== i)));

  return (
    <form action={action} className="stack s5">
      <input type="hidden" name="stepId" value={step.id} />
      <input type="hidden" name="stage" value={stage} />
      <input type="hidden" name="backTo" value={`/step/${step.id}`} />
      {state && 'error' in state && state.error ? <p className="err">{state.error}</p> : null}

      {/* the verdict lives in one announced region, accept or reject */}
      <div ref={verdictRef} role="status" aria-live="polite" className="stack s3">
        {savedDone ? (
          <div className="focusblock stack s3" style={{ borderColor: 'var(--good)' }}>
            <span className="tag" style={{ background: 'var(--good)' }}>This part is done</span>
            <p className="tiny" style={{ color: 'var(--navy)' }}>
              {review?.note || 'Saved and recorded.'}
            </p>
            {nextStep ? (
              <div className="stack s1">
                <span className="label">Up next &middot; {nextStep.fn}</span>
                <a className="btn" href={`/step/${nextStep.id}`} style={{ alignSelf: 'flex-start' }}>
                  Next: {nextStep.title}
                </a>
              </div>
            ) : stageCleared ? (
              <div className="stack s1">
                <span className="label" style={{ color: 'var(--good)' }}>That was the last part</span>
                <a className="btn" href="/dashboard" style={{ alignSelf: 'flex-start' }}>
                  See your cleared stage
                </a>
              </div>
            ) : (
              <a className="btn" href="/dashboard" style={{ alignSelf: 'flex-start' }}>
                Back to the dashboard
              </a>
            )}
          </div>
        ) : null}

        {rejected ? (
          <div className="focusblock stack s2" style={{ borderColor: 'var(--warn)' }}>
            <span className="tag" style={{ background: 'var(--warn)' }}>Not quite done</span>
            <p style={{ fontSize: '0.98rem' }}>{rejectionNote}</p>
            {rejectionList.length ? (
              <ul className="plain">
                {rejectionList.map((m, i) => (
                  <li className="tiny" key={i}>{m}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>

      {readOnly && lockReason ? <p className="note tiny">{lockReason}</p> : null}

      <div className="stack s2">
        <span className="label">It counts as done when all of these are true</span>
        <div className="choices">
          {step.doneWhen.map((d, i) => (
            <label className="choice" key={i}>
              <input
                type="checkbox"
                name={`check-${i}`}
                checked={checked.includes(i)}
                disabled={readOnly}
                onChange={(e) => toggle(i, e.currentTarget.checked)}
              />
              <span className="txt">{d}</span>
            </label>
          ))}
        </div>
        {live.missingChecks.length && !readOnly ? (
          <p className="tiny">
            {live.missingChecks.length} of {step.doneWhen.length} not ticked yet.
          </p>
        ) : null}
      </div>

      <div className="stack s2">
        <label className="field">
          <span className="label">Write down what you actually did</span>
          <p className="tiny" style={{ marginBottom: 'var(--s1)' }}>{step.evidencePrompt}</p>
          <textarea
            ref={textRef}
            name="evidence"
            defaultValue={evidence}
            disabled={readOnly || pending}
            onChange={(e) => setEvidence(e.currentTarget.value)}
            placeholder="Specifics. Real numbers, real names, real tools."
            maxLength={8000}
          />
        </label>
        {!readOnly ? (
          <div className="rowline">
            <MicButton
              onText={(t) => {
                const el = textRef.current;
                if (!el) return;
                const joined = (el.value ? el.value.replace(/\s+$/, '') + ' ' : '') + t;
                el.value = joined;
                setEvidence(joined);
              }}
            />
            <span className="tiny" aria-live="polite">
              {draftRestored && !savedDone ? 'Draft restored from this device. ' : ''}
              {evidence && !savedDone ? 'Draft kept on this device.' : ''}
              {evidence.length >= 7000 ? ` ${evidence.length} of 8000 characters.` : ''}
            </span>
          </div>
        ) : null}
        {live.evidenceProblem && evidence.trim() && !readOnly ? (
          <p className="tiny" style={{ color: 'var(--warn)' }}>{live.evidenceProblem}</p>
        ) : null}
      </div>

      {!readOnly ? (
        <div className="stack s2">
          <div className="rowline">
            <SubmitButton
              label={savedDone ? 'Save changes' : 'Mark this done'}
              pendingLabel="Checking your answer…"
            />
            {pending ? (
              <span className="tiny" role="status" aria-live="polite">
                Reading what you wrote. Takes about ten seconds.
              </span>
            ) : null}
          </div>
          {!pending ? (
            <p className="tiny">
              {savedDone
                ? 'This is your record. Edit it any time; it gets re-checked the same way.'
                : 'Your answer is read before this is accepted. Vague answers come back with what is missing.'}
            </p>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
