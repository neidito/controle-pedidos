import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Supabase configuration - PRODUCTION CREDENTIALS
const SUPABASE_URL = 'https://gberegbttxfwlyxlogth.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_OGTDNByZHcwtP_O1D0l8nw_8yvOtWuy'

// Create Supabase client
let _supabase: SupabaseClient | null = null

export const getSupabase = (): SupabaseClient => {
  if (!_supabase) {
    _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
  return _supabase
}

// Always configured since credentials are embedded
export const isSupabaseConfigured = (): boolean => {
  return true
}

// Reset client (if needed)
export const resetSupabaseClient = () => {
  _supabase = null
}

// SQL to create tables (run this in Supabase SQL Editor)
export const createTablesSql = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create usuarios table
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  senha VARCHAR(255) NOT NULL,
  tipo VARCHAR(20) NOT NULL DEFAULT 'colaborador' CHECK (tipo IN ('admin', 'colaborador')),
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  criado_por UUID REFERENCES usuarios(id)
);

-- Create vendedores table
CREATE TABLE IF NOT EXISTS vendedores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create periodos table
CREATE TABLE IF NOT EXISTS periodos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(100) NOT NULL,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano INTEGER NOT NULL,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pedidos table
CREATE TABLE IF NOT EXISTS pedidos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  periodo_id UUID NOT NULL REFERENCES periodos(id) ON DELETE CASCADE,
  nr_pedido VARCHAR(50) NOT NULL,
  cliente VARCHAR(255) NOT NULL,
  medico VARCHAR(255),
  vendedor VARCHAR(255),
  data DATE NOT NULL,
  produto VARCHAR(255) NOT NULL,
  qtd INTEGER NOT NULL DEFAULT 1,
  total DECIMAL(10,2) DEFAULT 0,
  rastreio VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'Em Separação' CHECK (status IN ('Em Separação', 'Em Trânsito', 'Anvisa', 'Problema Anvisa', 'Atraso', 'Doc. Recusado', 'THC / 2000')),
  criado_por UUID REFERENCES usuarios(id),
  atualizado_por UUID REFERENCES usuarios(id),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pedidos_periodo ON pedidos(periodo_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);

-- Insert default admin user
INSERT INTO usuarios (nome, email, senha, tipo, ativo)
VALUES ('Administrador', 'admin@sistema.com', 'admin123', 'admin', true)
ON CONFLICT (email) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE periodos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
DROP POLICY IF EXISTS "Allow all usuarios" ON usuarios;
DROP POLICY IF EXISTS "Allow all vendedores" ON vendedores;
DROP POLICY IF EXISTS "Allow all periodos" ON periodos;
DROP POLICY IF EXISTS "Allow all pedidos" ON pedidos;

CREATE POLICY "Allow all usuarios" ON usuarios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all vendedores" ON vendedores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all periodos" ON periodos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all pedidos" ON pedidos FOR ALL USING (true) WITH CHECK (true);
`
