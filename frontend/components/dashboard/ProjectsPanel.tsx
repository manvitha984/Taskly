import { useMemo, useState } from "react";
import type { Project, Task } from "./types";
import { getProjectTaskCountMap } from "./utils";
import CreateProjectModal from "./CreateProjectModal";

export default function ProjectsPanel({
  projects,
  tasks,
  loading,
  canManage,
  token,
  onReload,
  onError,
}: {
  projects: Project[];
  tasks: Task[];
  loading: boolean;
  canManage: boolean;
  token: string | null;
  onReload: () => void | Promise<void>;
  onError: (message: string) => void;
}) {
  const [projectModalOpen, setProjectModalOpen] = useState(false);

  const projectTaskCount = useMemo(() => getProjectTaskCountMap(tasks), [tasks]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-900">Projects</h2>
        {canManage ? (
          <button
            onClick={() => setProjectModalOpen(true)}
            className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-600"
          >
            Create Project
          </button>
        ) : null}
      </div>

      {loading ? <p className="text-slate-500">Loading projects...</p> : null}
      {!loading && projects.length === 0 ? <p className="text-slate-500">No projects yet. Create your first project.</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <article key={p._id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">{p.name}</h3>
              <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-semibold text-cyan-700">{p.status || "active"}</span>
            </div>
            <p className="text-sm text-slate-600">Tasks: {projectTaskCount[p._id] || 0}</p>
          </article>
        ))}
      </div>

      {projectModalOpen ? (
        <CreateProjectModal
          token={token}
          onClose={() => setProjectModalOpen(false)}
          onCreated={onReload}
          onError={onError}
        />
      ) : null}
    </section>
  );
}