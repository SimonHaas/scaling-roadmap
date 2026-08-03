import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { sql } from '@/lib/db';
import { QUESTIONS } from '@/data/roadmap';
import PlacementForm from '@/components/PlacementForm';

export default async function Start() {
  const user = await currentUser();
  if (!user) redirect('/');

  const rows = (await sql`
    select answers from roadmap.placements where user_id = ${user.id}`) as
    { answers: Record<string, number> }[];

  return (
    <main className="wrap reading section stack s5">
      <div className="stack s3">
        <span className="label">Placing you</span>
        <div className="vblock"><h1 className="display d2" style={{ color: "var(--white)" }}>Where are you right now?</h1></div>
        <p className="lede">
          Five questions. Answer them about the business as it is today, not as you want it to be.
          Every option below is printed in the guides.
        </p>
        <p className="tiny" style={{ maxWidth: '60ch' }}>
          The rule is theirs: you are in the earliest stage whose graduation action is not yet done.
          If your company is built like stage six but the books are still stage four, you are
          working stage four.
        </p>
        <p className="tiny" style={{ maxWidth: '60ch' }}>
          Re-placing never deletes your work. Anything you have saved on any stage stays saved.
        </p>
      </div>

      

      <PlacementForm questions={QUESTIONS} saved={rows[0]?.answers ?? {}} uid={user.id.slice(0, 8)} />
    </main>
  );
}
