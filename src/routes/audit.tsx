import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { runAudit } from "@/lib/audit.functions";

export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [
      { title: "Start your audit — UX Audit" },
      {
        name: "description",
        content: "Tell us the page and the business so we can break down its persuasion techniques.",
      },
      { property: "og:title", content: "Start your audit — UX Audit" },
      {
        property: "og:description",
        content:
          "Tell us the page and the business so we can break down its persuasion techniques.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuditForm,
});

const formSchema = z.object({
  url: z
    .string()
    .trim()
    .nonempty("Please enter your website URL")
    .max(200, "URL is too long")
    .refine(
      (v) => /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(v),
      "Please enter a valid URL, e.g. example.com",
    ),
  businessName: z
    .string()
    .trim()
    .nonempty("Please enter your business name")
    .max(100, "Business name must be under 100 characters"),
  description: z
    .string()
    .trim()
    .nonempty("Please describe your business or industry")
    .max(500, "Please keep it under 500 characters"),
});

type FormErrors = Partial<Record<keyof z.infer<typeof formSchema>, string>>;

function AuditForm() {
  const navigate = useNavigate();
  const audit = useServerFn(runAudit);
  const [url, setUrl] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = formSchema.safeParse({ url, businessName, description });
    if (!result.success) {
      const next: FormErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FormErrors;
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setSubmitError(null);
    setLoading(true);
    try {
      const scan = await audit({ data: result.data });
      await navigate({ to: "/results", search: { scan: scan.scanId } });
    } catch (error) {
      setSubmitError(
        error instanceof Error && error.message
          ? error.message
          : "Something went wrong. Please try again.",
      );
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-input bg-card px-4 py-3 text-base text-foreground placeholder:text-muted-foreground outline-none transition-shadow focus:border-primary focus:ring-2 focus:ring-ring/30";
  const labelClass = "mb-2 block text-sm font-medium text-foreground";
  const errorClass = "mt-1.5 text-sm text-destructive";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="mx-auto flex w-full max-w-xl items-center px-6 py-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-6 pb-24 pt-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Start your audit
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Three quick details — that's all we need to get started.
        </p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-6" noValidate>
          <div>
            <label htmlFor="url" className={labelClass}>
              Website URL
            </label>
            <input
              id="url"
              type="text"
              inputMode="url"
              placeholder="example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
              className={inputClass}
              aria-invalid={!!errors.url}
            />
            {errors.url && <p className={errorClass}>{errors.url}</p>}
          </div>

          <div>
            <label htmlFor="businessName" className={labelClass}>
              Business name
            </label>
            <input
              id="businessName"
              type="text"
              placeholder="Acme Studio"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              disabled={loading}
              className={inputClass}
              aria-invalid={!!errors.businessName}
            />
            {errors.businessName && <p className={errorClass}>{errors.businessName}</p>}
          </div>

          <div>
            <label htmlFor="description" className={labelClass}>
              What does your business do?
            </label>
            <textarea
              id="description"
              rows={4}
              placeholder="A short description of your business or industry…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              className={`${inputClass} resize-none`}
              aria-invalid={!!errors.description}
            />
            {errors.description && <p className={errorClass}>{errors.description}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-base font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-80"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Analyzing your site…
              </>
            ) : (
              "Run my audit"
            )}
          </button>

          {loading && (
            <p className="text-center text-sm text-muted-foreground">
              Checking the site's rules, reading the page and reviewing it — this can take up
              to a minute.
            </p>
          )}
          {submitError && (
            <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {submitError}
            </p>
          )}
        </form>
      </main>
    </div>
  );
}
