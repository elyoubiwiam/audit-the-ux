import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { z } from "zod";

const searchSchema = z.object({
  url: z.string().max(200).optional(),
  business: z.string().max(100).optional(),
});

export const Route = createFileRoute("/results")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Your audit is on its way — UX Audit" },
      {
        name: "description",
        content: "Your ethical UX audit request has been received.",
      },
      { property: "og:title", content: "Your audit is on its way — UX Audit" },
      {
        property: "og:description",
        content: "Your ethical UX audit request has been received.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Results,
});

function Results() {
  const { url, business } = Route.useSearch();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <main className="w-full max-w-lg text-center">
        <div className="mx-auto mb-6 inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <CheckCircle2 className="h-7 w-7" />
        </div>

        {url && business ? (
          <>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Your audit is on its way
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              We've received your request for{" "}
              <span className="font-medium text-foreground">{business}</span> (
              <span className="font-medium text-primary">{url}</span>). Your full ethical
              UX report is coming next — we're wiring up the analysis right now.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              No audit requested yet
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Start a new audit and we'll review your website's usability and ethics.
            </p>
          </>
        )}

        <Link
          to="/audit"
          className="mt-10 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-base font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
        >
          {url && business ? "Audit another site" : "Start an audit"}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </main>
    </div>
  );
}
