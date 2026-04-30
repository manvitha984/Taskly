import type { TaskPriority } from "./types";

export default function PriorityBadge({ priority }: { priority: TaskPriority }) {
  if (priority === "high") {
    return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">🔴 HIGH PRIORITY</span>;
  }

  if (priority === "low") {
    return <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-700">LOW</span>;
  }

  return <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-800">MEDIUM</span>;
}