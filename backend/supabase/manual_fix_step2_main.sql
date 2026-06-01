-- ============================================================
-- BƯỚC 2/3 — Chạy SAU khi step1_enums.sql đã Success
-- ============================================================

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS payment_released BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS payment_released_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS shared_move_discount NUMERIC(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS provider_accepted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS customer_confirmed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS eta_minutes INTEGER,
    ADD COLUMN IF NOT EXISTS number_of_rooms INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS promotion_id UUID REFERENCES promotions(id) ON DELETE SET NULL;

UPDATE orders
SET
    deposit_amount = ROUND(total_price * 0.30, 0),
    remaining_amount = total_price - ROUND(total_price * 0.30, 0)
WHERE deposit_amount = 0 AND total_price > 0;

ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS payment_purpose payment_purpose NOT NULL DEFAULT 'full',
    ADD COLUMN IF NOT EXISTS escrow_status TEXT NOT NULL DEFAULT 'pending';

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

ALTER TABLE provider_profiles
    ADD COLUMN IF NOT EXISTS vehicle_images TEXT[];

UPDATE profiles
SET referral_code = UPPER(SUBSTRING(REPLACE(id::TEXT, '-', ''), 1, 8))
WHERE referral_code IS NULL;

CREATE TABLE IF NOT EXISTS platform_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES profiles(id)
);

INSERT INTO platform_settings (key, value, description) VALUES
    ('deposit_rate', '0.30', 'Tỷ lệ đặt cọc'),
    ('commission_rate', '0.15', 'Hoa hồng platform'),
    ('shared_move_discount_rate', '0.40', 'Giảm giá gộp đơn'),
    ('cancel_before_accept_refund_rate', '1.00', 'Hoàn 100% hủy trước accept'),
    ('cancel_after_accept_refund_rate', '0.50', 'Hoàn 50% hủy sau accept'),
    ('referral_reward_amount', '30000', 'Thưởng referral VNĐ')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS service_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    service_type service_type NOT NULL DEFAULT 'standard',
    vehicle_size vehicle_size NOT NULL,
    base_price NUMERIC(10,2) NOT NULL,
    price_per_km NUMERIC(10,2) NOT NULL DEFAULT 0,
    price_per_floor NUMERIC(10,2) NOT NULL DEFAULT 0,
    max_weight_kg NUMERIC(10,2),
    helper_count INTEGER NOT NULL DEFAULT 0,
    includes_packing BOOLEAN NOT NULL DEFAULT FALSE,
    includes_insurance BOOLEAN NOT NULL DEFAULT FALSE,
    estimated_duration_hours NUMERIC(4,1),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS provider_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider_id, day_of_week, start_time),
    CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

CREATE TABLE IF NOT EXISTS order_provider_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
    response provider_response NOT NULL,
    decline_reason TEXT,
    responded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (order_id, provider_id)
);

