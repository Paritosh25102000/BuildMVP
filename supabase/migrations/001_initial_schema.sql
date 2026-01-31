-- PRO SmartBuild Database Schema
-- Migration: 001_initial_schema.sql
-- Description: Initial schema setup for construction management platform

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CUSTOM TYPES (ENUMS)
-- ============================================

-- Estimate status enum
CREATE TYPE estimate_status AS ENUM ('draft', 'sent', 'approved', 'declined');

-- Invoice status enum
CREATE TYPE invoice_status AS ENUM ('unpaid', 'paid');

-- ============================================
-- PROFILES TABLE
-- Linked to Supabase auth.users for multi-tenant isolation
-- ============================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Business Information
    business_name VARCHAR(255),
    business_address TEXT,
    business_phone VARCHAR(50),
    business_email VARCHAR(255),
    license_number VARCHAR(100),

    -- Branding
    logo_url TEXT, -- Stored in Supabase Storage

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CLIENTS TABLE
-- Customers/clients for each contractor
-- ============================================
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Client Information
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    notes TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups by user
CREATE INDEX idx_clients_user_id ON clients(user_id);

-- ============================================
-- ESTIMATES TABLE
-- Project estimates/quotes for clients
-- ============================================
CREATE TABLE estimates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

    -- Estimate Details
    estimate_number VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Status
    status estimate_status DEFAULT 'draft',

    -- Dates
    issue_date DATE DEFAULT CURRENT_DATE,
    valid_until DATE,

    -- Totals (calculated from line items, stored for quick access)
    subtotal DECIMAL(12, 2) DEFAULT 0,
    tax_rate DECIMAL(5, 2) DEFAULT 0, -- Percentage (e.g., 8.25)
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    total DECIMAL(12, 2) DEFAULT 0,

    -- Additional
    notes TEXT, -- Terms, conditions, notes to client

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_estimates_user_id ON estimates(user_id);
CREATE INDEX idx_estimates_client_id ON estimates(client_id);
CREATE INDEX idx_estimates_status ON estimates(status);
CREATE UNIQUE INDEX idx_estimates_number_user ON estimates(user_id, estimate_number);

-- ============================================
-- ESTIMATE_ITEMS TABLE
-- Line items for estimates (Standard: Qty x Unit Price)
-- ============================================
CREATE TABLE estimate_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,

    -- Item Details
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) DEFAULT 1,
    unit VARCHAR(50) DEFAULT 'each', -- each, sqft, hour, etc.
    unit_price DECIMAL(12, 2) NOT NULL,

    -- Calculated
    amount DECIMAL(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,

    -- Ordering
    sort_order INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_estimate_items_estimate_id ON estimate_items(estimate_id);

-- ============================================
-- INVOICES TABLE
-- Invoices generated from estimates or standalone
-- ============================================
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

    -- Link to source estimate (if converted)
    source_estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL,

    -- Invoice Details
    invoice_number VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Status
    status invoice_status DEFAULT 'unpaid',

    -- Dates
    issue_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    paid_date DATE, -- When payment was received

    -- Totals
    subtotal DECIMAL(12, 2) DEFAULT 0,
    tax_rate DECIMAL(5, 2) DEFAULT 0,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    total DECIMAL(12, 2) DEFAULT 0,

    -- Additional
    notes TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_source_estimate ON invoices(source_estimate_id);
CREATE UNIQUE INDEX idx_invoices_number_user ON invoices(user_id, invoice_number);

-- ============================================
-- INVOICE_ITEMS TABLE
-- Line items for invoices (Standard: Qty x Unit Price)
-- ============================================
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

    -- Item Details
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) DEFAULT 1,
    unit VARCHAR(50) DEFAULT 'each',
    unit_price DECIMAL(12, 2) NOT NULL,

    -- Calculated
    amount DECIMAL(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,

    -- Ordering
    sort_order INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Multi-tenant isolation: users see only their data
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- PROFILES policies
CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- CLIENTS policies
CREATE POLICY "Users can view their own clients"
    ON clients FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own clients"
    ON clients FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients"
    ON clients FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients"
    ON clients FOR DELETE
    USING (auth.uid() = user_id);

-- ESTIMATES policies
CREATE POLICY "Users can view their own estimates"
    ON estimates FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own estimates"
    ON estimates FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own estimates"
    ON estimates FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own estimates"
    ON estimates FOR DELETE
    USING (auth.uid() = user_id);

-- ESTIMATE_ITEMS policies (via estimate ownership)
CREATE POLICY "Users can view their own estimate items"
    ON estimate_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM estimates
            WHERE estimates.id = estimate_items.estimate_id
            AND estimates.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create their own estimate items"
    ON estimate_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM estimates
            WHERE estimates.id = estimate_items.estimate_id
            AND estimates.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own estimate items"
    ON estimate_items FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM estimates
            WHERE estimates.id = estimate_items.estimate_id
            AND estimates.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own estimate items"
    ON estimate_items FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM estimates
            WHERE estimates.id = estimate_items.estimate_id
            AND estimates.user_id = auth.uid()
        )
    );

