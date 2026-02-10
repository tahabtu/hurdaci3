-- Tenants
CREATE TABLE IF NOT EXISTS tenants (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Users (with bcrypt password hashing and role-based access)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id),
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  name VARCHAR(255),
  role VARCHAR(20) DEFAULT 'user' CHECK(role IN ('superuser', 'admin', 'user')),
  refresh_token TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Migration: Add columns if they don't exist (for existing databases)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_hash') THEN
        ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'refresh_token') THEN
        ALTER TABLE users ADD COLUMN refresh_token TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
        ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user';
    END IF;
END $$;

-- Partners (customers/suppliers)
CREATE TABLE IF NOT EXISTS partners (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) CHECK(type IN ('customer', 'supplier', 'bank')) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  balance DECIMAL(9,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Materials (no fixed price)
CREATE TABLE IF NOT EXISTS materials (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  item_code VARCHAR(50),
  item_type VARCHAR(20) CHECK(item_type IN ('hammadde', 'ürün', 'tüketim')) NOT NULL,
  unit_of_measure VARCHAR(10) DEFAULT 'kg', CHECK(unit_of_measure IN ('kg', 'adet', 'metre', 'litre')),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Ullage Types
CREATE TABLE IF NOT EXISTS ullage_types (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  UNIQUE(tenant_id, name)
);

-- Receiving Transactions (header)
CREATE TABLE IF NOT EXISTS receiving_transactions (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) NOT NULL,
  partner_id INTEGER REFERENCES partners(id) NOT NULL,
  doc_date DATE, -- evrak tarihi(selectable by user)
  plate_no_1 VARCHAR(20),
  plate_no_2 VARCHAR(20),
  is_reported BOOLEAN DEFAULT FALSE,
  logistics_cost DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK(status IN ('pending', 'inspected', 'approved', 'rejected')),
  transaction_date TIMESTAMP DEFAULT NOW(),
  notes TEXT
);

-- Receiving Transaction Items (multiple materials)
CREATE TABLE IF NOT EXISTS receiving_items (
  id SERIAL PRIMARY KEY,
  receiving_transaction_id INTEGER REFERENCES receiving_transactions(id) ON DELETE CASCADE,
  material_id INTEGER REFERENCES materials(id) NOT NULL,
  gross_weight DECIMAL(10,3) NOT NULL,
  net_weight DECIMAL(10,3),
  unit_price DECIMAL(10,2) NOT NULL,
  logistics_cost DECIMAL(10,2) DEFAULT 0,
  effective_unit_price DECIMAL(10,2),
  total_amount DECIMAL(12,2)
);

-- Ullage Inspections
CREATE TABLE IF NOT EXISTS inspections (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) NOT NULL,
  receiving_item_id INTEGER REFERENCES receiving_items(id) ON DELETE CASCADE,
  sample_weight DECIMAL(6,1) NOT NULL,
  total_ullage_weight DECIMAL(6,1),
  ullage_percentage DECIMAL(5,2),
  inspection_date TIMESTAMP DEFAULT NOW()
);

-- Inspection Ullage Items
CREATE TABLE IF NOT EXISTS inspection_items (
  id SERIAL PRIMARY KEY,
  inspection_id INTEGER REFERENCES inspections(id) ON DELETE CASCADE,
  ullage_type_id INTEGER REFERENCES ullage_types(id) NOT NULL,
  weight DECIMAL(6,1) NOT NULL
);

-- Stock (by material and partner origin)
CREATE TABLE IF NOT EXISTS stock (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) NOT NULL,
  material_id INTEGER REFERENCES materials(id) NOT NULL,
  partner_id INTEGER REFERENCES partners(id) NOT NULL,
  quantity DECIMAL(15,2) DEFAULT 0,
  effective_unit_price DECIMAL(10,2) DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, material_id, partner_id)
);

-- Selling Transactions
CREATE TABLE IF NOT EXISTS selling_transactions (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) NOT NULL,
  partner_id INTEGER REFERENCES partners(id) NOT NULL,
  total_amount DECIMAL(15,2) DEFAULT 0,
  transaction_date TIMESTAMP DEFAULT NOW(),
  notes TEXT
);

-- Selling Items
CREATE TABLE IF NOT EXISTS selling_items (
  id SERIAL PRIMARY KEY,
  selling_transaction_id INTEGER REFERENCES selling_transactions(id) ON DELETE CASCADE,
  material_id INTEGER REFERENCES materials(id) NOT NULL,
  quantity DECIMAL(15,3) NOT NULL,
  unit_price DECIMAL(15,2) NOT NULL,
  total_amount DECIMAL(15,2)
);

-- Money Transactions
CREATE TABLE IF NOT EXISTS money_transactions (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) NOT NULL,
  partner_id INTEGER REFERENCES partners(id) NOT NULL,
  type VARCHAR(20) CHECK(type IN ('payment', 'receipt')) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  payment_method VARCHAR(50),
  transaction_date TIMESTAMP DEFAULT NOW(),
  notes TEXT
);

-- Seed default tenant and admin user
INSERT INTO tenants (name) VALUES ('Demo Şirket') ON CONFLICT (name) DO NOTHING;
-- Password: admin123 (bcrypt hash, 12 rounds) - Superuser role for full system access
INSERT INTO users (tenant_id, username, password_hash, name, role) 
VALUES (1, 'admin', '$2b$12$lPWTbl5R6VPB.sL7dWxkqe6hWViTVmA3eFS/azLKMXFJ4c8dE9wIG', 'Yönetici', 'superuser') 
ON CONFLICT (username) DO UPDATE SET password_hash = '$2b$12$lPWTbl5R6VPB.sL7dWxkqe6hWViTVmA3eFS/azLKMXFJ4c8dE9wIG', role = 'superuser';

-- Seed some ullage types
INSERT INTO ullage_types (tenant_id, name, description) VALUES 
(1, 'Kağıt', 'Kağıt atıkları'),
(1, 'Su/Nem', 'Nem ve su içeriği'),
(1, 'Metal', 'Metal kalıntıları'),
(1, 'Plastik', 'Karışık plastik'),
(1, 'Cam', 'Cam parçaları'),
(1, 'Diğer', 'Diğer yabancı maddeler')
ON CONFLICT (tenant_id, name) DO NOTHING;
