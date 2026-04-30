import type { AuthUser, NormalizedTaskStatus, PopulatedUser, Task, TaskPriority, TaskStatus, TeamUser } from "./types";

export const normalizeStatus = (s: TaskStatus): NormalizedTaskStatus => {
  if (s === "pending") return "todo";
  if (s === "completed") return "done";
  return s;
};

export const toPriority = (p: unknown): TaskPriority => {
  if (p === "high" || p === "medium" || p === "low") return p;
  return "medium";
};

export const getUserId = (u: PopulatedUser | string | null | undefined) => {
  if (!u) return "";
  return typeof u === "string" ? u : u._id;
};

export const getTaskAssigneeId = (t: Task) => {
  const direct = getUserId(t.assigneeId);
  if (direct) return direct;

  const legacy = Array.isArray(t.assigneeIds) ? t.assigneeIds : [];
  const first = legacy[0];
  if (!first) return "";
  return typeof first === "string" ? first : first._id;
};

export const getDisplayName = (u: PopulatedUser | string | null | undefined) => {
  if (!u) return "";
  return typeof u === "string" ? "" : u.name || u.email || "";
};

export const taskIsAssignedToCurrentUser = (task: Task, currentUser: Pick<AuthUser, "_id"> | null) => {
  if (!currentUser) return false;

  const directAssigneeId = getUserId(task.assigneeId);
  if (directAssigneeId && directAssigneeId === currentUser._id) return true;

  const legacy = Array.isArray(task.assigneeIds) ? task.assigneeIds : [];
  const legacyIds = legacy.map((x) => (typeof x === "string" ? x : x._id));
  return legacyIds.includes(currentUser._id);
};

const dueSortValue = (dueDate: Task["dueDate"]) => {
  if (!dueDate) return Number.POSITIVE_INFINITY;
  const ms = new Date(String(dueDate)).getTime();
  return Number.isFinite(ms) ? ms : Number.POSITIVE_INFINITY;
};

export const sortTasksByDueDateAsc = <T extends { dueDate?: string | null }>(tasks: T[]) => {
  const copy = [...tasks];
  copy.sort((a, b) => {
    const at = dueSortValue(a.dueDate ?? null);
    const bt = dueSortValue(b.dueDate ?? null);
    if (at === bt) return 0;
    return at < bt ? -1 : 1;
  });
  return copy;
};

export const groupTasksByPriority = (tasks: Task[]) => {
  const high: Task[] = [];
  const medium: Task[] = [];
  const low: Task[] = [];

  for (const t of tasks) {
    const p = toPriority(t.priority);
    if (p === "high") high.push(t);
    else if (p === "low") low.push(t);
    else medium.push(t);
  }

  return {
    high: sortTasksByDueDateAsc(high),
    medium: sortTasksByDueDateAsc(medium),
    low: sortTasksByDueDateAsc(low),
  };
};

export const getProjectTaskCountMap = (tasks: Task[]) => {
  const map: Record<string, number> = {};
  for (const t of tasks) {
    const pid = typeof t.projectId === "string" ? t.projectId : t.projectId?._id;
    if (!pid) continue;
    map[pid] = (map[pid] || 0) + 1;
  }
  return map;
};

export const computeProgressByUserId = (tasks: Task[], team: TeamUser[]) => {
  const map: Record<string, { total: number; done: number }> = {};

  for (const t of tasks) {
    const assigneeUserId = getTaskAssigneeId(t);
    if (!assigneeUserId) continue;

    const assignee = team.find((x) => x._id === assigneeUserId);
    if (assignee?.role === "admin") continue;

    if (!map[assigneeUserId]) map[assigneeUserId] = { total: 0, done: 0 };
    map[assigneeUserId].total += 1;

    if (normalizeStatus(t.status) === "done") {
      map[assigneeUserId].done += 1;
    }
  }

  return map;
};

export const computeMyProgress = (currentUserId: string | undefined, progressByUserId: Record<string, { total: number; done: number }>) => {
  if (!currentUserId) return { total: 0, done: 0, pct: 0 };
  const p = progressByUserId[currentUserId] || { total: 0, done: 0 };
  const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
  return { ...p, pct };
};

export const computeTeamProgress = (tasks: Task[], team: TeamUser[]) => {
  let total = 0;
  let done = 0;

  for (const t of tasks) {
    const assigneeUserId = getTaskAssigneeId(t);
    if (!assigneeUserId) continue;

    const assignee = team.find((x) => x._id === assigneeUserId);
    if (assignee?.role === "admin") continue;

    total += 1;
    if (normalizeStatus(t.status) === "done") done += 1;
  }

  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return { total, done, pct };
};