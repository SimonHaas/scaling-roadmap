'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { sql } from '@/lib/db';
import {
  createSession, currentUser, endSession, hashPassword, validateSignup, verifyPassword,
} from '@/lib/auth';
import { QUESTIONS, stageOf } from '@/data/roadmap';
import { place, type Answers } from '@/lib/placement';
import { gradeStage, gradeStep, type Review } from '@/lib/grade';
import { reviewEvidence } from '@/lib/review';
import { loadProgress } from '@/lib/progress';

type AuthState = { error?: string; email?: string; business?: string } | undefined;
type FormState = { error?: string } | undefined;

/** What saveStep hands back so the form can show the verdict immediately,
    with the ticks the person submitted still ticked. */
export type StepResult =
  | { error: string }
  | { ok: true; status: 'done' | 'in_progress'; review: Review | null; checked: number[]; evidence: string }
  | undefined;

const safeBack = (raw: unknown) => {
  const s = String(raw ?? '');
  return /^\/(dashboard|start|step\/[a-z0-9-]+|stage\/\d{2})$/.test(s) ? s : null;
};

/* ------------------------------------------------------------------ auth */

export async function signup(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  const business = String(form.get('business') ?? '').trim() || null;
  const keep = { email, business: business ?? '' };

  const problems = validateSignup(email, password);
  if (problems.length) return { error: problems.join(' '), ...keep };

  const existing = await sql`select id from roadmap.users where email_lower = ${email.toLowerCase()} limit 1`;
  if (existing.length) return { error: 'That email already has an account. Sign in instead.', ...keep };

  const hash = await hashPassword(password);
  const rows = (await sql`
    insert into roadmap.users (email, password_hash, business_name)
    values (${email}, ${hash}, ${business})
    returning id`) as { id: string }[];

  await createSession(rows[0].id);
  redirect('/start');
}

export async function login(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  if (!email || !password) return { error: 'Enter your email and password.', email };

  const rows = (await sql`
    select id, password_hash from roadmap.users
    where email_lower = ${email.toLowerCase()} limit 1`) as { id: string; password_hash: string }[];

  // Same message either way so the form cannot be used to discover which
  // addresses have accounts.
  const fail = { error: 'That email and password do not match an account.', email };
  if (!rows.length) return fail;
  if (!(await verifyPassword(password, rows[0].password_hash))) return fail;

  await createSession(rows[0].id);

  const back = safeBack(form.get('back'));
  if (back) redirect(back);
  const placed = await sql`select stage from roadmap.placements where user_id = ${rows[0].id}`;
  redirect(placed.length && placed[0].stage !== null ? '/dashboard' : '/start');
}

export async function logout() {
  await endSession();
  redirect('/');
}

/* ------------------------------------------------------------- placement */

export async function savePlacement(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user) redirect('/?signedout=1');

  const answers: Answers = {};
  for (const q of QUESTIONS) {
    const raw = form.get(q.id);
    if (raw === null || raw === '') continue;
    const n = Number(raw);
    if (Number.isInteger(n) && q.opts.some((o) => o.stage === n)) answers[q.id] = n;
  }

  const p = place(answers);
  if (!p.complete) return { error: 'Answer every question so the placing is honest.' };

  await sql`
    insert into roadmap.placements (user_id, answers, stage, shape_stage, work_stage, placed_at)
    values (${user.id}, ${JSON.stringify(answers)}::jsonb, ${p.stage}, ${p.shapeStage}, ${p.workStage}, now())
    on conflict (user_id) do update set
      answers = excluded.answers, stage = excluded.stage,
      shape_stage = excluded.shape_stage, work_stage = excluded.work_stage,
      placed_at = now()`;

  revalidatePath('/dashboard');
  redirect('/dashboard');
}

/* ---------------------------------------------------------------- steps */

