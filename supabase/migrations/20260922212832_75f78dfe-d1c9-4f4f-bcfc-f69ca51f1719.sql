ALTER TABLE public.audit_findings DROP COLUMN severity;
ALTER TABLE public.audit_findings ADD COLUMN category text;
ALTER TABLE public.audit_findings ADD COLUMN note text;