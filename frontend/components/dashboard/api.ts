import type { PaginatedResponse, Project, Stats, Task, TeamUser } from "./types";

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

const toPositiveInt = (value: unknown, fallback: number) => {
  const n = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
};

export const fetchTasksPage = async (
  token: string,
  params?: { page?: number; limit?: number; projectId?: string; status?: "todo" | "in-progress" | "done" }
): Promise<PaginatedResponse<Task>> => {
  const page = toPositiveInt(params?.page, 1);
  const limit = toPositiveInt(params?.limit, 25);

  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("limit", String(limit));
  if (params?.projectId) qs.set("projectId", params.projectId);
  if (params?.status) qs.set("status", params.status);

  const res = await fetch(`${baseUrl()}/tasks?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  await requireOk(res, "Failed to fetch tasks");
  const data = await res.json().catch(() => ({}));

  if (Array.isArray(data)) {
    const items = data as Task[];
    return { items, page: 1, limit: items.length || limit, total: items.length, hasNext: false };
  }

  const items = Array.isArray((data as any)?.items) ? ((data as any).items as Task[]) : [];
  const out: PaginatedResponse<Task> = {
    items,
    page: Number((data as any)?.page || page),
    limit: Number((data as any)?.limit || limit),
    total: Number((data as any)?.total || items.length),
    hasNext: Boolean((data as any)?.hasNext || false),
  };

  return out;
};

export const fetchDashboardData = async (token: string, opts?: { tasksPage?: number; tasksLimit?: number }) => {
  const headers = { Authorization: `Bearer ${token}` };

  const tasksPage = toPositiveInt(opts?.tasksPage, 1);
  const tasksLimit = toPositiveInt(opts?.tasksLimit, 25);

  const [projectsRes, statsRes, tasksRes, usersRes] = await Promise.all([
    fetch(`${baseUrl()}/projects`, { headers }),
    fetch(`${baseUrl()}/projects/stats`, { headers }),
    fetch(`${baseUrl()}/tasks?page=${tasksPage}&limit=${tasksLimit}`, { headers }),
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

  let tasksPageData: PaginatedResponse<Task>;
  if (Array.isArray(tasksData)) {
    const items = tasksData as Task[];
    tasksPageData = { items, page: 1, limit: items.length || tasksLimit, total: items.length, hasNext: false };
  } else {
    tasksPageData = {
      items: Array.isArray((tasksData as any)?.items) ? ((tasksData as any).items as Task[]) : [],
      page: Number((tasksData as any)?.page || tasksPage),
      limit: Number((tasksData as any)?.limit || tasksLimit),
      total: Number((tasksData as any)?.total || 0),
      hasNext: Boolean((tasksData as any)?.hasNext || false),
    };
  }

  return {
    projects: (Array.isArray(projectsData) ? projectsData : []) as Project[],
    stats: {
      totalProjects: Number((statsData as any)?.totalProjects || 0),
      activeTeam: Number((statsData as any)?.activeTeam || 0),
      totalTasks: Number((statsData as any)?.totalTasks || 0),
      completionRate: Number((statsData as any)?.completionRate || 0),
    } as Stats,
    tasks: tasksPageData.items,
    tasksPage: tasksPageData,
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

export const changePassword = async (token: string, payload: { currentPassword: string; newPassword: string }) => {
  const url = `${baseUrl()}/auth/change-password`;
  console.log("CHANGE PASSWORD API CALL", { url, method: "PATCH" });

  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });

  const data = await safeJson(res);
  if (!res.ok) throw new Error((data as any)?.message || "Failed to update password");
  return data as { message?: string };
};