CREATE TABLE IF NOT EXISTS shared_move_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_code TEXT UNIQUE NOT NULL,
    pickup_city TEXT NOT NULL,
    pickup_district TEXT NOT NULL,
    delivery_city TEXT NOT NULL,
    delivery_district TEXT NOT NULL,
    scheduled_date DATE NOT NULL,
    max_orders INTEGER NOT NULL DEFAULT 3,
    current_orders INTEGER NOT NULL DEFAULT 0,
    discount_rate NUMERIC(5,2) NOT NULL DEFAULT 40.00,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    referred_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    referral_code TEXT NOT NULL UNIQUE,
    status referral_status NOT NULL DEFAULT 'pending',
    reward_amount NUMERIC(10,2) NOT NULL DEFAULT 30000,
    first_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    rewarded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days')
);

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS service_package_id UUID REFERENCES service_packages(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS shared_move_group_id UUID REFERENCES shared_move_groups(id) ON DELETE SET NULL;

DELETE FROM provider_locations a
USING provider_locations b
WHERE a.provider_id = b.provider_id
  AND a.created_at < b.created_at;

DO $$ BEGIN
    ALTER TABLE provider_locations
        ADD CONSTRAINT provider_locations_provider_id_unique UNIQUE (provider_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION calculate_order_deposit()
RETURNS TRIGGER AS $$
DECLARE v_rate NUMERIC := 0.30;
BEGIN
    SELECT (value::text)::NUMERIC INTO v_rate
    FROM platform_settings WHERE key = 'deposit_rate';
    IF v_rate IS NULL THEN v_rate := 0.30; END IF;
    IF NEW.deposit_amount = 0 OR NEW.deposit_amount IS NULL THEN
        NEW.deposit_amount := ROUND(NEW.total_price * v_rate, 0);
    END IF;
    NEW.remaining_amount := NEW.total_price - NEW.deposit_amount;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_order_deposit_trigger ON orders;
CREATE TRIGGER calculate_order_deposit_trigger
    BEFORE INSERT OR UPDATE OF total_price ON orders
    FOR EACH ROW EXECUTE FUNCTION calculate_order_deposit();

CREATE OR REPLACE FUNCTION release_payment_on_confirm()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.customer_confirmed_at IS NOT NULL AND OLD.customer_confirmed_at IS NULL THEN
        NEW.payment_released := TRUE;
        NEW.payment_released_at := NOW();
        UPDATE payments SET escrow_status = 'released'
        WHERE order_id = NEW.id AND status = 'completed';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS release_payment_on_confirm_trigger ON orders;
CREATE TRIGGER release_payment_on_confirm_trigger
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION release_payment_on_confirm();

CREATE OR REPLACE FUNCTION create_provider_earnings()
RETURNS TRIGGER AS $$
DECLARE
    v_order orders%ROWTYPE;
    v_rate NUMERIC := 15.00;
    v_commission NUMERIC;
    v_net NUMERIC;
BEGIN
    IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
        SELECT * INTO v_order FROM orders WHERE id = NEW.order_id;
        IF v_order.provider_id IS NOT NULL THEN
            v_commission := NEW.amount * (v_rate / 100);
            v_net := NEW.amount - v_commission;
            INSERT INTO provider_earnings (
                provider_id, order_id, payment_id,
                order_amount, platform_commission, net_earnings,
                commission_rate, status
            ) VALUES (
                v_order.provider_id, NEW.order_id, NEW.id,
                NEW.amount, v_commission, v_net, v_rate, 'available'
            );
            UPDATE provider_profiles
            SET total_earnings = total_earnings + v_net
            WHERE id = v_order.provider_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_provider_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_move_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_provider()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'provider');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP POLICY IF EXISTS "Everyone can view platform settings" ON platform_settings;
CREATE POLICY "Everyone can view platform settings" ON platform_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage platform settings" ON platform_settings;
CREATE POLICY "Admins manage platform settings" ON platform_settings FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "View active service packages" ON service_packages;
CREATE POLICY "View active service packages" ON service_packages FOR SELECT USING (is_active = TRUE OR is_admin());
DROP POLICY IF EXISTS "Providers manage own packages" ON service_packages;
CREATE POLICY "Providers manage own packages" ON service_packages FOR ALL USING (auth.uid() = provider_id OR is_admin());

DROP POLICY IF EXISTS "View provider availability" ON provider_availability;
CREATE POLICY "View provider availability" ON provider_availability FOR SELECT USING (true);
DROP POLICY IF EXISTS "Providers manage own availability" ON provider_availability;
CREATE POLICY "Providers manage own availability" ON provider_availability FOR ALL USING (auth.uid() = provider_id OR is_admin());

DROP POLICY IF EXISTS "View order provider responses" ON order_provider_responses;
CREATE POLICY "View order provider responses" ON order_provider_responses FOR SELECT
    USING (auth.uid() = provider_id OR is_admin() OR EXISTS (
        SELECT 1 FROM orders WHERE id = order_id AND customer_id = auth.uid()
    ));
DROP POLICY IF EXISTS "Providers can respond" ON order_provider_responses;
CREATE POLICY "Providers can respond" ON order_provider_responses FOR INSERT
    WITH CHECK (auth.uid() = provider_id AND is_provider());

DROP POLICY IF EXISTS "View open shared move groups" ON shared_move_groups;
CREATE POLICY "View open shared move groups" ON shared_move_groups FOR SELECT USING (status = 'open' OR is_admin());

DROP POLICY IF EXISTS "View own referrals" ON referrals;
CREATE POLICY "View own referrals" ON referrals FOR SELECT
    USING (auth.uid() = referrer_id OR auth.uid() = referred_id OR is_admin());

-- ✅ Sau khi Success → chạy tiếp manual_fix_step3_templates.sql
