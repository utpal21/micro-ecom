-- ============================================
-- V001__create_inventory_table.sql
-- ============================================
-- Create inventory table to track stock levels
-- ============================================

CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(255) NOT NULL UNIQUE,
    product_id UUID NOT NULL,
    product_name VARCHAR(500) NOT NULL,
    vendor_id UUID NOT NULL,
    
    -- Stock quantities
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER NOT NULL DEFAULT 0,
    
    -- Available stock = stock_quantity - reserved_quantity
    -- This is calculated, not stored
    
    -- Metadata
    location VARCHAR(255),
    warehouse_code VARCHAR(100),
    reorder_level INTEGER DEFAULT 10,
    max_stock_level INTEGER DEFAULT 1000,
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- Create indexes for performance
CREATE INDEX idx_inventory_sku ON inventory(sku);
CREATE INDEX idx_inventory_product_id ON inventory(product_id);
CREATE INDEX idx_inventory_vendor_id ON inventory(vendor_id);
CREATE INDEX idx_inventory_status ON inventory(status);
CREATE INDEX idx_inventory_stock ON inventory(stock_quantity, reserved_quantity);

-- Add constraint to ensure non-negative quantities
ALTER TABLE inventory ADD CONSTRAINT chk_stock_non_negative 
    CHECK (stock_quantity >= 0 AND reserved_quantity >= 0 AND stock_quantity >= reserved_quantity);

-- Add comment
COMMENT ON TABLE inventory IS 'Main inventory table tracking stock levels for products';
COMMENT ON COLUMN inventory.sku IS 'Stock Keeping Unit - unique identifier';
COMMENT ON COLUMN inventory.stock_quantity IS 'Total physical stock available';
COMMENT ON COLUMN inventory.reserved_quantity IS 'Stock reserved for pending orders';
COMMENT ON COLUMN inventory.reorder_level IS 'Stock level at which to trigger reorder';
COMMENT ON COLUMN inventory.max_stock_level IS 'Maximum stock level to maintain';