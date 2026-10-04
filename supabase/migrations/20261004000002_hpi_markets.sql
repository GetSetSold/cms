-- HPI market data (CREA MLS Home Price Index, Ontario)
-- Populated via Admin -> Market Data upload from the ontario-hpi-data.json file.
CREATE TABLE IF NOT EXISTS hpi_markets (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  last_updated TEXT,
  latest JSONB NOT NULL DEFAULT '{}',
  history_12m JSONB NOT NULL DEFAULT '[]',
  full_history JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE hpi_markets ENABLE ROW LEVEL SECURITY;

-- Public read: trends pages query with the anon key (server-side).
DROP POLICY IF EXISTS "Public read HPI markets" ON hpi_markets;
CREATE POLICY "Public read HPI markets"
  ON hpi_markets FOR SELECT
  TO anon, authenticated
  USING (true);

-- Staff write: admin uploader upserts with the editor's session.
DROP POLICY IF EXISTS "Staff insert HPI markets" ON hpi_markets;
CREATE POLICY "Staff insert HPI markets"
  ON hpi_markets FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Staff update HPI markets" ON hpi_markets;
CREATE POLICY "Staff update HPI markets"
  ON hpi_markets FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