export async function saveStep(_prev: StepResult, form: FormData): Promise<StepResult> {
  const user = await currentUser();
  if (!user) redirect(`/?signedout=1&back=${encodeURIComponent(String(form.get('backTo') ?? '/dashboard'))}`);

  const stepId = String(form.get('stepId') ?? '');
  const stage = Number(form.get('stage'));
  if (!Number.isInteger(stage) || stage < 0 || stage > 9) return { error: 'Unknown stage.' };

  const step = stageOf(stage).steps.find((s) => s.id === stepId);
  if (!step) return { error: 'Unknown step.' };

  const checked = step.doneWhen
    .map((_, i) => (form.get(`check-${i}`) ? i : -1))
    .filter((i) => i >= 0);
  const evidence = String(form.get('evidence') ?? '').slice(0, 8000);

  const verdict = gradeStep(step, checked, evidence);

  // The AI pass only runs once the checkbox gate is already clear, and it can
  // only ever hold someone back, never wave them through. If every provider is
  // down it says so out loud instead of silently passing or silently blocking.
  let review: Review | null = null;
  if (verdict.done) {
    review = (await reviewEvidence(step, evidence)) ?? (await reviewEvidence(step, evidence));
    if (review === null) {
      review = {
        verdict: 'accept',
        missing: [],
        note: 'Saved. The full reading of your answer was unavailable just now, so this passed on the checklist alone.',
        by: 'rules',
      };
    }
  }

  const status = verdict.done && review?.verdict !== 'needs_work' ? 'done' : 'in_progress';

  await sql`
    insert into roadmap.progress (user_id, step_id, stage, checked, evidence, status, review, updated_at)
    values (${user.id}, ${stepId}, ${stage}, ${JSON.stringify(checked)}::jsonb,
            ${evidence}, ${status}, ${review ? JSON.stringify(review) : null}::jsonb, now())
    on conflict (user_id, step_id) do update set
      checked = excluded.checked, evidence = excluded.evidence,
      status = excluded.status, review = excluded.review, updated_at = now()`;

  revalidatePath('/dashboard');
  revalidatePath(`/step/${stepId}`);
  return { ok: true, status, review, checked, evidence };
}

/** A person can disagree with "done by placement" on an earlier stage:
    this records that the step is genuinely not done. */
export async function markNotDone(form: FormData) {
  const user = await currentUser();
  if (!user) redirect('/?signedout=1');

  const stepId = String(form.get('stepId') ?? '');
  const stage = Number(form.get('stage'));
  if (!Number.isInteger(stage) || stage < 0 || stage > 9) redirect('/dashboard');
  const step = stageOf(stage).steps.find((s) => s.id === stepId);
  if (!step) redirect('/dashboard');

  await sql`
    insert into roadmap.progress (user_id, step_id, stage, checked, evidence, status, review, updated_at)
    values (${user.id}, ${stepId}, ${stage}, '[]'::jsonb, '', 'in_progress', null, now())
    on conflict (user_id, step_id) do nothing`;

  revalidatePath('/dashboard');
  revalidatePath(`/step/${stepId}`);
  redirect(`/step/${stepId}`);
}

export async function advanceStage(form: FormData) {
  const user = await currentUser();
  if (!user) redirect('/?signedout=1');

  const from = Number(form.get('from'));
  const rows = (await sql`select stage from roadmap.placements where user_id = ${user.id}`) as
    { stage: number | null }[];
  const current = rows[0]?.stage;

  // A second click, a stale tab, or a hand-crafted request must never skip a
  // stage: the move only happens from the exact stage the button was drawn for,
  // and only when that stage has genuinely cleared.
  if (typeof current !== 'number' || current >= 9 || from !== current) redirect('/dashboard');
  const progress = await loadProgress(user.id, current);
  if (!gradeStage(current, progress).canGraduate) redirect('/dashboard');

  const updated = await sql`
    update roadmap.placements set stage = ${current + 1}, placed_at = now()
    where user_id = ${user.id} and stage = ${current}
    returning stage`;
  revalidatePath('/dashboard');
  redirect(updated.length ? `/dashboard?cleared=${String(current).padStart(2, '0')}` : '/dashboard');
}
