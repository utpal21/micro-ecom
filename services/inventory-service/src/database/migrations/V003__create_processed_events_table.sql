-- ============================================
-- V003__create_processed_events_table.sql
-- ============================================
-- Create processed_events table for event idempotency
-- ============================================

CREATE TABLE IF NOT EXISTS processed_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL UNIQUE, -- The unique ID of the event from message broker
    event_type VARCHAR(255) NOT NULL,
    queue_name VARCHAR(255) NOT NULL,
    
    -- Event payload for audit/troubleshooting (optional)
    event_payload JSONB,
    
    -- Processing status
    status VARCHAR(50) NOT NULL DEFAULT 'processing', -- 'processing', 'completed', 'failed'
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Audit
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_processed_events_event_id ON processed_events(event_id);
CREATE INDEX idx_processed_events_event_type ON processed_events(event_type);
CREATE INDEX idx_processed_events_queue_name ON processed_events(queue_name);
CREATE INDEX idx_processed_events_status ON processed_events(status);
CREATE INDEX idx_processed_events_processed_at ON processed_events(processed_at DESC);

-- Create index for cleanup of old records
CREATE INDEX idx_processed_events_processed_at_cleanup ON processed_events(processed_at);

-- Add comment
COMMENT ON TABLE processed_events IS 'Tracks processed events for idempotency';
COMMENT ON COLUMN processed_events.event_id IS 'Unique event ID from message broker';
COMMENT ON COLUMN processed_events.status IS 'Processing status: processing, completed, failed';
COMMENT ON COLUMN processed_events.retry_count IS 'Number of retry attempts';