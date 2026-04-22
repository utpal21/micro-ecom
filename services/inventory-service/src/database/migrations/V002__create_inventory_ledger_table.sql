-- ============================================
-- V002__create_inventory_ledger_table.sql
-- ============================================
-- Create inventory_ledger table to track all stock movements
-- ============================================

CREATE TABLE IF NOT EXISTS inventory_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
    
    -- Transaction details
    transaction_type VARCHAR(50) NOT NULL, -- 'purchase', 'sale', 'return', 'adjustment', 'reservation', 'reservation_release'
    quantity INTEGER NOT NULL, -- Positive for additions, negative for deductions
    
    -- Stock snapshots before and after
    stock_quantity_before INTEGER NOT NULL,
    stock_quantity_after INTEGER NOT NULL,
    reserved_quantity_before INTEGER NOT NULL,
    reserved_quantity_after INTEGER NOT NULL,
    
    -- Reference information
    reference_id UUID, -- Order ID, purchase order ID, adjustment ID, etc.
    reference_type VARCHAR(100), -- 'order', 'purchase_order', 'adjustment', etc.
    
    -- Reason and metadata
    reason VARCHAR(500),
    notes TEXT,
    metadata JSONB,
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID
);

-- Create indexes for performance and querying
CREATE INDEX idx_ledger_inventory_id ON inventory_ledger(inventory_id);
CREATE INDEX idx_ledger_transaction_type ON inventory_ledger(transaction_type);
CREATE INDEX idx_ledger_reference ON inventory_ledger(reference_id, reference_type);
CREATE INDEX idx_ledger_created_at ON inventory_ledger(created_at DESC);
CREATE INDEX idx_ledger_metadata ON inventory_ledger USING GIN(metadata);

-- Add constraint to ensure quantities match
ALTER TABLE inventory_ledger ADD CONSTRAINT chk_quantity_balance 
    CHECK (
        stock_quantity_after = stock_quantity_before + quantity OR
        reserved_quantity_after = reserved_quantity_before + quantity
    );

-- Add comment
COMMENT ON TABLE inventory_ledger IS 'Immutable audit trail of all stock movements';
COMMENT ON COLUMN inventory_ledger.transaction_type IS 'Type of stock movement';
COMMENT ON COLUMN inventory_ledger.quantity IS 'Quantity change (positive or negative)';
COMMENT ON COLUMN inventory_ledger.reference_id IS 'ID of related entity (order, PO, etc.)';
COMMENT ON COLUMN inventory_ledger.metadata IS 'Additional information as JSON';