import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, ShieldAlert } from "lucide-react";
import { z } from "zod";

import { getAudit } from "@/lib/audit.functions";

const searchSchema = z.object({
  scan: z.string().uuid().optional(),
});

export const Route = createFileRoute("/results")({
  validateSearch: (search) => searchSchema.parse(search),
  loaderDeps: ({ search }) => ({ scan: search.scan }),
  loader: async ({ deps }) => (deps.scan ? getAudit({ data: { scanId: deps.scan } }) : null),
  head: () => ({
    meta: [
      { title: "Your persuasion analysis — UX Audit" },
      {
        name: "description",
        content: "The persuasion and conversion techniques identified on your page.",
      },
      { property: "og:title", content: "Your persuasion analysis — UX Audit" },
      {
        property: "og:description",
        content: "The persuasion and conversion techniques identified on your page.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Results,
});

const categoryStyles: Record<string, string> = {
  "Urgency & scarcity": "bg-orange-500/10 text-orange-700 border-orange-500/20",
  "Social proof": "bg-sky-500/10 text-sky-700 border-sky-500/20",
  "Authority & trust": "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  "Risk reversal": "bg-teal-500/10 text-teal-700 border-teal-500/20",
  "Anchoring & pricing psychology": "bg-violet-500/10 text-violet-700 border-violet-500/20",
  "CTA design & friction reduction": "bg-rose-500/10 text-rose-700 border-rose-500/20",
  "Storytelling & emotional framing": "bg-amber-500/10 text-amber-700 border-amber-500/20",
  "Personalization & specificity": "bg-cyan-500/10 text-cyan-700 border-cyan-500/20",
};

function Results() {
  const audit = Route.useLoaderData();

  if (!audit) {
    return (
      <Shell
        icon={<CheckCircle2 className="h-7 w-7" />}
        title="No analysis requested yet"
        body="Start a new scan and we'll break down the persuasion techniques on your website."
        cta="Start an analysis"
      />
    );
  }

  if (audit.status !== "completed") {
    return (
      <Shell
        icon={<ShieldAlert className="h-7 w-7" />}
        title={audit.status === "blocked" ? "This page can't be scanned" : "We couldn't finish this analysis"}
        body={audit.message ?? "Please try another page."}
        cta="Try another site"
        subject={`${audit.businessName} — ${audit.url}`}
      />
    );
  }

  const findings = audit.findings;

  const scanDate = new Date(audit.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const countLine =
    findings.length > 0
      ? `${findings.length} persuasion technique${findings.length === 1 ? "" : "s"} identified on this page.`
      : null;

  return (
    <div className="min-h-screen bg-background px-6 py-16">
      <main className="mx-auto w-full max-w-2xl">
        <p className="text-sm font-medium text-muted-foreground">
          {audit.businessName} · {audit.url}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">Scanned on {scanDate}</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground">
          What's making this page convincing
        </h1>
        {countLine && (
          <p className="mt-4 text-base font-medium text-foreground">{countLine}</p>
        )}
        {audit.summary && (
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">{audit.summary}</p>
        )}

        {findings.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-border bg-card p-6">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">No techniques identified</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We didn't spot any recognizable persuasion or conversion techniques on this page.
            </p>
          </div>
        ) : (
          <>
            <h2 className="mt-12 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Techniques identified
            </h2>
            <ul className="mt-4 space-y-4">
              {findings.map((finding) => (
                <li
                  key={finding.id}
                  className="rounded-2xl border border-border bg-card p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-base font-semibold text-foreground">{finding.title}</h3>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        categoryStyles[finding.category] ?? "bg-primary/10 text-primary border-primary/20"
                      }`}
                    >
                      {finding.category}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {finding.explanation}
                  </p>
                  {finding.note && (
                    <p className="mt-2 text-sm italic leading-relaxed text-muted-foreground/80">
                      {finding.note}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}

        <Link
          to="/audit"
          className="mt-12 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-base font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
        >
          Run another scan
          <ArrowRight className="h-4 w-4" />
        </Link>
      </main>
    </div>
  );
}

function Shell({
  icon,
  title,
  body,
  cta,
  subject,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  cta: string;
  subject?: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <main className="w-full max-w-lg text-center">
        <div className="mx-auto mb-6 inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
          {icon}
        </div>
        {subject && <p className="mb-3 text-sm text-muted-foreground">{subject}</p>}
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">{body}</p>
        <Link
          to="/audit"
          className="mt-10 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-base font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
        >
          {cta}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </main>
    </div>
  );
}

