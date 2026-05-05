import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";

import type { AuthUser, Project, Stats, Task, TeamUser } from "../components/dashboard/types";
import { changePassword, fetchDashboardData, fetchTasksPage } from "../components/dashboard/api";
import {
  computeMyProgress,
  computeProgressByUserId,
  computeTeamProgress,
  getTaskAssigneeId,
  normalizeStatus,
} from "../components/dashboard/utils";

import DashboardHeader from "../components/dashboard/DashboardHeader";
import StatsGrid from "../components/dashboard/StatsGrid";
import ProjectsPanel from "../components/dashboard/ProjectsPanel";
import TasksPanel from "../components/dashboard/TasksPanel";
import TeamsPanel from "../components/dashboard/TeamsPanel";

import { disconnectSocket, getSocket } from "../lib/socket";

const TASKS_PAGE_SIZE = 25;

const upsertTask = (prev: Task[], incoming: Task) => {
  const id = String((incoming as any)?._id || "");
  if (!id) return prev;

  const idx = prev.findIndex((t) => String((t as any)?._id) === id);
  if (idx === -1) return [incoming, ...prev];

  const copy = [...prev];
  copy[idx] = { ...copy[idx], ...incoming };
  return copy;
};

const upsertTaskAtEnd = (prev: Task[], incoming: Task) => {
  const id = String((incoming as any)?._id || "");
  if (!id) return prev;

  const idx = prev.findIndex((t) => String((t as any)?._id) === id);
  if (idx === -1) return [...prev, incoming];

  const copy = [...prev];
  copy[idx] = { ...copy[idx], ...incoming };
  return copy;
};

const shouldApplyRealtimeUpdate = (currentUser: AuthUser | null, incoming: Task) => {
  if (!currentUser) return false;
  if (currentUser.role !== "user") return true;
  const assigneeId = getTaskAssigneeId(incoming);
  return assigneeId === currentUser._id;
};

const mapChangePasswordError = (message: string) => {
  const lower = String(message || "").toLowerCase();
  if (lower.includes("invalid credentials")) return "Incorrect current password";
  if (lower.includes("validation")) return "Please fill in all fields.";
  if (lower.includes("password must be at least 6")) return "Password must be at least 6 characters";
  return message || "Could not update password";
};

