'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { savePlacement } from '@/app/actions';
import type { Question } from '@/data/roadmap';
import { place } from '@/lib/placement';
import SubmitButton from './SubmitButton';

export default function PlacementForm({
  questions,
  saved,
  uid,
}: {
  questions: Question[];
  saved: Record<string, number>;
  uid: string;
}) {
  const [state, action] = useActionState(savePlacement, undefined);
  const [answers, setAnswers] = useState<Record<string, number>>(saved);
  const topRef = useRef<HTMLDivElement>(null);
  const draftKey = `rm-place-${uid}`;

  /* Server-action redirects restore focus onto the submit button, which lands
     a fresh visitor at the BOTTOM of a long page. Start at the start. */
  useEffect(() => {
    window.scrollTo(0, 0);
    topRef.current?.focus();
  }, []);

  /* Picks survive a refresh. The saved DB answers win over the local draft. */
  useEffect(() => {
    if (Object.keys(saved).length) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft && typeof draft === 'object') setAnswers(draft);
      }
    } catch { /* a bad draft never blocks the form */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try { localStorage.setItem(draftKey, JSON.stringify(answers)); }
    catch { /* fine */ }
  }, [answers, draftKey]);

  const live = place(answers);
  const unanswered = questions.filter((q) => answers[q.id] === undefined);

  return (
    <form action={action} className="stack s6">
      <div ref={topRef} tabIndex={-1} aria-hidden="true" />
      {state?.error ? <p className="err">{state.error}</p> : null}

      {questions.map((q, qi) => (
        <fieldset key={q.id} id={`q-${q.id}`} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
          <legend style={{ padding: 0, marginBottom: 'var(--s3)' }}>
            <span className="label">
              Question {qi + 1} of {questions.length}
              {' · '}
              {q.kind === 'working' ? 'Where this part actually is' : 'How the company is built'}
            </span>
            <span className="display d3" style={{ display: 'block', marginTop: 'var(--s2)' }}>{q.q}</span>
          </legend>

          <div className="choices">
            {q.opts.map((o) => (
              <label className="choice" key={`${q.id}-${o.stage}-${o.label}`}>
                <input
                  type="radio"
                  name={q.id}
                  value={o.stage}
                  checked={answers[q.id] === o.stage}
                  onChange={() => setAnswers((a) => ({ ...a, [q.id]: o.stage }))}
                />
                <span className="txt">
                  {o.label}
                  {o.note ? <span className="sub">{o.note}</span> : null}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      {/* the counter travels with you down the page */}
      <div className="placebar">
        <div className="rowline" style={{ justifyContent: 'space-between', padding: '10px 0' }}>
          <span className="tiny" aria-live="polite">
            {live.answered} of {questions.length} answered
            {live.complete ? `. This places you on stage ${String(live.stage).padStart(2, '0')}.` : ''}
          </span>
          <SubmitButton
            label={live.complete ? 'Place me on the roadmap' : `Answer all ${questions.length} to continue`}
            pendingLabel="Placing you…"
            disabled={!live.complete}
          />
        </div>
        {!live.complete && unanswered.length <= 3 ? (
          <p className="tiny" style={{ paddingBottom: 10, margin: 0 }}>
            Still open:{' '}
            {unanswered.map((q, i) => (
              <span key={q.id}>
                {i > 0 ? ' · ' : ''}
                <a
                  href={`#q-${q.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(`q-${q.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                >
                  {q.q}
                </a>
              </span>
            ))}
          </p>
        ) : null}
      </div>
    </form>
  );
}
