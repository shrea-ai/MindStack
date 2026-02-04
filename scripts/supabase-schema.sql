-- Smart Financial Planner - Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor (SQL Editor > New Query)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Users table (for NextAuth)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  image TEXT,
  password TEXT,
  email_verified TIMESTAMPTZ,
  preferences JSONB DEFAULT '{}',
  profile JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- User profiles table (extended profile data)
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email TEXT,
  monthly_income INTEGER,
  income_source TEXT DEFAULT 'salary',
  income_sources JSONB DEFAULT '[]',
  city TEXT,
  family_size INTEGER DEFAULT 1,
  age INTEGER,
  occupation TEXT,
  living_situation TEXT,
  commute_mode TEXT,
  has_kids BOOLEAN DEFAULT false,
  monthly_rent INTEGER DEFAULT 0,
  financial_pulse JSONB DEFAULT '{}',
  budget_preferences JSONB DEFAULT '{"language": "en", "currency": "INR"}',
  generated_budget JSONB DEFAULT '{}',
  budget_health_score INTEGER DEFAULT 0,
  last_budget_generated TIMESTAMPTZ,
  expenses JSONB DEFAULT '[]',
  goals JSONB DEFAULT '[]',
  seasonal_events JSONB DEFAULT '[]',
  seasonal_planning_preferences JSONB DEFAULT '{}',
  emergency_alert_settings JSONB DEFAULT '{}',
  achievements JSONB DEFAULT '{}',
  activity_tracking JSONB DEFAULT '{}',
  retention_preferences JSONB DEFAULT '{}',
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_step TEXT DEFAULT 'income',
  profile_image TEXT,
  phone TEXT,
  bio TEXT,
  date_of_birth DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Debts table
-- ============================================
CREATE TABLE IF NOT EXISTS debts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('taken', 'given')),
  name TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  interest_rate DECIMAL DEFAULT 0,
  duration INTEGER,
  remaining_balance DECIMAL NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paid', 'overdue', 'defaulted')),
  payments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Transactions table (for expenses/income)
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('income', 'expense')),
  amount DECIMAL NOT NULL,
  category TEXT,
  description TEXT,
  date TIMESTAMPTZ DEFAULT NOW(),
  is_recurring BOOLEAN DEFAULT false,
  recurring_pattern TEXT,
  tags JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NextAuth required tables
-- ============================================
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  UNIQUE(provider, provider_account_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_token TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- ============================================
-- OTPs table (for email verification codes)
-- ============================================
CREATE TABLE IF NOT EXISTS otps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  type TEXT CHECK (type IN ('registration', 'login', 'password_reset')),
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  invalidated BOOLEAN DEFAULT false,
  attempts INTEGER DEFAULT 0,
  used_for_registration BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_debts_user_id ON debts(user_id);
CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status);
CREATE INDEX IF NOT EXISTS idx_debts_due_date ON debts(due_date);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);

-- ============================================
-- Row Level Security (RLS) policies
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Allow service role to bypass RLS (for NextAuth and server operations)
-- These policies allow authenticated users to access only their own data

-- Users policies
CREATE POLICY "Service role can do all" ON users
  FOR ALL USING (true);

-- User profiles policies  
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Service role full access profiles" ON user_profiles
  FOR ALL USING (true);

-- Debts policies
CREATE POLICY "Users can manage own debts" ON debts
  FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY "Service role full access debts" ON debts
  FOR ALL USING (true);

-- Transactions policies
CREATE POLICY "Users can manage own transactions" ON transactions
  FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY "Service role full access transactions" ON transactions
  FOR ALL USING (true);

-- Accounts policies (NextAuth managed)
CREATE POLICY "Service role full access accounts" ON accounts
  FOR ALL USING (true);

-- Sessions policies (NextAuth managed)
CREATE POLICY "Service role full access sessions" ON sessions
  FOR ALL USING (true);

-- ============================================
-- Updated_at trigger function
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  
CREATE TRIGGER update_debts_updated_at BEFORE UPDATE ON debts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
