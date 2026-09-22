import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  Link2,
  ListChecks,
  ScanSearch,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UX Audit — See what's persuading visitors on any landing page" },
      {
        name: "description",
        content:
          "Paste any landing page URL and get a plain-language breakdown of the persuasion techniques it uses — urgency, social proof, risk reversal, pricing psychology and more.",
      },
      {
        property: "og:title",
        content: "UX Audit — See what's persuading visitors on any landing page",
      },
      {
        property: "og:description",
        content:
          "Paste any landing page URL and get a plain-language breakdown of the persuasion techniques it uses — urgency, social proof, risk reversal, pricing psychology and more.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const steps = [
  {
    icon: Link2,
    title: "Paste a URL",
    text: "Give us the page you want to look at, plus a line about the business so the read has context.",
  },
  {
    icon: ScanSearch,
    title: "We read the page",
    text: "We respect the site's scanning rules, then read the copy, buttons and signals a visitor actually sees.",
  },
  {
    icon: ListChecks,
    title: "Get the breakdown",
    text: "A clean report of the persuasion techniques in use, grouped by type, with a note on how well each lands.",
  },
];

const useCases = [
  {
    title: "Audit your own landing page",
    text: "See which techniques are already doing the work — and which ones you're leaving on the table.",
  },
  {
    title: "Study what a competitor is doing well",
    text: "Understand the tactics behind a page that keeps converting the visitors you're losing.",
  },
  {
    title: "Learn real-world conversion techniques",
    text: "Spot persuasion patterns in the wild instead of in a textbook.",
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
          Analyze a page
        </Link>
      </header>

      <main className="mx-auto max-w-4xl px-6">
        <section className="py-16 text-center sm:py-24">
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-primary">
            For founders and marketers
          </p>
          <h1 className="mx-auto max-w-2xl text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
            See what's actually persuading visitors on any landing page
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Paste a URL and get a plain-language breakdown of the techniques a page uses to
            convince people — and how well each one is working.
          </p>
          <Link
            to="/audit"
            className="mt-10 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-base font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
          >
            Analyze a landing page
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-4 text-sm text-muted-foreground">Free to use. No account needed.</p>
        </section>

        <section className="pb-16">
          <h2 className="text-center text-2xl font-semibold tracking-tight text-foreground">
            How it works
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {steps.map((step, i) => (
              <div
                key={step.title}
                className="rounded-2xl border border-border bg-card p-6 text-left"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <step.icon className="h-5 w-5" />
                </div>
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  Step {i + 1}
                </p>
                <h3 className="mt-1 text-base font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-8 pb-10">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            What people use it for
          </h2>
          <ul className="mt-6 space-y-5">
            {useCases.map((useCase) => (
              <li key={useCase.title} className="flex gap-3">
                <Check className="mt-1 h-4 w-4 shrink-0 text-primary" />
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">{useCase.title}</span> —{" "}
                  {useCase.text}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="mt-16 border-t border-border py-8 text-center text-sm text-muted-foreground">
        UX Audit — see what makes a page convincing.
      </footer>
    </div>
  );
}
