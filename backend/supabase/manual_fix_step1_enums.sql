-- ============================================================
-- BƯỚC 1/3 — Chạy file này TRƯỚC, bấm Run, đợi Success
-- PostgreSQL bắt buộc COMMIT enum mới trước khi dùng trong INSERT
-- ============================================================

ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'matched' AFTER 'pending';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'picked_up' AFTER 'picking_up';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'delivering' AFTER 'picked_up';

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'review_received';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'withdrawal_processed';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'provider_verified';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'shared_move_suggestion';

ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'momo';

DO $$ BEGIN
    CREATE TYPE payment_purpose AS ENUM ('deposit', 'final', 'full', 'refund', 'penalty');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE provider_response AS ENUM ('accepted', 'declined');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE referral_status AS ENUM ('pending', 'completed', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ✅ Sau khi Success → chạy tiếp manual_fix_step2_main.sql
