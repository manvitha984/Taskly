import { useState } from "react";
import type { AuthUser, Project, Task, TeamUser } from "./types";
import { updateTaskStatus } from "./api";
import TaskSection from "./TaskSection";
import CreateTaskModal from "./CreateTaskModal";

export default function TasksPanel({
  tasks,
  canManage,
  isAdmin,
  isLeader,
  isUser,
  currentUser,
  token,
  projects,
  assignees,
  onReload,
  onError,
}: {
  tasks: Task[];
  canManage: boolean;
  isAdmin: boolean;
  isLeader: boolean;
  isUser: boolean;
  currentUser: AuthUser | null;
  token: string | null;
  projects: Project[];
  assignees: TeamUser[];
  onReload: () => void | Promise<void>;
  onError: (message: string) => void;
}) {
  const [taskModalOpen, setTaskModalOpen] = useState(false);

  const onUpdateStatus = async (taskId: string, status: "todo" | "in-progress" | "done") => {
    if (!token) return;

    try {
      await updateTaskStatus(token, taskId, status);
      await onReload();
    } catch (err) {
      onError((err as Error).message || "Could not update task status");
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-900">{canManage ? "Team Tasks" : "My Tasks"}</h2>
        {canManage ? (
          <button
            onClick={() => setTaskModalOpen(true)}
            className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-600"
          >
            Add Task
          </button>
        ) : null}
      </div>

      {tasks.length === 0 ? <p className="text-slate-500">No tasks found.</p> : null}

      {tasks.length > 0 ? (
        <TaskSection
          tasks={tasks}
          currentUser={currentUser}
          isAdmin={isAdmin}
          isLeader={isLeader}
          isUser={isUser}
          canManage={canManage}
          onUpdateStatus={onUpdateStatus}
        />
      ) : null}

      {taskModalOpen ? (
        <CreateTaskModal
          token={token}
          projects={projects}
          assignees={assignees}
          onClose={() => setTaskModalOpen(false)}
          onCreated={onReload}
          onError={onError}
        />
      ) : null}
    </section>
  );
}