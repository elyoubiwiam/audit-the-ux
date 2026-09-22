CREATE TYPE public.audit_status AS ENUM ('completed','blocked','failed');
CREATE TYPE public.finding_severity AS ENUM ('low','medium','high');

CREATE TABLE public.audit_scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_name TEXT NOT NULL,
  business_description TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL,
  status public.audit_status NOT NULL DEFAULT 'completed',
  message TEXT,
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_findings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_id UUID NOT NULL REFERENCES public.audit_scans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  severity public.finding_severity NOT NULL,
  explanation TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_findings_scan_id ON public.audit_findings(scan_id);

GRANT ALL ON public.audit_scans TO service_role;
GRANT ALL ON public.audit_findings TO service_role;

ALTER TABLE public.audit_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_findings ENABLE ROW LEVEL SECURITY;