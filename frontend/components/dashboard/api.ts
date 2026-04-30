import type { Project, Stats, Task, TeamUser } from "./types";

const baseUrl = () => String(process.env.NEXT_PUBLIC_API_URL || "");

const safeJson = async (res: Response) => {
  try {
    return await res.json();
  } catch {
    return {};
  }
};

const requireOk = async (res: Response, fallbackMessage: string) => {
  if (res.ok) return;
  const data = await safeJson(res);
  const message = (data as any)?.message || fallbackMessage;
  throw new Error(message);
};

export const fetchDashboardData = async (token: string) => {
  const headers = { Authorization: `Bearer ${token}` };

  const [projectsRes, statsRes, tasksRes, usersRes] = await Promise.all([
    fetch(`${baseUrl()}/projects`, { headers }),
    fetch(`${baseUrl()}/projects/stats`, { headers }),
    fetch(`${baseUrl()}/tasks`, { headers }),
    fetch(`${baseUrl()}/users`, { headers }),
  ]);

  await Promise.all([
    requireOk(projectsRes, "Failed to fetch projects"),
    requireOk(statsRes, "Failed to fetch stats"),
    requireOk(tasksRes, "Failed to fetch tasks"),
    requireOk(usersRes, "Failed to fetch users"),
  ]);

  const [projectsData, statsData, tasksData, usersData] = await Promise.all([
    projectsRes.json(),
    statsRes.json(),
    tasksRes.json(),
    usersRes.json(),
  ]);

  return {
    projects: (Array.isArray(projectsData) ? projectsData : []) as Project[],
    stats: {
      totalProjects: Number((statsData as any)?.totalProjects || 0),
      activeTeam: Number((statsData as any)?.activeTeam || 0),
      totalTasks: Number((statsData as any)?.totalTasks || 0),
      completionRate: Number((statsData as any)?.completionRate || 0),
    } as Stats,
    tasks: (Array.isArray(tasksData) ? tasksData : []) as Task[],
    users: (Array.isArray(usersData) ? usersData : []) as TeamUser[],
  };
};

export const createProject = async (token: string, payload: { name: string; status: "active" | "paused" | "completed" }) => {
  const res = await fetch(`${baseUrl()}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });

  const data = await safeJson(res);
  if (!res.ok) throw new Error((data as any)?.message || "Failed to create project");
  return data as Project;
};

export const updateTaskStatus = async (token: string, taskId: string, status: "todo" | "in-progress" | "done") => {
  const res = await fetch(`${baseUrl()}/tasks/${taskId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status }),
  });

  const data = await safeJson(res);
  if (!res.ok) throw new Error((data as any)?.message || "Failed to update task status");
  return data as Task;
};

export const createUser = async (token: string, payload: { name: string; email: string; password: string; role: "user" | "leader" }) => {
  const res = await fetch(`${baseUrl()}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });

  const data = await safeJson(res);
  if (!res.ok) throw new Error((data as any)?.message || "Failed to create user");
  return data as TeamUser;
};

export const changeUserRole = async (token: string, userId: string, role: "admin" | "leader" | "user") => {
  const res = await fetch(`${baseUrl()}/users/${userId}/role`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ role }),
  });

  const data = await safeJson(res);
  if (!res.ok) throw new Error((data as any)?.message || "Failed to update user role");
  return data as TeamUser;
};