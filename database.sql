-- JSON to Excel Converter Database Schema

-- Seçim geçmişi tablosu
CREATE TABLE IF NOT EXISTS selection_history (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    fields TEXT[] NOT NULL,
    field_count INTEGER NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Template'ler tablosu
CREATE TABLE IF NOT EXISTS templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    fields TEXT[] NOT NULL,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_selection_history_timestamp ON selection_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_templates_name ON templates(name);
CREATE INDEX IF NOT EXISTS idx_templates_usage ON templates(usage_count);

-- Örnek veriler (opsiyonel)
INSERT INTO templates (name, description, fields) VALUES 
('Müşteri Verileri', 'Temel müşteri bilgileri için template', ARRAY['id', 'name', 'email', 'phone']),
('Ürün Listesi', 'Ürün katalog bilgileri için template', ARRAY['id', 'name', 'price', 'category', 'stock'])
ON CONFLICT (name) DO NOTHING;
