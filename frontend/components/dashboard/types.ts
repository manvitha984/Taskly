export type Role = "admin" | "leader" | "user";

export type Project = {
  _id: string;
  name: string;
  status?: "active" | "paused" | "completed";
};

export type TaskStatus = "todo" | "in-progress" | "done" | "pending" | "completed";
export type NormalizedTaskStatus = "todo" | "in-progress" | "done";

export type TaskPriority = "low" | "medium" | "high";

export type PopulatedUser = {
  _id: string;
  name: string;
  email: string;
  role: Role;
};

export type Task = {
  _id: string;
  title: string;
  description?: string;

  status: TaskStatus;
  priority?: TaskPriority | null;

  dueDate?: string | null;
  createdAt?: string;

  projectId?: { _id: string; name: string } | string;

  assigneeId?: PopulatedUser | string | null;
  assignedBy?: PopulatedUser | string | null;

  // legacy
  assigneeIds?: Array<PopulatedUser> | string[];
};

export type TeamUser = {
  _id: string;
  name: string;
  email: string;
  role: Role;
};

export type Stats = {
  totalProjects: number;
  activeTeam: number;
  totalTasks: number;
  completionRate: number;
};

export type AuthUser = {
  _id: string;
  name: string;
  email: string;
  role: Role;
  organizationId: string;
};

export type CreateUserRole = "user" | "leader";