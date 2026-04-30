import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/router";

type SignupResponse = {
  token?: string;
  message?: string;
  user?: {
    _id: string;
    name: string;
    email: string;
    role?: "admin" | "leader" | "user";
    organizationId: string;
  };
};

function parseJwt(token: string) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export default function SignupPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    organizationName: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data: SignupResponse = await res.json();

      if (!res.ok) {
        setError(data.message || "Signup failed");
        return;
      }

      if (!data.token) {
        setError(data.message || "Signup succeeded but token was not returned");
        return;
      }

      localStorage.setItem("taskly_token", data.token);

      const decoded = parseJwt(data.token);
      const user = data.user || {
        _id: decoded?.userId || "",
        email: decoded?.email || form.email,
        role: decoded?.role || "admin",
        name: form.name || "User",
        organizationId: decoded?.organizationId || "",
      };
      localStorage.setItem("taskly_user", JSON.stringify(user));

      router.push("/dashboard");
    } catch {
      setError("Cannot reach backend. Start backend on port 5000.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-2">
        <section className="hidden lg:block">
          <p className="mb-3 inline-flex rounded-full border border-cyan-300/60 bg-cyan-100/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">
            Get Started
          </p>
          <h1 className="text-4xl font-extrabold leading-tight text-slate-900">
            Build your Taskly workspace in minutes.
          </h1>
          <p className="mt-4 max-w-md text-slate-600">
            Create your account, set up your organization, and start managing projects with a clean workflow.
          </p>
        </section>

        <section>
          <form
            onSubmit={submit}
            className="mx-auto w-full max-w-md rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-xl shadow-cyan-100/50 backdrop-blur"
          >
            <h2 className="text-2xl font-bold text-slate-900">Create Account</h2>
            <p className="mt-1 text-sm text-slate-600">Start your Taskly workspace.</p>

            {error && (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="mt-5 space-y-4">
              <input
                placeholder="Name"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />

              <input
                type="email"
                placeholder="Email"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                required
              />

              <input
                type="password"
                placeholder="Password"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                required
              />

              <input
                placeholder="Organization Name"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                value={form.organizationName}
                onChange={(e) => setForm((prev) => ({ ...prev, organizationName: e.target.value }))}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-5 w-full rounded-lg bg-cyan-500 py-2.5 font-semibold text-white transition hover:scale-[1.01] hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating..." : "Sign Up"}
            </button>

            <div className="mt-4 flex items-center justify-between text-sm">
              <p className="text-slate-600">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-cyan-700 hover:text-cyan-800">
                  Login
                </Link>
              </p>
              <Link href="/" className="text-slate-500 hover:text-slate-700">
                Back to Home
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}