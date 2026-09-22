import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Link2,
  ListChecks,
  ScanSearch,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UX Audit: what's persuading visitors on any landing page" },
      {
        name: "description",
        content:
          "Paste any landing page URL and get a plain-language breakdown of the persuasion techniques it uses: urgency, social proof, risk reversal, pricing psychology and more.",
      },
      {
        property: "og:title",
        content: "UX Audit: what's persuading visitors on any landing page",
      },
      {
        property: "og:description",
        content:
          "Paste any landing page URL and get a plain-language breakdown of the persuasion techniques it uses: urgency, social proof, risk reversal, pricing psychology and more.",
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
    text: "See which techniques are already doing the work, and which ones you're leaving on the table.",
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

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-5 py-5 sm:px-6 sm:py-6">
        <span className="text-lg font-semibold tracking-tight text-foreground">UX Audit</span>
        <Link
          to="/audit"
          className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          Analyze a page
        </Link>
      </header>

      <main>
        <section className="mx-auto max-w-4xl px-5 pb-14 pt-10 text-center sm:px-6 sm:pb-20 sm:pt-20">
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-primary">
            For founders and marketers
          </p>
          <h1 className="mx-auto max-w-2xl text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
            See what's actually persuading visitors on any landing page
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Paste a URL and get a plain-language breakdown of the psychological techniques a page uses to
            convince people, and how well each one is working.
          </p>
          <Link
            to="/audit"
            className="mt-10 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-base font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
          >
            Analyze a landing page
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-4 text-sm text-muted-foreground">Free to use. No account needed.</p>

          <button
            type="button"
            onClick={() => scrollToSection("how-it-works")}
            className="mx-auto mt-12 flex flex-col items-center gap-1 text-xs font-medium uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
          >
            See how it works
            <ChevronDown className="h-5 w-5 animate-bounce" />
          </button>
        </section>

        <section
          id="how-it-works"
          className="scroll-mt-8 border-y border-border bg-secondary py-14 sm:py-20"
        >
          <div className="mx-auto max-w-4xl px-5 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-medium uppercase tracking-widest text-primary">
                How it works
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Three steps, about a minute
              </h2>
              <p className="mt-4 text-base text-muted-foreground sm:text-lg">
                No setup, no plugin, no account. You stay on this page the whole way through.
              </p>
            </div>

            <ol className="mt-10 grid gap-6 sm:mt-14 sm:grid-cols-3">
              {steps.map((step, i) => (
                <li
                  key={step.title}
                  className="relative rounded-2xl border border-border bg-card p-6 text-left"
                >
                  <div className="mb-4 flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground">
                      {i + 1}
                    </span>
                    <step.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
                  {i < steps.length - 1 && (
                    <span className="absolute -right-4 top-1/2 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background text-muted-foreground sm:flex">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </li>
              ))}
            </ol>

            <div className="mt-10 flex flex-col items-center gap-2 border-t border-border/70 pt-8 sm:mt-14">
              <p className="text-sm text-muted-foreground">
                Keep scrolling for what people use it for, and where to start.
              </p>
              <button
                type="button"
                onClick={() => scrollToSection("use-cases")}
                className="text-muted-foreground transition-colors hover:text-primary"
                aria-label="Scroll to the next section"
              >
                <ChevronDown className="h-5 w-5 animate-bounce" />
              </button>
            </div>
          </div>
        </section>

        <section
          id="use-cases"
          className="mx-auto max-w-4xl scroll-mt-8 px-5 py-14 sm:px-6 sm:py-20"
        >
          <div className="rounded-2xl border border-border bg-card p-6 pb-8 sm:p-8 sm:pb-10">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              What people use it for
            </h2>
            <ul className="mt-6 space-y-5">
              {useCases.map((useCase) => (
                <li key={useCase.title} className="flex gap-3">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    <span className="font-semibold text-foreground">{useCase.title}.</span>{" "}
                    {useCase.text}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-5 pb-14 sm:px-6 sm:pb-20">
          <div className="rounded-3xl border border-border bg-secondary px-6 py-10 text-center sm:px-10 sm:py-14">
            <h2 className="mx-auto max-w-lg text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Ready to see what's working on your page?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-base text-muted-foreground">
              Drop in a URL and get the full breakdown in under a minute.
            </p>
            <Link
              to="/audit"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-base font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
            >
              Start now
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              Free to use. No account needed.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-5 py-8 text-center text-sm text-muted-foreground">
        UX Audit. See what makes a page convincing.
      </footer>
    </div>
  );
}