-- INVOICES policies
CREATE POLICY "Users can view their own invoices"
    ON invoices FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own invoices"
    ON invoices FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoices"
    ON invoices FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invoices"
    ON invoices FOR DELETE
    USING (auth.uid() = user_id);

-- INVOICE_ITEMS policies (via invoice ownership)
CREATE POLICY "Users can view their own invoice items"
    ON invoice_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM invoices
            WHERE invoices.id = invoice_items.invoice_id
            AND invoices.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create their own invoice items"
    ON invoice_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM invoices
            WHERE invoices.id = invoice_items.invoice_id
            AND invoices.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own invoice items"
    ON invoice_items FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM invoices
            WHERE invoices.id = invoice_items.invoice_id
            AND invoices.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own invoice items"
    ON invoice_items FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM invoices
            WHERE invoices.id = invoice_items.invoice_id
            AND invoices.user_id = auth.uid()
        )
    );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_estimates_updated_at
    BEFORE UPDATE ON estimates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to recalculate estimate totals
CREATE OR REPLACE FUNCTION recalculate_estimate_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_subtotal DECIMAL(12, 2);
    v_tax_rate DECIMAL(5, 2);
    v_tax_amount DECIMAL(12, 2);
BEGIN
    -- Get subtotal from items
    SELECT COALESCE(SUM(quantity * unit_price), 0)
    INTO v_subtotal
    FROM estimate_items
    WHERE estimate_id = COALESCE(NEW.estimate_id, OLD.estimate_id);

    -- Get current tax rate
    SELECT tax_rate INTO v_tax_rate
    FROM estimates
    WHERE id = COALESCE(NEW.estimate_id, OLD.estimate_id);

    -- Calculate tax
    v_tax_amount := v_subtotal * (v_tax_rate / 100);

    -- Update estimate
    UPDATE estimates
    SET subtotal = v_subtotal,
        tax_amount = v_tax_amount,
        total = v_subtotal + v_tax_amount
    WHERE id = COALESCE(NEW.estimate_id, OLD.estimate_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for estimate item changes
CREATE TRIGGER recalculate_estimate_on_item_change
    AFTER INSERT OR UPDATE OR DELETE ON estimate_items
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_estimate_totals();

-- Function to recalculate invoice totals
CREATE OR REPLACE FUNCTION recalculate_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_subtotal DECIMAL(12, 2);
    v_tax_rate DECIMAL(5, 2);
    v_tax_amount DECIMAL(12, 2);
BEGIN
    -- Get subtotal from items
    SELECT COALESCE(SUM(quantity * unit_price), 0)
    INTO v_subtotal
    FROM invoice_items
    WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id);

    -- Get current tax rate
    SELECT tax_rate INTO v_tax_rate
    FROM invoices
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);

    -- Calculate tax
    v_tax_amount := v_subtotal * (v_tax_rate / 100);

    -- Update invoice
    UPDATE invoices
    SET subtotal = v_subtotal,
        tax_amount = v_tax_amount,
        total = v_subtotal + v_tax_amount
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for invoice item changes
CREATE TRIGGER recalculate_invoice_on_item_change
    AFTER INSERT OR UPDATE OR DELETE ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_invoice_totals();

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, business_email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- ============================================
-- STORAGE BUCKET FOR LOGOS
-- ============================================
-- Note: Run this in Supabase Dashboard or via supabase CLI
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('logos', 'logos', true);

-- Storage policy for logos (users can upload to their own folder)
-- CREATE POLICY "Users can upload their own logo"
--     ON storage.objects FOR INSERT
--     WITH CHECK (
--         bucket_id = 'logos' AND
--         auth.uid()::text = (storage.foldername(name))[1]
--     );

-- CREATE POLICY "Anyone can view logos"
--     ON storage.objects FOR SELECT
--     USING (bucket_id = 'logos');

-- CREATE POLICY "Users can update their own logo"
--     ON storage.objects FOR UPDATE
--     USING (
--         bucket_id = 'logos' AND
--         auth.uid()::text = (storage.foldername(name))[1]
--     );

-- CREATE POLICY "Users can delete their own logo"
--     ON storage.objects FOR DELETE
--     USING (
--         bucket_id = 'logos' AND
--         auth.uid()::text = (storage.foldername(name))[1]
--     );
