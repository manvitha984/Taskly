import { FormEvent, useMemo, useState } from "react";
import type { AuthUser, CreateUserRole, TeamUser } from "./types";
import { changeUserRole, createUser } from "./api";

export default function TeamsPanel({
  token,
  currentUser,
  team,
  isAdmin,
  canManage,
  progressByUserId,
  onReload,
  onError,
}: {
  token: string | null;
  currentUser: AuthUser | null;
  team: TeamUser[];
  isAdmin: boolean;
  canManage: boolean;
  progressByUserId: Record<string, { total: number; done: number }>;
  onReload: () => void | Promise<void>;
  onError: (message: string) => void;
}) {
  const [createUserForm, setCreateUserForm] = useState<{
    name: string;
    email: string;
    password: string;
    role: CreateUserRole;
  }>({
    name: "",
    email: "",
    password: "",
    role: "user",
  });

  const [createUserSubmitting, setCreateUserSubmitting] = useState(false);
  const [roleUpdatingId, setRoleUpdatingId] = useState<string | null>(null);

  const canCreateUser = useMemo(() => {
    return Boolean(createUserForm.name.trim()) && Boolean(createUserForm.email.trim()) && Boolean(createUserForm.password.trim());
  }, [createUserForm.email, createUserForm.name, createUserForm.password]);

  const submitCreateUser = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) return;
    if (!isAdmin) return;

    const payload = {
      name: createUserForm.name.trim(),
      email: createUserForm.email.trim(),
      password: createUserForm.password,
      role: createUserForm.role,
    };

    if (!payload.name || !payload.email || !payload.password) {
      onError("Please fill name, email, and password.");
      return;
    }

    setCreateUserSubmitting(true);
    try {
      await createUser(token, payload);
      setCreateUserForm({ name: "", email: "", password: "", role: "user" });
      await onReload();
    } catch (err) {
      onError((err as Error).message || "Could not create user");
    } finally {
      setCreateUserSubmitting(false);
    }
  };

  const onChangeUserRole = async (userId: string, role: TeamUser["role"]) => {
    if (!token) return;
    if (!isAdmin) return;

    if (currentUser?._id && userId === currentUser._id) {
      onError("You cannot change your own role.");
      return;
    }

    setRoleUpdatingId(userId);
    try {
      await changeUserRole(token, userId, role);
      await onReload();
    } catch (err) {
      onError((err as Error).message || "Could not update user role");
    } finally {
      setRoleUpdatingId(null);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Team Members</h2>
          <p className="mt-1 text-sm text-slate-600">Manage your organization members and roles.</p>
        </div>
      </div>

      {isAdmin ? (
        <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">Create User</h3>
          <p className="mt-1 text-sm text-slate-600">Add a new member to your organization.</p>

          <form onSubmit={submitCreateUser} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              placeholder="Name"
              value={createUserForm.name}
              onChange={(e) => setCreateUserForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <input
              type="email"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              placeholder="Email"
              value={createUserForm.email}
              onChange={(e) => setCreateUserForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
            <input
              type="password"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              placeholder="Password"
              value={createUserForm.password}
              onChange={(e) => setCreateUserForm((f) => ({ ...f, password: e.target.value }))}
              required
            />
            <select
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              value={createUserForm.role}
              onChange={(e) => setCreateUserForm((f) => ({ ...f, role: e.target.value as CreateUserRole }))}
            >
              <option value="user">user</option>
              <option value="leader">leader</option>
            </select>

            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={createUserSubmitting || !canCreateUser}
                className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {createUserSubmitting ? "Creating..." : "Create User"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {team.length === 0 ? <p className="text-slate-500">No members found.</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {team.map((m) => {
          const isMe = Boolean(currentUser?._id && m._id === currentUser._id);
          const roleDisabled = Boolean(isAdmin && isMe);

          const p = progressByUserId[m._id];
          const total = p?.total || 0;
          const done = p?.done || 0;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;

          return (
            <article key={m._id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">
                    {m.name}{" "}
                    {isMe ? (
                      <span className="ml-1 rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-semibold text-cyan-700">You</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-slate-500">{m.email}</p>

                  {canManage ? (
                    <p className="mt-2 text-xs font-semibold text-slate-600">
                      Tasks: {done}/{total} • {pct}%
                    </p>
                  ) : null}
                </div>

                {!isAdmin ? (
                  <span className="mt-0.5 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{m.role}</span>
                ) : (
                  <div className="min-w-[140px]">
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Role</label>
                    <select
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                      value={m.role}
                      disabled={roleDisabled || roleUpdatingId === m._id}
                      onChange={(e) => onChangeUserRole(m._id, e.target.value as TeamUser["role"])}
                      title={roleDisabled ? "You cannot change your own role" : undefined}
                    >
                      <option value="user">user</option>
                      <option value="leader">leader</option>
                      <option value="admin">admin</option>
                    </select>
                    {roleDisabled ? <p className="mt-1 text-xs text-slate-500">You can’t change your own role.</p> : null}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}