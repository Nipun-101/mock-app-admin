import Link from "next/link";
import {
  DashboardOutlined,
  ExperimentOutlined,
  QuestionCircleOutlined,
  UploadOutlined,
} from "@ant-design/icons";

const FEATURES = [
  {
    title: "Question bank",
    description: "Create, edit, and bulk-import questions, then fix failed imports.",
    icon: <QuestionCircleOutlined />,
    accent: "#722ed1",
    tint: "#f9f0ff",
  },
  {
    title: "Mock papers",
    description: "Build topic-wise tests and full-exam papers for each exam.",
    icon: <ExperimentOutlined />,
    accent: "#13c2c2",
    tint: "#e6fffb",
  },
  {
    title: "Live snapshot",
    description: "See learners, attempts, and catalog counts on the admin dashboard.",
    icon: <DashboardOutlined />,
    accent: "#1677ff",
    tint: "#e6f4ff",
  },
  {
    title: "Catalog & uploads",
    description: "Maintain exams, subjects, topics, tags, and PDF bulk uploads.",
    icon: <UploadOutlined />,
    accent: "#fa8c16",
    tint: "#fff7e6",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-blue-200/50 blur-3xl" />
        <div className="absolute top-40 -right-10 h-80 w-80 rounded-full bg-violet-200/40 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-cyan-200/30 blur-3xl" />
      </div>

      <main className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <section>
            <p className="mb-3 inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
              Staff only
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Mock Test Admin
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-7 text-slate-600">
              Internal console for EZ Prep. Manage the question bank, papers,
              catalog, and uploads — this is not the student test-taking app.
            </p>
            <Link
              href="/login"
              className="mt-8 inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-[0_10px_24px_rgba(22,119,255,0.28)] transition hover:-translate-y-0.5 hover:bg-blue-700"
            >
              Sign in to admin
            </Link>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
                style={{ borderTop: `4px solid ${feature.accent}` }}
              >
                <span
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-lg"
                  style={{
                    color: feature.accent,
                    background: feature.tint,
                  }}
                >
                  {feature.icon}
                </span>
                <h2 className="mt-3 text-base font-semibold text-slate-800">
                  {feature.title}
                </h2>
                <p className="mt-1 mb-0 text-sm leading-6 text-slate-500">
                  {feature.description}
                </p>
              </div>
            ))}
          </section>
        </div>
      </main>
    </div>
  );
}
