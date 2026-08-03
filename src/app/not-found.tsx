export default function NotFound() {
  return (
    <main className="wrap reading section stack s4">
      <div className="stagebar">
        <span className="n">404:</span>
        <span className="nm">Not a stage</span>
      </div>
      <p className="lede">
        That page is not on the roadmap. The ten stages run from 00 to 09, and every step lives
        under one of them.
      </p>
      <div>
        <a className="btn" href="/dashboard">Back to your dashboard</a>
      </div>
    </main>
  );
}
