import TaskCard from "./TaskCard";
import type { AuthUser, Task } from "./types";
import { groupTasksByPriority } from "./utils";

export default function TaskSection({
  tasks,
  currentUser,
  isAdmin,
  canManage,
  isLeader,
  isUser,
  onUpdateStatus,
}: {
  tasks: Task[];
  currentUser: AuthUser | null;
  isAdmin: boolean;
  canManage: boolean;
  isLeader: boolean;
  isUser: boolean;
  onUpdateStatus: (taskId: string, status: "todo" | "in-progress" | "done") => void;
}) {
  const grouped = groupTasksByPriority(tasks);

  return (
    <div className="space-y-8">
      <div>
        <h3 className="mb-3 text-sm font-bold text-slate-900">🔴 High Priority</h3>
        {grouped.high.length === 0 ? (
          <p className="text-sm text-slate-500">No high priority tasks.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {grouped.high.map((t) => (
              <TaskCard
                key={t._id}
                task={t}
                currentUser={currentUser}
                isAdmin={isAdmin}
                canManage={canManage}
                isLeader={isLeader}
                isUser={isUser}
                onUpdateStatus={onUpdateStatus}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold text-slate-900">🟡 Medium Priority</h3>
        {grouped.medium.length === 0 ? (
          <p className="text-sm text-slate-500">No medium priority tasks.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {grouped.medium.map((t) => (
              <TaskCard
                key={t._id}
                task={t}
                currentUser={currentUser}
                isAdmin={isAdmin}
                canManage={canManage}
                isLeader={isLeader}
                isUser={isUser}
                onUpdateStatus={onUpdateStatus}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold text-slate-900">🟢 Low Priority</h3>
        {grouped.low.length === 0 ? (
          <p className="text-sm text-slate-500">No low priority tasks.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {grouped.low.map((t) => (
              <TaskCard
                key={t._id}
                task={t}
                currentUser={currentUser}
                isAdmin={isAdmin}
                canManage={canManage}
                isLeader={isLeader}
                isUser={isUser}
                onUpdateStatus={onUpdateStatus}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}