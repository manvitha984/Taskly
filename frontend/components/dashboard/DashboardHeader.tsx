import Link from "next/link";

export default function DashboardHeader({
  activeSection,
  onSectionChange,
  onLogout,
  onChangePassword,
}: {
  activeSection: "projects" | "tasks" | "teams";
  onSectionChange: (section: "projects" | "tasks" | "teams") => void;
  onLogout: () => void;
  onChangePassword: () => void;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/90 px-5 py-4 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">Workspace</p>
        <h1 className="text-2xl font-bold text-slate-900">Taskly Dashboard</h1>
      </div>

      <nav className="flex flex-wrap items-center gap-2">
        <Link href="/" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
          Home
        </Link>

        <button
          onClick={() => onSectionChange("projects")}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          aria-pressed={activeSection === "projects"}
        >
          Projects
        </button>

        <button
          onClick={() => onSectionChange("tasks")}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          aria-pressed={activeSection === "tasks"}
        >
          Tasks
        </button>

        <button
          onClick={() => onSectionChange("teams")}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          aria-pressed={activeSection === "teams"}
        >
          Teams
        </button>

        <button onClick={onChangePassword} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
          Change Password
        </button>

        <button onClick={onLogout} className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-600">
          Logout
        </button>
      </nav>
    </header>
  );
}