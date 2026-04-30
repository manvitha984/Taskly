import { FormEvent, useMemo, useState } from "react";
import type { Project, TaskPriority, TeamUser } from "./types";

export default function CreateTaskModal({
  token,
  projects,
  assignees,
  onClose,
  onCreated,
  onError,
}: {
  token: string | null;
  projects: Project[];
  assignees: TeamUser[];
  onClose: () => void;
  onCreated: () => void | Promise<void>;
  onError: (message: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [priority, setPriority] = useState<TaskPriority>("medium");

  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      Boolean(title.trim()) &&
      Boolean(description.trim()) &&
      Boolean(projectId.trim()) &&
      Boolean(assigneeId.trim()) &&
      Boolean(dueDate.trim()) &&
      Boolean(priority)
    );
  }, [title, description, projectId, assigneeId, dueDate, priority]);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) return;

    const t = title.trim();
    const d = description.trim();
    const pid = projectId.trim();
    const aid = assigneeId.trim();
    const dd = dueDate.trim();
    const pr = priority;

    if (!t || !d || !pid || !aid || !dd || !pr) {
      onError("Please fill in all task fields.");
      return;
    }

    console.log("Sending task:", { title: t, projectId: pid, assigneeId: aid, priority: pr });

    setSubmitting(true);

    try {
      const payload = {
        title: t,
        description: d,
        projectId: pid,
        assigneeId: aid,
        dueDate: new Date(dd).toISOString(),
        priority: pr,
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      console.log("Created task response:", data);

      if (!res.ok) {
        onError((data as any).message || "Failed to create task");
        return;
      }

      setTitle("");
      setDescription("");
      setProjectId("");
      setAssigneeId("");
      setDueDate("");
      setPriority("medium");

      onClose();
      await onCreated();
    } catch {
      onError("Could not create task");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 px-4">
      <form onSubmit={submit} className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h3 className="text-xl font-bold text-slate-900">Add Task</h3>

        <input
          className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2.5"
          placeholder="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <textarea
          className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2.5"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        <select className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2.5" value={projectId} onChange={(e) => setProjectId(e.target.value)} required>
          <option value="">Select project</option>
          {projects.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </select>

        <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5" required>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2.5" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} required>
          <option value="">Select assignee</option>
          {assignees.map((u) => (
            <option key={u._id} value={u._id}>
              {u.name} ({u.role})
            </option>
          ))}
        </select>

        <div className="mt-3">
          <label className="mb-1 block text-xs font-semibold text-slate-600">Due date</label>
          <input type="date" className="w-full rounded-lg border border-slate-300 px-3 py-2.5" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !canSubmit}
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Saving..." : "Save Task"}
          </button>
        </div>
      </form>
    </div>
  );
}