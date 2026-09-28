-- Migration: Optimize Kiosk Fingerprint & Transaction Speed
-- Indexes for instant student transaction lookup and wallet summaries

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_student_created
ON public.transactions(student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_fingerprints
ON public.students(id);

-- SQL view for fast balance / total credit / total used / count
CREATE OR REPLACE VIEW public.student_wallet_summary AS
SELECT
  t.student_id,
  COUNT(t.id) AS transaction_count,
  COALESCE(SUM(t.amount), 0) AS total_used,
  COALESCE(SUM(CASE WHEN t.created_at >= CURRENT_DATE THEN t.amount ELSE 0 END), 0) AS today_used,
  MAX(t.created_at) AS last_transaction_at
FROM public.transactions t
GROUP BY t.student_id;
