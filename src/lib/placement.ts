import { QUESTIONS, STAGES, stageOf, type Stage } from '@/data/roadmap';

export type Answers = Record<string, number>;

const idsOf = (kind: 'structural' | 'working') =>
  QUESTIONS.filter((q) => q.kind === kind).map((q) => q.id);

const minAnswered = (answers: Answers, ids: string[]) => {
  const vals = ids.map((i) => answers[i]).filter((v) => typeof v === 'number');
  return vals.length ? Math.min(...vals) : null;
};

export type Placement = {
  stage: number | null;
  shapeStage: number | null;
  workStage: number | null;
  answered: number;
  total: number;
  complete: boolean;
  /** Set when the company is built bigger than the work inside it, or the reverse. */
  gap: { lower: number; higher: number; behind: 'the work inside it' | 'the shape of the company' } | null;
};

/**
 * The guides' own rule: you are in the earliest stage whose graduation action is
 * not yet done, no matter how big the headcount looks. So the placement is the
 * minimum across every answer, not an average.
 */
export function place(answers: Answers): Placement {
  const shapeStage = minAnswered(answers, idsOf('structural'));
  const workStage = minAnswered(answers, idsOf('working'));
  const all = QUESTIONS.map((q) => answers[q.id]).filter((v) => typeof v === 'number');
  const stage = all.length ? Math.min(...all) : null;

  let gap: Placement['gap'] = null;
  if (shapeStage !== null && workStage !== null && shapeStage !== workStage) {
    gap = {
      lower: Math.min(shapeStage, workStage),
      higher: Math.max(shapeStage, workStage),
      behind: workStage < shapeStage ? 'the work inside it' : 'the shape of the company',
    };
  }

  return {
    stage,
    shapeStage,
    workStage,
    answered: all.length,
    total: QUESTIONS.length,
    complete: all.length === QUESTIONS.length,
    gap,
  };
}

export function stageOrNull(n: number | null | undefined): Stage | null {
  if (typeof n !== 'number') return null;
  const key = String(n).padStart(2, '0');
  return STAGES[key] ?? null;
}

export const allStages = (): Stage[] =>
  Object.keys(STAGES)
    .sort()
    .map((k) => STAGES[k]);

export { stageOf };
