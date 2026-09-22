import { createFileRoute } from "@tanstack/react-router";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const CATEGORY_ORDER = [
  "Urgency & scarcity",
  "Social proof",
  "Authority & trust",
  "Risk reversal",
  "Anchoring & pricing psychology",
  "CTA design & friction reduction",
  "Storytelling & emotional framing",
  "Personalization & specificity",
  "Cognitive load & friction",
  "Attention & visual hierarchy",
  "Commitment & consistency",
  "Reciprocity",
  "Loss aversion & framing",
];

function slug(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "report"
  );
}

function clean(value: string) {
  // Standard PDF fonts only support WinAnsi, so normalise smart punctuation.
  return value
    .replace(/[\u2018\u2019\u201B]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, ", ")
    .replace(/\u2026/g, "...")
    .replace(/\u00a0/g, " ")
    // eslint-disable-next-line no-control-regex
    .replace(/[^\x09\x0a\x20-\x7e\u00a1-\u00ff]/g, "");
}

export const Route = createFileRoute("/api/public/report/$scanId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const scanId = params.scanId.replace(/\.pdf$/i, "");
        if (!/^[0-9a-f-]{36}$/i.test(scanId)) {
          return new Response("Not found", { status: 404 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: scan } = await supabaseAdmin
          .from("audit_scans")
          .select("id, business_name, url, status, message, summary, created_at")
          .eq("id", scanId)
          .maybeSingle();
        if (!scan) return new Response("Report not found", { status: 404 });

        const { data: rows } = await supabaseAdmin
          .from("audit_findings")
          .select("title, category, explanation, note, principle, evidence")
          .eq("scan_id", scan.id)
          .order("created_at", { ascending: true });
        const findings = rows ?? [];

        const pdf = await PDFDocument.create();
        const regular = await pdf.embedFont(StandardFonts.Helvetica);
        const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
        const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

        const width = 595.28;
        const height = 841.89;
        const margin = 56;
        const maxWidth = width - margin * 2;
        const ink = rgb(0.09, 0.11, 0.12);
        const muted = rgb(0.42, 0.45, 0.47);
        const accent = rgb(0.06, 0.43, 0.45);

        let page = pdf.addPage([width, height]);
        let y = height - margin;

        const newPage = () => {
          page = pdf.addPage([width, height]);
          y = height - margin;
        };

        const wrap = (text: string, font: typeof regular, size: number) => {
          const lines: string[] = [];
          for (const paragraph of text.split("\n")) {
            let line = "";
            for (const word of paragraph.split(/\s+/).filter(Boolean)) {
              const next = line ? `${line} ${word}` : word;
              if (font.widthOfTextAtSize(next, size) > maxWidth && line) {
                lines.push(line);
                line = word;
              } else {
                line = next;
              }
            }
            lines.push(line);
          }
          return lines;
        };

        const write = (
          text: string,
          opts: { font?: typeof regular; size?: number; color?: typeof ink; gap?: number } = {},
        ) => {
          const font = opts.font ?? regular;
          const size = opts.size ?? 10.5;
          const color = opts.color ?? ink;
          const lineHeight = size * 1.45;
          for (const line of wrap(clean(text), font, size)) {
            if (y - lineHeight < margin) newPage();
            y -= lineHeight;
            page.drawText(line, { x: margin, y, size, font, color });
          }
          y -= opts.gap ?? 4;
        };

        const date = new Date(scan.created_at).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        write(scan.business_name, { font: bold, size: 20, gap: 6 });
        write(scan.url, { size: 10, color: muted, gap: 2 });
        write(`Persuasion analysis, scanned on ${date}`, { size: 10, color: muted, gap: 16 });

        if (scan.status !== "completed") {
          write(
            scan.message ?? "This page could not be scanned.",
            { size: 11, gap: 10 },
          );
        } else {
          write(
            findings.length === 1
              ? "We identified 1 persuasion technique on this page."
              : `We identified ${findings.length} persuasion techniques on this page.`,
            { font: bold, size: 12, gap: 8 },
          );
          if (scan.summary) write(scan.summary, { size: 10.5, gap: 16 });

          const groups = new Map<string, typeof findings>();
          for (const f of findings) {
            const key = f.category ?? "Other";
            groups.set(key, [...(groups.get(key) ?? []), f]);
          }
          const ordered = [...groups.keys()].sort(
            (a, b) =>
              (CATEGORY_ORDER.indexOf(a) + 1 || 99) - (CATEGORY_ORDER.indexOf(b) + 1 || 99),
          );

          for (const category of ordered) {
            const items = groups.get(category)!;
            if (y < margin + 90) newPage();
            y -= 8;
            write(`${category.toUpperCase()} (${items.length})`, {
              font: bold,
              size: 10,
              color: accent,
              gap: 6,
            });
            for (const f of items) {
              if (y < margin + 70) newPage();
              write(f.title, { font: bold, size: 11.5, gap: 2 });
              if (f.principle) write(f.principle, { size: 9, color: muted, gap: 3 });
              write(f.explanation, { size: 10.5, gap: 3 });
              if (f.evidence) write(`"${f.evidence}"`, { font: italic, size: 10, color: muted, gap: 3 });
              if (f.note) write(f.note, { font: italic, size: 10, color: muted, gap: 3 });
              y -= 8;
            }
          }
        }

        const bytes = await pdf.save();
        const isoDate = new Date(scan.created_at).toISOString().slice(0, 10);
        const filename = `${slug(scan.business_name)}-ux-audit-${isoDate}.pdf`;

        return new Response(bytes as unknown as BodyInit, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="${filename}"`,
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
