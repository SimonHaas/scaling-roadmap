import 'server-only';
import { sql } from './db';
import type { ProgressRow, Review } from './grade';

type Raw = {
  step_id: string;
  stage: number;
  checked: number[] | null;
  evidence: string | null;
  status: string;
  review: Review | null;
};

export async function loadProgress(userId: string, stage: number): Promise<ProgressRow[]> {
  const rows = (await sql`
    select step_id, stage, checked, evidence, status, review
    from roadmap.progress
    where user_id = ${userId} and stage = ${stage}`) as Raw[];

  return rows.map((r) => ({
    stepId: r.step_id,
    stage: r.stage,
    checked: Array.isArray(r.checked) ? r.checked : [],
    evidence: r.evidence ?? '',
    status: r.status === 'done' ? 'done' : 'in_progress',
    review: r.review ?? null,
  }));
}

export async function loadAllProgress(userId: string): Promise<ProgressRow[]> {
  const rows = (await sql`
    select step_id, stage, checked, evidence, status, review
    from roadmap.progress
    where user_id = ${userId}`) as Raw[];
  return rows.map((r) => ({
    stepId: r.step_id,
    stage: r.stage,
    checked: Array.isArray(r.checked) ? r.checked : [],
    evidence: r.evidence ?? '',
    status: r.status === 'done' ? 'done' : 'in_progress',
    review: r.review ?? null,
  }));
}

export async function loadStep(userId: string, stepId: string): Promise<ProgressRow | null> {
  const rows = (await sql`
    select step_id, stage, checked, evidence, status, review
    from roadmap.progress
    where user_id = ${userId} and step_id = ${stepId} limit 1`) as Raw[];
  if (!rows.length) return null;
  const r = rows[0];
  return {
    stepId: r.step_id,
    stage: r.stage,
    checked: Array.isArray(r.checked) ? r.checked : [],
    evidence: r.evidence ?? '',
    status: r.status === 'done' ? 'done' : 'in_progress',
    review: r.review ?? null,
  };
}

export async function loadPlacement(userId: string) {
  const rows = (await sql`
    select stage, shape_stage, work_stage, answers
    from roadmap.placements where user_id = ${userId} limit 1`) as {
    stage: number | null; shape_stage: number | null; work_stage: number | null;
    answers: Record<string, number>;
  }[];
  return rows[0] ?? null;
}
