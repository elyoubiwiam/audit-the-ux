import { Link, createFileRoute } from "@tanstack/react-router";
import {
  AlarmClock,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  Download,
  Eye,
  ExternalLink,
  Gift,
  Layers,
  MousePointerClick,
  Repeat,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Tag,
  Users,
  type LucideIcon,
} from "lucide-react";
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
      { title: "Your persuasion analysis | UX Audit" },
      {
        name: "description",
        content: "The persuasion and conversion techniques identified on your page.",
      },
      { property: "og:title", content: "Your persuasion analysis | UX Audit" },
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

const categoryIcons: Record<string, LucideIcon> = {
  "Urgency & scarcity": AlarmClock,
  "Social proof": Users,
  "Authority & trust": BadgeCheck,
  "Risk reversal": ShieldCheck,
  "Anchoring & pricing psychology": Tag,
  "CTA design & friction reduction": MousePointerClick,
  "Storytelling & emotional framing": BookOpen,
  "Personalization & specificity": Sparkles,
  "Cognitive load & friction": Layers,
  "Attention & visual hierarchy": Eye,
  "Commitment & consistency": Repeat,
  Reciprocity: Gift,
  "Loss aversion & framing": Scale,
};

const categoryStyles: Record<string, string> = {
  "Urgency & scarcity": "bg-orange-500/10 text-orange-700 border-orange-500/20",
  "Social proof": "bg-sky-500/10 text-sky-700 border-sky-500/20",
  "Authority & trust": "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  "Risk reversal": "bg-teal-500/10 text-teal-700 border-teal-500/20",
  "Anchoring & pricing psychology": "bg-violet-500/10 text-violet-700 border-violet-500/20",
  "CTA design & friction reduction": "bg-rose-500/10 text-rose-700 border-rose-500/20",
  "Storytelling & emotional framing": "bg-amber-500/10 text-amber-700 border-amber-500/20",
  "Personalization & specificity": "bg-cyan-500/10 text-cyan-700 border-cyan-500/20",
  "Cognitive load & friction": "bg-slate-500/10 text-slate-700 border-slate-500/20",
  "Attention & visual hierarchy": "bg-indigo-500/10 text-indigo-700 border-indigo-500/20",
  "Commitment & consistency": "bg-lime-600/10 text-lime-700 border-lime-600/20",
  Reciprocity: "bg-pink-500/10 text-pink-700 border-pink-500/20",
  "Loss aversion & framing": "bg-red-500/10 text-red-700 border-red-500/20",
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
        title={
          audit.status === "blocked" ? "This page can't be scanned" : "We couldn't finish this analysis"
        }
        body={audit.message ?? "Please try another page."}
        cta="Try another site"
        subject={`${audit.businessName} · ${audit.url}`}
      />
    );
  }

  const findings = audit.findings;

  const scanDate = new Date(audit.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const scanHref = /^https?:\/\//i.test(audit.url) ? audit.url : `https://${audit.url}`;

  const countLine =
    findings.length > 0
      ? `We identified ${findings.length} persuasion technique${findings.length === 1 ? "" : "s"} on this page.`
      : null;

  const categoryOrder = Object.keys(categoryStyles);
  const groups = new Map<string, typeof findings>();
  for (const finding of findings) {
    const key = finding.category || "Other";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(finding);
  }
  const orderedGroups = [...groups.entries()].sort(([a], [b]) => {
    const ia = categoryOrder.indexOf(a);
    const ib = categoryOrder.indexOf(b);
    return (ia === -1 ? categoryOrder.length : ia) - (ib === -1 ? categoryOrder.length : ib);
  });

  return (
    <div className="report-page min-h-screen bg-background px-5 py-10 sm:px-6 sm:py-16">
      <main className="mx-auto w-full max-w-2xl">
        <p className="text-sm font-medium text-muted-foreground">{audit.businessName}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <a
            href={scanHref}
            target="_blank"
            rel="noopener noreferrer"
            title={audit.url}
            className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Your URL</span>
          </a>
          <span className="text-sm text-muted-foreground">Scanned on {scanDate}</span>
        </div>

        <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          What's making this page convincing
        </h1>
        {countLine && <p className="mt-4 text-base font-medium text-foreground">{countLine}</p>}
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
            {orderedGroups.map(([category, items]) => {
              const Icon = categoryIcons[category] ?? Sparkles;
              const chip =
                categoryStyles[category] ?? "bg-primary/10 text-primary border-primary/20";
              return (
                <section key={category} className="mt-10 sm:mt-12">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${chip}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-foreground sm:text-sm">
                      {category}
                    </h2>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {items.length}
                    </span>
                  </div>
                  <ul className="mt-4 space-y-3">
                    {items.map((finding) => (
                      <li
                        key={finding.id}
                        className="finding-card rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"
                      >
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                          <h3 className="text-base font-semibold text-foreground">
                            {finding.title}
                          </h3>
                          {finding.principle && (
                            <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                              {finding.principle}
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                          {finding.explanation}
                        </p>
                        {finding.evidence && (
                          <p className="mt-2 border-l-2 border-border pl-3 text-sm leading-relaxed text-foreground/80">
                            "{finding.evidence}"
                          </p>
                        )}
                        {finding.note && (
                          <p className="mt-2 text-sm italic leading-relaxed text-muted-foreground/80">
                            {finding.note}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </>
        )}

        <div className="no-print mt-10 flex flex-wrap items-center gap-3 sm:mt-12">
          <Link
            to="/audit"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-base font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
          >
            Run another scan
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href={`/api/public/report/${audit.scanId}.pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Download className="h-4 w-4" />
            Open PDF
          </a>
        </div>
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
    <div className="flex min-h-screen items-center justify-center bg-background px-5 sm:px-6">
      <main className="w-full max-w-lg text-center">
        <div className="mx-auto mb-6 inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
          {icon}
        </div>
        {subject && <p className="mb-3 break-words text-sm text-muted-foreground">{subject}</p>}
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
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
