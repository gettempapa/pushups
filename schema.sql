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

-- Stolen Valor accusations table
CREATE TABLE IF NOT EXISTS stolen_valor (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stolen_valor_name ON stolen_valor(name);

ALTER TABLE stolen_valor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read stolen_valor" ON stolen_valor FOR SELECT USING (true);
CREATE POLICY "Allow public insert stolen_valor" ON stolen_valor FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete stolen_valor" ON stolen_valor FOR DELETE USING (true);

-- Foods reference table (based on 2026 Dietary Guidelines)
CREATE TABLE IF NOT EXISTS foods (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  tier INTEGER NOT NULL,
  points INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_foods_name ON foods(name);
CREATE INDEX IF NOT EXISTS idx_foods_category ON foods(category);
CREATE INDEX IF NOT EXISTS idx_foods_tier ON foods(tier);

ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read foods" ON foods FOR SELECT USING (true);

-- Food logs table
CREATE TABLE IF NOT EXISTS food_logs (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  food_id BIGINT REFERENCES foods(id),
  food_name TEXT NOT NULL,
  points INTEGER NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_food_logs_date ON food_logs(date);
CREATE INDEX IF NOT EXISTS idx_food_logs_name ON food_logs(name);
CREATE INDEX IF NOT EXISTS idx_food_logs_date_name ON food_logs(date, name);

ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read food_logs" ON food_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert food_logs" ON food_logs FOR INSERT WITH CHECK (true);
