-- UniMove Database Schema - Payments
-- Description: Payment processing, transactions, and financial records

-- Create ENUM types for payments
CREATE TYPE payment_status AS ENUM (
    'pending',           -- Chờ thanh toán
    'processing',        -- Đang xử lý
    'completed',         -- Thành công
    'failed',            -- Thất bại
    'refunded',          -- Đã hoàn tiền
    'partially_refunded',-- Hoàn một phần
    'cancelled'          -- Đã hủy
);

CREATE TYPE payment_method AS ENUM (
    'payos',             -- PayOS payment gateway
    'cash',              -- Tiền mặt
    'bank_transfer',     -- Chuyển khoản
    'wallet',            -- Ví điện tử
    'credit_card',       -- Thẻ tín dụng
    'debit_card'         -- Thẻ ghi nợ
);

CREATE TYPE transaction_type AS ENUM (
    'order_payment',     -- Thanh toán đơn hàng
    'refund',            -- Hoàn tiền
    'commission',        -- Hoa hồng
    'withdrawal',        -- Rút tiền
    'deposit',           -- Nạp tiền
    'penalty',           -- Phạt
    'bonus'              -- Thưởng
);

-- =====================================================
-- PAYMENTS
-- =====================================================

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_code TEXT UNIQUE NOT NULL, -- Format: PAY-YYYYMMDD-XXXX
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    
    -- Payment details
    amount DECIMAL(12,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'VND',
    payment_method payment_method NOT NULL,
    status payment_status NOT NULL DEFAULT 'pending',
    
    -- PayOS integration
    payos_order_id TEXT,
    payos_transaction_id TEXT,
    payos_payment_url TEXT,
    payos_qr_code TEXT,
    
    -- Bank transfer details
    bank_code TEXT,
    bank_account_number TEXT,
    bank_transaction_id TEXT,
    
    -- Timing
    paid_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    
    -- Metadata
    description TEXT,
    notes TEXT,
    failure_reason TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payment transactions (detailed transaction log)
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    transaction_type transaction_type NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    status payment_status NOT NULL,
    
    -- External reference
    external_transaction_id TEXT,
    external_reference TEXT,
    
    -- Details
    description TEXT,
    metadata JSONB,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Refunds
CREATE TABLE refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    
    -- Refund details
    refund_amount DECIMAL(12,2) NOT NULL,
    refund_reason TEXT NOT NULL,
    status payment_status NOT NULL DEFAULT 'pending',
    
    -- Processing
    requested_by UUID NOT NULL REFERENCES profiles(id),
    approved_by UUID REFERENCES profiles(id),
    processed_at TIMESTAMPTZ,
    
    -- External reference
    external_refund_id TEXT,
    
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Provider earnings (track provider income)
CREATE TABLE provider_earnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    payment_id UUID REFERENCES payments(id) ON DELETE RESTRICT,
    
    -- Earnings breakdown
    order_amount DECIMAL(12,2) NOT NULL,
    platform_commission DECIMAL(12,2) NOT NULL,
    net_earnings DECIMAL(12,2) NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL, -- Percentage
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending', -- pending, available, withdrawn
    
    -- Withdrawal
    withdrawn_at TIMESTAMPTZ,
    withdrawal_id UUID,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Provider withdrawals (rút tiền)
CREATE TABLE provider_withdrawals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Withdrawal details
    amount DECIMAL(12,2) NOT NULL,
    bank_name TEXT NOT NULL,
    bank_account_number TEXT NOT NULL,
    bank_account_name TEXT NOT NULL,
    
    -- Status
    status payment_status NOT NULL DEFAULT 'pending',
    
    -- Processing
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES profiles(id),
    
    -- External reference
    transaction_reference TEXT,
    
    notes TEXT,
    rejection_reason TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Wallet system (for future use)
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    balance DECIMAL(12,2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'VND',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT positive_balance CHECK (balance >= 0)
);

-- Wallet transactions
CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    transaction_type transaction_type NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    balance_before DECIMAL(12,2) NOT NULL,
    balance_after DECIMAL(12,2) NOT NULL,
    
    -- Reference
    reference_type TEXT, -- order, withdrawal, deposit
    reference_id UUID,
    
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Promotions and discounts
CREATE TABLE promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    
    -- Discount details
    discount_type TEXT NOT NULL, -- percentage, fixed_amount
    discount_value DECIMAL(10,2) NOT NULL,
    max_discount_amount DECIMAL(10,2),
    min_order_amount DECIMAL(10,2),
    
    -- Usage limits
    max_uses INTEGER,
    max_uses_per_user INTEGER DEFAULT 1,
    current_uses INTEGER DEFAULT 0,
    
    -- Validity
    valid_from TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Targeting
    applicable_to TEXT[], -- customer_ids or 'all'
    applicable_cities TEXT[],
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Promotion usage tracking
CREATE TABLE promotion_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    discount_amount DECIMAL(10,2) NOT NULL,
    used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(promotion_id, order_id)
);

