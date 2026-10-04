-- HPI market data (CREA MLS Home Price Index, Ontario)
-- Populated via Admin -> HPI upload from the ontario-hpi-data.json file.
CREATE TABLE IF NOT EXISTS hpi_markets (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  last_updated TEXT,
  latest JSONB NOT NULL DEFAULT '{}',
  history_12m JSONB NOT NULL DEFAULT '[]',
  full_history JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
