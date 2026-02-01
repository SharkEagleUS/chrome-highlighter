-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for highlight colors
CREATE TYPE highlight_color AS ENUM ('yellow', 'red', 'green', 'lightBlue', 'lightPurple');

-- Create highlights table
CREATE TABLE IF NOT EXISTS highlights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  text TEXT NOT NULL,
  xpath TEXT NOT NULL,
  start_offset INTEGER NOT NULL,
  end_offset INTEGER NOT NULL,
  before_context TEXT NOT NULL,
  after_context TEXT NOT NULL,
  comment TEXT,
  tags TEXT[],
  color highlight_color DEFAULT 'yellow',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create sync_metadata table for tracking device synchronization
CREATE TABLE IF NOT EXISTS sync_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  last_sync_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_highlights_user_id ON highlights(user_id);
CREATE INDEX IF NOT EXISTS idx_highlights_url ON highlights(url);
CREATE INDEX IF NOT EXISTS idx_highlights_user_url ON highlights(user_id, url);
CREATE INDEX IF NOT EXISTS idx_highlights_created_at ON highlights(created_at);
CREATE INDEX IF NOT EXISTS idx_sync_metadata_user_id ON sync_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_metadata_device_id ON sync_metadata(device_id);

-- Enable Row Level Security
ALTER TABLE highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_metadata ENABLE ROW LEVEL SECURITY;

-- RLS Policies for highlights table
-- Users can only see their own highlights
CREATE POLICY "Users can view their own highlights"
  ON highlights FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own highlights
CREATE POLICY "Users can insert their own highlights"
  ON highlights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own highlights
CREATE POLICY "Users can update their own highlights"
  ON highlights FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own highlights
CREATE POLICY "Users can delete their own highlights"
  ON highlights FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for sync_metadata table
-- Users can view their own sync metadata
CREATE POLICY "Users can view their own sync metadata"
  ON sync_metadata FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own sync metadata
CREATE POLICY "Users can insert their own sync metadata"
  ON sync_metadata FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own sync metadata
CREATE POLICY "Users can update their own sync metadata"
  ON sync_metadata FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own sync metadata
CREATE POLICY "Users can delete their own sync metadata"
  ON sync_metadata FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at on highlights
CREATE TRIGGER update_highlights_updated_at
  BEFORE UPDATE ON highlights
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