-- Create indexes
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_customer ON payments(customer_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_payment_code ON payments(payment_code);
CREATE INDEX idx_payments_payos_order ON payments(payos_order_id);
CREATE INDEX idx_payment_transactions_payment ON payment_transactions(payment_id);
CREATE INDEX idx_refunds_payment ON refunds(payment_id);
CREATE INDEX idx_refunds_order ON refunds(order_id);
CREATE INDEX idx_provider_earnings_provider ON provider_earnings(provider_id);
CREATE INDEX idx_provider_earnings_order ON provider_earnings(order_id);
CREATE INDEX idx_provider_earnings_status ON provider_earnings(status);
CREATE INDEX idx_provider_withdrawals_provider ON provider_withdrawals(provider_id);
CREATE INDEX idx_provider_withdrawals_status ON provider_withdrawals(status);
CREATE INDEX idx_wallets_user ON wallets(user_id);
CREATE INDEX idx_wallet_transactions_wallet ON wallet_transactions(wallet_id);
CREATE INDEX idx_promotions_code ON promotions(code);
CREATE INDEX idx_promotions_active ON promotions(is_active);
CREATE INDEX idx_promotion_usage_promotion ON promotion_usage(promotion_id);
CREATE INDEX idx_promotion_usage_user ON promotion_usage(user_id);

-- Apply updated_at triggers
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_refunds_updated_at BEFORE UPDATE ON refunds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_provider_withdrawals_updated_at BEFORE UPDATE ON provider_withdrawals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promotions_updated_at BEFORE UPDATE ON promotions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate payment code
CREATE OR REPLACE FUNCTION generate_payment_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    counter INTEGER;
BEGIN
    new_code := 'PAY-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-';
    
    SELECT COUNT(*) + 1 INTO counter
    FROM payments
    WHERE payment_code LIKE new_code || '%';
    
    new_code := new_code || LPAD(counter::TEXT, 4, '0');
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate payment code
CREATE OR REPLACE FUNCTION set_payment_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.payment_code IS NULL THEN
        NEW.payment_code := generate_payment_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_payment_code_trigger
    BEFORE INSERT ON payments
    FOR EACH ROW
    EXECUTE FUNCTION set_payment_code();

-- Function to update provider earnings on payment completion
CREATE OR REPLACE FUNCTION create_provider_earnings()
RETURNS TRIGGER AS $$
DECLARE
    v_order orders%ROWTYPE;
    v_commission_rate DECIMAL(5,2) := 15.00; -- 15% platform commission
    v_commission_amount DECIMAL(12,2);
    v_net_earnings DECIMAL(12,2);
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Get order details
        SELECT * INTO v_order FROM orders WHERE id = NEW.order_id;
        
        IF v_order.provider_id IS NOT NULL THEN
            -- Calculate commission and earnings
            v_commission_amount := NEW.amount * (v_commission_rate / 100);
            v_net_earnings := NEW.amount - v_commission_amount;
            
            -- Insert earnings record
            INSERT INTO provider_earnings (
                provider_id,
                order_id,
                payment_id,
                order_amount,
                platform_commission,
                net_earnings,
                commission_rate,
                status
            ) VALUES (
                v_order.provider_id,
                NEW.order_id,
                NEW.id,
                NEW.amount,
                v_commission_amount,
                v_net_earnings,
                v_commission_rate,
                'available'
            );
            
            -- Update provider total earnings
            UPDATE profiles
            SET total_earnings = total_earnings + v_net_earnings
            WHERE id = v_order.provider_id AND role = 'provider';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_provider_earnings_trigger
    AFTER UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION create_provider_earnings();

-- Comments
COMMENT ON TABLE payments IS 'Payment records for orders';
COMMENT ON TABLE payment_transactions IS 'Detailed transaction log';
COMMENT ON TABLE refunds IS 'Refund requests and processing';
COMMENT ON TABLE provider_earnings IS 'Provider income tracking';
COMMENT ON TABLE provider_withdrawals IS 'Provider withdrawal requests';
COMMENT ON TABLE wallets IS 'User wallet system';
COMMENT ON TABLE wallet_transactions IS 'Wallet transaction history';
COMMENT ON TABLE promotions IS 'Promotional codes and discounts';
COMMENT ON TABLE promotion_usage IS 'Promotion usage tracking';
