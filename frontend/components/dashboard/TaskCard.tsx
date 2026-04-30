import PriorityBadge from "./PriorityBadge";
import type { AuthUser, Task } from "./types";
import { getDisplayName, normalizeStatus, taskIsAssignedToCurrentUser, toPriority } from "./utils";

export default function TaskCard({
  task,
  currentUser,
  isAdmin,
  canManage,
  isLeader,
  isUser,
  onUpdateStatus,
}: {
  task: Task;
  currentUser: AuthUser | null;
  isAdmin: boolean;
  canManage: boolean;
  isLeader: boolean;
  isUser: boolean;
  onUpdateStatus: (taskId: string, status: "todo" | "in-progress" | "done") => void;
}) {
  const isMine = taskIsAssignedToCurrentUser(task, currentUser);
  const status = normalizeStatus(task.status);
  const priority = toPriority(task.priority);

  const statusBadgeClass =
    status === "done"
      ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700"
      : status === "in-progress"
        ? "rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700"
        : "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700";

  const canUpdateTaskStatus = isMine && !isAdmin;

  const projectName = typeof task.projectId === "string" ? "" : task.projectId?.name ? String(task.projectId.name) : "";
  const assigneeName = getDisplayName(task.assigneeId) || "Unassigned";
  const assignedByName = getDisplayName(task.assignedBy);

  const cardClass =
    priority === "high"
      ? "border-red-300 bg-red-50"
      : priority === "low"
        ? "border-slate-200 bg-slate-50"
        : "border-yellow-200 bg-yellow-50";

  return (
    <article className={`rounded-xl border p-4 shadow-sm ${cardClass}`}>
      <div className="mb-1 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-slate-900">{task.title}</h3>
        <div className="flex items-center gap-2">
          <PriorityBadge priority={priority} />
          <span className={statusBadgeClass}>{status}</span>
        </div>
      </div>

      {projectName ? <p className="text-xs font-semibold text-slate-600">Project: {projectName}</p> : null}

      <p className="mt-1 text-sm text-slate-700">Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "Not set"}</p>

      {canManage ? (
        <p className="mt-1 text-xs text-slate-600">
          Assigned to: <span className="font-semibold text-slate-700">{assigneeName}</span>
          {assignedByName ? (
            <>
              {" "}
              • Assigned by: <span className="font-semibold text-slate-700">{assignedByName}</span>
            </>
          ) : null}
        </p>
      ) : null}

      {canUpdateTaskStatus ? (
        <div className="mt-3">
          <label className="mb-1 block text-xs font-semibold text-slate-600">Update status</label>
          <select
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            value={status}
            onChange={(e) => onUpdateStatus(task._id, e.target.value as "todo" | "in-progress" | "done")}
          >
            <option value="todo">todo</option>
            <option value="in-progress">in-progress</option>
            <option value="done">done</option>
          </select>
        </div>
      ) : null}

      {!canUpdateTaskStatus && (isLeader || isUser) && isMine ? <p className="mt-3 text-xs text-slate-500">You can update this task’s status above.</p> : null}
    </article>
  );
}