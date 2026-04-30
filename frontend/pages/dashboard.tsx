import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";

import type { AuthUser, Project, Stats, Task, TeamUser } from "../components/dashboard/types";
import { fetchDashboardData } from "../components/dashboard/api";
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

const upsertTask = (prev: Task[], incoming: Task) => {
  const id = String((incoming as any)?._id || "");
  if (!id) return prev;

  const idx = prev.findIndex((t) => String((t as any)?._id) === id);
  if (idx === -1) return [incoming, ...prev];

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

  const [activeSection, setActiveSection] = useState<"projects" | "tasks" | "teams">("projects");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

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
      const data = await fetchDashboardData(authToken);

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
    } catch (err) {
      setError((err as Error).message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

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

  useEffect(() => {
    if (!token) return;

    const socket = getSocket(token);

    socket.off("task-created", onTaskCreated);
    socket.off("task-updated", onTaskUpdated);
    socket.off("task-status-changed", onTaskStatusChanged);

    socket.on("task-created", onTaskCreated);
    socket.on("task-updated", onTaskUpdated);
    socket.on("task-status-changed", onTaskStatusChanged);

    return () => {
      socket.off("task-created", onTaskCreated);
      socket.off("task-updated", onTaskUpdated);
      socket.off("task-status-changed", onTaskStatusChanged);
      disconnectSocket();
    };
  }, [token, onTaskCreated, onTaskUpdated, onTaskStatusChanged]);

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
        <DashboardHeader activeSection={activeSection} onSectionChange={setActiveSection} onLogout={logout} />

        {error ? (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
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