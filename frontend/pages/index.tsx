import Link from "next/link";
import { useEffect, useState } from "react";

const features = [
  {
    title: "Organize Projects",
    description: "Plan and structure your workspaces, tasks, and timelines efficiently.",
  },
  {
    title: "Manage Tasks",
    description: "Track status, due dates, and assignments for smooth project flow.",
  },
  {
    title: "Team Collaboration",
    description: "Share updates, comment, and coordinate with your team seamlessly.",
  },
  {
    title: "Insights & Reports",
    description: "Analyze progress and productivity with clear dashboards.",
  },
];

const footerLinks = ["About", "Contact", "Privacy Policy", "Terms"];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(Boolean(localStorage.getItem("taskly_token")));
  }, []);

  const logout = () => {
    localStorage.removeItem("taskly_token");
    localStorage.removeItem("taskly_user");
    setIsLoggedIn(false);
  };

  return (
    <main className="scroll-smooth bg-slate-50 text-slate-900 selection:bg-cyan-200 selection:text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900 text-lg">
            Taskly
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            <a href="#home" className="text-sm text-slate-600 transition hover:text-slate-900">Home</a>
            <a href="#features" className="text-sm text-slate-600 transition hover:text-slate-900">Features</a>
            <a href="#pricing" className="text-sm text-slate-600 transition hover:text-slate-900">Pricing</a>

            {isLoggedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-sm text-slate-600 transition hover:text-slate-900"
                >
                  Dashboard
                </Link>
                <button
                  onClick={logout}
                  className="rounded-lg border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm text-slate-600 transition hover:text-slate-900">Login</Link>
                <Link
                  href="/signup"
                  className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-white transition hover:scale-105 hover:bg-cyan-500"
                >
                  Signup
                </Link>
              </>
            )}
          </nav>

          <button
            type="button"
            className="inline-flex items-center rounded-lg border border-slate-200 p-2 text-slate-600 md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-slate-200 bg-white/95 px-4 py-4 md:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-3">
              <a href="#home" className="rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100">Home</a>
              <a href="#features" className="rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100">Features</a>
              <a href="#pricing" className="rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100">Pricing</a>

              {isLoggedIn ? (
                <>
                  <Link
                    href="/dashboard"
                    className="rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={logout}
                    className="rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100">Login</Link>
                  <Link
                    href="/signup"
                    className="rounded-md bg-cyan-400 px-3 py-2 font-semibold text-white hover:bg-cyan-500"
                  >
                    Signup
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section id="home" className="relative overflow-hidden bg-gradient-to-b from-cyan-50 to-white">
        <div className="mx-auto grid min-h-[calc(100vh-70px)] w-full max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="fade-up">
            <h1 className="text-4xl font-extrabold sm:text-5xl lg:text-6xl">
              Simplify Project Management
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-700 sm:text-xl">
              Organize your tasks, projects, and team collaboration in a single modern workspace.
            </p>

            {!isLoggedIn && (
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/login"
                  className="rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-white transition hover:scale-105 hover:bg-cyan-500"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-900 transition hover:scale-105 hover:bg-slate-100"
                >
                  Signup
                </Link>
              </div>
            )}
          </div>

          <div className="fade-up delay-2">
            <div className="relative mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-4 shadow-lg">
              <p className="text-slate-700">Your project preview or dashboard snapshot goes here.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="fade-up text-center">
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Features</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-700">
            Everything your team needs to stay organized and deliver on time.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature, idx) => (
            <article
              key={feature.title}
              className={`fade-up delay-${idx + 1} rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:scale-[1.01] hover:shadow-lg`}
            >
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{feature.title}</h3>
              <p className="mt-2 text-sm text-slate-700">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section id="pricing" className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="fade-up rounded-3xl border border-cyan-300/30 bg-cyan-50 p-8 text-center sm:p-12">
          <h2 className="text-3xl font-extrabold sm:text-4xl">Ready to organize your work?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-700">
            Start your modern project workflow and collaborate with your team efficiently.
          </p>
          {!isLoggedIn && (
            <div className="mt-7">
              <Link
                href="/signup"
                className="inline-flex rounded-xl bg-cyan-400 px-7 py-3 font-semibold text-white transition hover:scale-105 hover:bg-cyan-500"
              >
                Get Started Free
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-3 lg:px-8">
          <div>
            <span className="text-lg font-semibold text-slate-900">Taskly</span>
            <p className="mt-3 max-w-sm text-sm text-slate-700">
              Modern project and task management platform for ambitious teams.
            </p>
          </div>

          <div className="flex flex-wrap items-start gap-4 text-sm text-slate-700 lg:justify-center">
            {footerLinks.map((link) => (
              <a key={link} href="#" className="transition hover:text-cyan-500">
                {link}
              </a>
            ))}
          </div>

          <div className="flex items-start gap-3 lg:justify-end">
            {["X", "In", "Gh"].map((social) => (
              <a
                key={social}
                href="#"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 transition hover:scale-105 hover:border-cyan-400 hover:text-cyan-500"
                aria-label={`Social ${social}`}
              >
                {social}
              </a>
            ))}
          </div>
        </div>
      </footer>

      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }

        .fade-up {
          opacity: 0;
          transform: translateY(18px);
          animation: fadeUp 0.7s ease forwards;
        }

        .delay-1 { animation-delay: 0.05s; }
        .delay-2 { animation-delay: 0.12s; }
        .delay-3 { animation-delay: 0.2s; }
        .delay-4 { animation-delay: 0.28s; }

        @keyframes fadeUp {
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}