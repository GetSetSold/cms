-- Shareable home valuations: one row per completed valuation, addressed by an
-- unguessable public_id. Inserted by the public /api/valuations endpoint (anon),
-- read back by /valuation/[id]. No list endpoint exists, so rows are only
-- reachable to someone holding the link.
CREATE TABLE IF NOT EXISTS valuations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id TEXT UNIQUE NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  details JSONB NOT NULL DEFAULT '{}',
  estimate_low INTEGER NOT NULL,
  estimate_mid INTEGER NOT NULL,
  estimate_high INTEGER NOT NULL,
  range_pct NUMERIC,
  listings JSONB NOT NULL DEFAULT '[]',
  hpi JSONB NOT NULL DEFAULT '{}',
  radius_km NUMERIC,
  data_as_of DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS valuations_public_id_idx ON valuations (public_id);
CREATE INDEX IF NOT EXISTS valuations_created_at_idx ON valuations (created_at DESC);

ALTER TABLE valuations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public insert valuations" ON valuations;
CREATE POLICY "public insert valuations" ON valuations
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "public read valuations" ON valuations;
CREATE POLICY "public read valuations" ON valuations
  FOR SELECT USING (true);
