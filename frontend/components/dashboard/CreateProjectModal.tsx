import { FormEvent, useMemo, useState } from "react";
import { createProject } from "./api";

export default function CreateProjectModal({
  token,
  onClose,
  onCreated,
  onError,
}: {
  token: string | null;
  onClose: () => void;
  onCreated: () => void | Promise<void>;
  onError: (message: string) => void;
}) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => Boolean(name.trim()), [name]);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) return;

    const n = name.trim();
    if (!n) {
      onError("Please enter a project name.");
      return;
    }

    setSubmitting(true);
    try {
      await createProject(token, { name: n, status: "active" });
      setName("");
      onClose();
      await onCreated();
    } catch (err) {
      onError((err as Error).message || "Could not create project");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 px-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h3 className="text-xl font-bold text-slate-900">Create Project</h3>
        <input
          className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2.5"
          placeholder="Project name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !canSubmit}
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Creating..." : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}