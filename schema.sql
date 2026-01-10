-- Pushups table
CREATE TABLE IF NOT EXISTS pushups (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by date and name
CREATE INDEX IF NOT EXISTS idx_pushups_date ON pushups(date);
CREATE INDEX IF NOT EXISTS idx_pushups_name ON pushups(name);
CREATE INDEX IF NOT EXISTS idx_pushups_date_name ON pushups(date, name);

-- Miles table
CREATE TABLE IF NOT EXISTS miles (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  distance DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by date and name
CREATE INDEX IF NOT EXISTS idx_miles_date ON miles(date);
CREATE INDEX IF NOT EXISTS idx_miles_name ON miles(name);
CREATE INDEX IF NOT EXISTS idx_miles_date_name ON miles(date, name);

-- Users table (for name dropdown)
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (optional, for public access)
ALTER TABLE pushups ENABLE ROW LEVEL SECURITY;
ALTER TABLE miles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow public read/write (adjust as needed for your security requirements)
CREATE POLICY "Allow public read pushups" ON pushups FOR SELECT USING (true);
CREATE POLICY "Allow public insert pushups" ON pushups FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read miles" ON miles FOR SELECT USING (true);
CREATE POLICY "Allow public insert miles" ON miles FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read users" ON users FOR SELECT USING (true);
CREATE POLICY "Allow public insert users" ON users FOR INSERT WITH CHECK (true);
