ALTER TABLE public.audit_scans ADD COLUMN IF NOT EXISTS client_key text;
CREATE INDEX IF NOT EXISTS audit_scans_client_key_created_at_idx ON public.audit_scans (client_key, created_at DESC);