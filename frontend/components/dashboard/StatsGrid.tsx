export default function StatsGrid({
  totalProjects,
  totalMembers,
  isAdmin,
  canManage,
  myProgress,
  teamProgress,
}: {
  totalProjects: number;
  totalMembers: number;
  isAdmin: boolean;
  canManage: boolean;
  myProgress: { total: number; done: number; pct: number };
  teamProgress: { total: number; done: number; pct: number };
}) {
  return (
    <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-500">Total Projects</p>
        <p className="mt-2 text-3xl font-bold text-cyan-600">{totalProjects}</p>
      </article>

      <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-500">Team Members</p>
        <p className="mt-2 text-3xl font-bold text-cyan-600">{totalMembers}</p>
      </article>

      <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-500">My Progress</p>
        <p className="mt-2 text-3xl font-bold text-cyan-600">{isAdmin ? "—" : `${myProgress.done}/${myProgress.total}`}</p>
        {!isAdmin ? <p className="mt-1 text-xs font-semibold text-slate-600">{myProgress.pct}% complete</p> : null}
        {isAdmin ? <p className="mt-1 text-xs font-semibold text-slate-600">Admins don’t get assigned tasks</p> : null}
      </article>

      <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-500">{canManage ? "Team Progress" : "My Completion Rate"}</p>
        <p className="mt-2 text-3xl font-bold text-cyan-600">{canManage ? `${teamProgress.done}/${teamProgress.total}` : `${myProgress.pct}%`}</p>
        {canManage ? (
          <p className="mt-1 text-xs font-semibold text-slate-600">{teamProgress.pct}% complete</p>
        ) : (
          <p className="mt-1 text-xs font-semibold text-slate-600">
            {myProgress.done}/{myProgress.total} done
          </p>
        )}
      </article>
    </section>
  );
}