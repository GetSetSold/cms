-- City hub performance: SQL aggregation RPC functions
-- Replaces full-table scans in getCityStats, getHoodsForCity, and province page
-- Run this in the MLS Supabase project (nkjxlwuextxzpeohutxz)
--
-- Before: city pages downloaded EVERY listing (2,500+ rows for Hamilton,
-- 57,000 rows for province page) to compute stats in JavaScript
-- After: single-row aggregation results via these RPC functions

-- 1. City stats: counts, medians, in one query
CREATE OR REPLACE FUNCTION get_city_stats(cities TEXT[])
RETURNS TABLE (
  active_count BIGINT,
  sale_count BIGINT,
  lease_count BIGINT,
  median_sale NUMERIC,
  median_lease NUMERIC
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*),
    COUNT("ListPrice"),
    COUNT("TotalActualRent"),
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY "ListPrice"),
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY "TotalActualRent")
  FROM grid
  WHERE "City" = ANY(cities);
$$;

-- 2. Structure type breakdown for a city
CREATE OR REPLACE FUNCTION get_city_type_breakdown(cities TEXT[])
RETURNS TABLE (
  label TEXT,
  count BIGINT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(NULLIF(TRIM("StructureTypeText"), ''), 'Other') AS label,
    COUNT(*) AS count
  FROM grid
  WHERE "City" = ANY(cities)
  GROUP BY label
  ORDER BY count DESC
  LIMIT 6;
$$;

-- 3. Neighbourhood counts for a city (from property table)
CREATE OR REPLACE FUNCTION get_hoods_for_city(cities TEXT[])
RETURNS TABLE (
  hood TEXT,
  count BIGINT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    hood_name AS hood,
    COUNT(*) AS count
  FROM (
    SELECT COALESCE(
      NULLIF(TRIM("CityRegion"), ''),
      NULLIF(TRIM("SubdivisionName"), '')
    ) AS hood_name
    FROM property
    WHERE "City" = ANY(cities)
  ) sub
  WHERE hood_name IS NOT NULL
  GROUP BY hood_name
  HAVING COUNT(*) >= 5
  ORDER BY COUNT(*) DESC;
$$;

-- 4. All cities with listing counts (for province page)
-- Single aggregation query replaces 57k-row download
CREATE OR REPLACE FUNCTION get_all_city_counts()
RETURNS TABLE (
  city TEXT,
  count BIGINT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT "City" AS city, COUNT(*) AS count
  FROM grid
  GROUP BY "City"
  ORDER BY COUNT(*) DESC;
$$;

-- 5. Neighbourhood stats (for /:city-real-estate/:hood pages)
CREATE OR REPLACE FUNCTION get_hood_stats(cities TEXT[], hood TEXT)
RETURNS TABLE (
  active_count BIGINT,
  sale_count BIGINT,
  lease_count BIGINT,
  median_sale NUMERIC,
  median_lease NUMERIC
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*),
    COUNT("ListPrice"),
    COUNT("TotalActualRent"),
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY "ListPrice"),
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY "TotalActualRent")
  FROM property
  WHERE "City" = ANY(cities)
    AND (TRIM("CityRegion") = hood OR TRIM("SubdivisionName") = hood);
$$;

-- 6. Neighbourhood structure type breakdown
CREATE OR REPLACE FUNCTION get_hood_type_breakdown(cities TEXT[], hood TEXT)
RETURNS TABLE (
  label TEXT,
  count BIGINT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(NULLIF(TRIM("StructureType"::TEXT), ''), 'Other') AS label,
    COUNT(*) AS count
  FROM property
  WHERE "City" = ANY(cities)
    AND (TRIM("CityRegion") = hood OR TRIM("SubdivisionName") = hood)
  GROUP BY label
  ORDER BY COUNT(*) DESC
  LIMIT 6;
$$;

-- Grant anon access (the site queries with the anon key)
GRANT EXECUTE ON FUNCTION get_city_stats(TEXT[]) TO anon;
GRANT EXECUTE ON FUNCTION get_city_type_breakdown(TEXT[]) TO anon;
GRANT EXECUTE ON FUNCTION get_hoods_for_city(TEXT[]) TO anon;
GRANT EXECUTE ON FUNCTION get_all_city_counts() TO anon;
GRANT EXECUTE ON FUNCTION get_hood_stats(TEXT[], TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_hood_type_breakdown(TEXT[], TEXT) TO anon;
