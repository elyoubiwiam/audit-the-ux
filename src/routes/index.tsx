import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Eye, HeartHandshake, MousePointerClick } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UX Audit — Get an ethical UX audit of your website" },
      {
        name: "description",
        content:
          "Get an ethical UX audit of your website. Honest, human-centered feedback on usability, clarity, and trust.",
      },
      { property: "og:title", content: "UX Audit — Get an ethical UX audit of your website" },
      {
        property: "og:description",
        content:
          "Get an ethical UX audit of your website. Honest, human-centered feedback on usability, clarity, and trust.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const principles = [
  {
    icon: Eye,
    title: "Clarity first",
    text: "We look at whether visitors understand what you do within seconds.",
  },
  {
    icon: MousePointerClick,
    title: "Effortless flows",
    text: "We trace key journeys and point out every unnecessary step.",
  },
  {
    icon: HeartHandshake,
    title: "Ethics by default",
    text: "No dark patterns. We flag anything that pressures or misleads users.",
  },
];

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-6 py-6">
        <span className="text-lg font-semibold tracking-tight text-foreground">UX Audit</span>
        <Link
          to="/audit"
          className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          Start an audit
        </Link>
      </header>

      <main className="mx-auto max-w-4xl px-6">
        <section className="py-20 text-center sm:py-28">
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-primary">
            Honest feedback, no dark patterns
          </p>
          <h1 className="mx-auto max-w-2xl text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
            Get an ethical UX audit of your website
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            A clear, human-centered review of your site's usability — what works, what
            confuses, and what to fix first.
          </p>
          <Link
            to="/audit"
            className="mt-10 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-base font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
          >
            Audit my website
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        <section className="grid gap-6 pb-24 sm:grid-cols-3">
          {principles.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl border border-border bg-card p-6 text-left"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <p.icon className="h-5 w-5" />
              </div>
              <h2 className="text-base font-semibold text-foreground">{p.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.text}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        UX Audit — better experiences, ethically.
      </footer>
    </div>
  );
}
