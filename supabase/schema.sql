-- ==============================================================================
-- Shivamogga GIS Civic Reporting Platform - Production Database Schema
-- Supabase PostgreSQL Setup Script
-- ==============================================================================

-- 1. Create Enum Types (Optional validation for issue category and waste type)
DO $$ BEGIN
  CREATE TYPE report_status AS ENUM ('Unresolved', 'Verified', 'Flagged', 'Resolved');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create Reports Table
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    issue_type TEXT DEFAULT 'Garbage',
    issue_category TEXT NOT NULL,
    waste_type TEXT NOT NULL,
    photo_url TEXT,
    cleanup_photo_url TEXT,
    has_garbage_vehicle BOOLEAN DEFAULT false,
    also_seen_count INTEGER DEFAULT 0,
    village TEXT,
    taluk TEXT,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    status TEXT DEFAULT 'Unresolved' CHECK (status IN ('Unresolved', 'Verified', 'Flagged', 'Resolved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Add missing columns if table already existed prior to migration
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS cleanup_photo_url TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS has_garbage_vehicle BOOLEAN DEFAULT false;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS also_seen_count INTEGER DEFAULT 0;

-- 3. Create Performance & Geospatial Indexes
CREATE INDEX IF NOT EXISTS idx_reports_lat_lng ON public.reports (lat, lng);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports (status);
CREATE INDEX IF NOT EXISTS idx_reports_taluk ON public.reports (taluk);
CREATE INDEX IF NOT EXISTS idx_reports_village ON public.reports (village);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 5. Define RLS Policies for Public Civic Access
CREATE POLICY "Allow public read access to reports"
    ON public.reports FOR SELECT
    USING (true);

CREATE POLICY "Allow public insert to reports"
    ON public.reports FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow public update to reports"
    ON public.reports FOR UPDATE
    USING (true);

-- 6. Trigger for updated_at Column
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_reports_modtime ON public.reports;
CREATE TRIGGER update_reports_modtime
    BEFORE UPDATE ON public.reports
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- 7. Supabase Realtime Publication Setup
ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;

-- 8. Storage Bucket Setup
INSERT INTO storage.buckets (id, name, public) 
VALUES ('report-photos', 'report-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Read Report Photos" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'report-photos');

CREATE POLICY "Public Upload Report Photos" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'report-photos');