const ChangePasswordModal = ({
  token,
  onClose,
}: {
  token: string | null;
  onClose: () => void;
}) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canSubmit = useMemo(() => {
    return Boolean(currentPassword.trim()) && Boolean(newPassword.trim()) && Boolean(confirmPassword.trim());
  }, [currentPassword, newPassword, confirmPassword]);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!token) {
      setError("Not authorized");
      return;
    }

    const current = currentPassword.trim();
    const next = newPassword.trim();
    const confirm = confirmPassword.trim();

    if (!current || !next || !confirm) {
      setError("Please fill in all fields.");
      return;
    }
    if (next.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (next !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await changePassword(token, { currentPassword: current, newPassword: next });
      setSuccess("Password updated successfully");
    } catch (err) {
      const message = (err as Error).message || "Could not update password";
      setError(mapChangePasswordError(message));
    } finally {
      setSubmitting(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 px-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h3 className="text-xl font-bold text-slate-900">Change Password</h3>

        {error ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        {success ? (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>
        ) : null}

        <input
          type="password"
          className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2.5"
          placeholder="Current password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        <input
          type="password"
          className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2.5"
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          required
        />

        <input
          type="password"
          className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2.5"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          required
        />

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
            Close
          </button>
          <button
            type="submit"
            disabled={submitting || !canSubmit}
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Updating..." : "Update Password"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  const currentUserRef = useRef<AuthUser | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [team, setTeam] = useState<TeamUser[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalProjects: 0,
    activeTeam: 0,
    totalTasks: 0,
    completionRate: 0,
  });

  const [tasksPage, setTasksPage] = useState(1);
  const [tasksHasNext, setTasksHasNext] = useState(false);
  const [tasksTotal, setTasksTotal] = useState(0);
  const [loadingMoreTasks, setLoadingMoreTasks] = useState(false);

  const [activeSection, setActiveSection] = useState<"projects" | "tasks" | "teams">("projects");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const router = useRouter();

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    setMounted(true);

    const t = localStorage.getItem("taskly_token");
    const u = localStorage.getItem("taskly_user");

    setToken(t);

    if (u) {
      try {
        setCurrentUser(JSON.parse(u));
      } catch {
        setCurrentUser(null);
      }
    } else {
      setCurrentUser(null);
    }
  }, []);

  const isAdmin = currentUser?.role === "admin";
  const isLeader = currentUser?.role === "leader";
  const isUser = currentUser?.role === "user";
  const canManage = Boolean(isAdmin || isLeader);

  const eligibleAssignees = useMemo(() => {
    const nonAdmins = team.filter((u) => u.role !== "admin");
    if (isAdmin && currentUser?._id) {
      return nonAdmins.filter((u) => u._id !== currentUser._id);
    }
    return nonAdmins;
  }, [team, isAdmin, currentUser?._id]);

  const loadData = useCallback(async (authToken: string) => {
    setLoading(true);
    setError("");

    try {
      const data = await fetchDashboardData(authToken, { tasksPage: 1, tasksLimit: TASKS_PAGE_SIZE });

      setProjects(Array.isArray(data.projects) ? data.projects : []);
      setTeam(Array.isArray(data.users) ? data.users : []);
      setStats(data.stats);

      const normalizedTasks: Task[] = Array.isArray(data.tasks)
        ? data.tasks.map((t: any) => ({
            ...t,
            status: normalizeStatus(t.status),
          }))
        : [];

      setTasks(normalizedTasks);
      setTasksPage(Number(data.tasksPage?.page || 1));
      setTasksHasNext(Boolean(data.tasksPage?.hasNext || false));
      setTasksTotal(Number(data.tasksPage?.total || normalizedTasks.length || 0));
    } catch (err) {
      setError((err as Error).message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMoreTasks = useCallback(async () => {
    if (!token) return;
    if (loadingMoreTasks) return;
    if (!tasksHasNext) return;

    setLoadingMoreTasks(true);
    setError("");

    try {
      const nextPage = tasksPage + 1;
      const pageData = await fetchTasksPage(token, { page: nextPage, limit: TASKS_PAGE_SIZE });

      const incoming = Array.isArray(pageData.items)
        ? pageData.items.map((t: any) => ({ ...t, status: normalizeStatus(t.status) }))
        : [];

      setTasks((prev) => incoming.reduce(upsertTaskAtEnd, prev));
      setTasksPage(Number(pageData.page || nextPage));
      setTasksHasNext(Boolean(pageData.hasNext || false));
      setTasksTotal(Number(pageData.total || tasksTotal));
    } catch (err) {
      setError((err as Error).message || "Failed to load more tasks");
    } finally {
      setLoadingMoreTasks(false);
    }
  }, [token, loadingMoreTasks, tasksHasNext, tasksPage, tasksTotal]);

  useEffect(() => {
    if (!mounted) return;

    if (!token) {
      router.replace("/login");
      return;
    }

    loadData(token);
  }, [mounted, token, router, loadData]);

  const onTaskCreated = useCallback((incoming: Task) => {
    const user = currentUserRef.current;
    if (!shouldApplyRealtimeUpdate(user, incoming)) return;

    const normalized: Task = { ...incoming, status: normalizeStatus((incoming as any).status) as any };
    setTasks((prev) => upsertTask(prev, normalized));
  }, []);

  const onTaskUpdated = useCallback((incoming: Task) => {
    const user = currentUserRef.current;
    if (!shouldApplyRealtimeUpdate(user, incoming)) return;

    const normalized: Task = { ...incoming, status: normalizeStatus((incoming as any).status) as any };
    setTasks((prev) => upsertTask(prev, normalized));
  }, []);

  const onTaskStatusChanged = useCallback((payload: any) => {
    const incoming: Task | undefined = payload?.task;
    if (!incoming) return;

    const user = currentUserRef.current;
    if (!shouldApplyRealtimeUpdate(user, incoming)) return;

    const normalized: Task = { ...incoming, status: normalizeStatus((incoming as any).status) as any };
    setTasks((prev) => upsertTask(prev, normalized));
  }, []);

  const onUserRoleUpdated = useCallback((payload: { userId?: string; role?: TeamUser["role"] }) => {
    const userId = payload?.userId ? String(payload.userId) : "";
    const role = payload?.role;

    if (!userId || !role) return;

    setTeam((prev) => prev.map((u) => (String(u._id) === userId ? { ...u, role } : u)));

    const current = currentUserRef.current;
    if (current && String(current._id) === userId && current.role !== role) {
      const updated = { ...current, role };
      setCurrentUser(updated);
      localStorage.setItem("taskly_user", JSON.stringify(updated));
    }
  }, []);

  const onProjectCreated = useCallback((incoming: Project) => {
    const id = String((incoming as any)?._id || "");
    if (!id) return;

    setProjects((prev) => {
      const exists = prev.some((p) => String((p as any)?._id) === id);
      if (exists) return prev;
      return [incoming, ...prev];
    });
  }, []);

  useEffect(() => {
    if (!token) return;

    const socket = getSocket(token);

    socket.off("task-created", onTaskCreated);
    socket.off("task-updated", onTaskUpdated);
    socket.off("task-status-changed", onTaskStatusChanged);
    socket.off("user:role-updated", onUserRoleUpdated);
    socket.off("project:created", onProjectCreated);

    socket.on("task-created", onTaskCreated);
    socket.on("task-updated", onTaskUpdated);
    socket.on("task-status-changed", onTaskStatusChanged);
    socket.on("user:role-updated", onUserRoleUpdated);
    socket.on("project:created", onProjectCreated);

    return () => {
      socket.off("task-created", onTaskCreated);
      socket.off("task-updated", onTaskUpdated);
      socket.off("task-status-changed", onTaskStatusChanged);
      socket.off("user:role-updated", onUserRoleUpdated);
      socket.off("project:created", onProjectCreated);
      disconnectSocket();
    };
  }, [token, onTaskCreated, onTaskUpdated, onTaskStatusChanged, onUserRoleUpdated, onProjectCreated]);

  const logout = () => {
    disconnectSocket();
    localStorage.removeItem("taskly_token");
    localStorage.removeItem("taskly_user");
    setToken(null);
    setCurrentUser(null);
    router.push("/login");
  };

  const progressByUserId = useMemo(() => computeProgressByUserId(tasks, team), [tasks, team]);
  const myProgress = useMemo(
    () => computeMyProgress(currentUser?._id, progressByUserId),
    [currentUser?._id, progressByUserId]
  );
  const teamProgress = useMemo(
    () => (canManage ? computeTeamProgress(tasks, team) : { total: 0, done: 0, pct: 0 }),
    [canManage, tasks, team]
  );

  const totalProjects = projects.length || stats.totalProjects;
  const totalMembers = team.length || stats.activeTeam;

  if (!mounted) return null;

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <DashboardHeader
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          onLogout={logout}
          onChangePassword={() => setShowChangePassword(true)}
        />

        {showChangePassword ? (
          <ChangePasswordModal token={token} onClose={() => setShowChangePassword(false)} />
        ) : null}

        {error ? (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              className="rounded-md px-2 py-0.5 text-xs font-semibold text-red-700 hover:bg-red-100"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        ) : null}

        <StatsGrid
          totalProjects={totalProjects}
          totalMembers={totalMembers}
          isAdmin={Boolean(isAdmin)}
          canManage={canManage}
          myProgress={myProgress}
          teamProgress={teamProgress}
        />

        {activeSection === "projects" ? (
          <ProjectsPanel
            projects={projects}
            tasks={tasks}
            loading={loading}
            canManage={canManage}
            token={token}
            onReload={async () => {
              if (token) await loadData(token);
            }}
            onError={setError}
          />
        ) : null}

        {activeSection === "tasks" ? (
          <TasksPanel
            tasks={tasks}
            canManage={canManage}
            isAdmin={Boolean(isAdmin)}
            isLeader={Boolean(isLeader)}
            isUser={Boolean(isUser)}
            currentUser={currentUser}
            token={token}
            projects={projects}
            assignees={eligibleAssignees}
            hasMore={tasksHasNext}
            loadingMore={loadingMoreTasks}
            onLoadMore={loadMoreTasks}
            onReload={async () => {
              if (token) await loadData(token);
            }}
            onError={setError}
          />
        ) : null}

        {activeSection === "teams" ? (
          <TeamsPanel
            token={token}
            currentUser={currentUser}
            team={team}
            isAdmin={Boolean(isAdmin)}
            canManage={canManage}
            progressByUserId={progressByUserId}
            onReload={async () => {
              if (token) await loadData(token);
            }}
            onError={setError}
          />
        ) : null}
      </div>
    </main>
  );
}