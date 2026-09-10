-- ==============================================================================
-- Migration: 20260907_subscriptions_and_razorpay.sql
-- Description: Razorpay Subscriptions, Billing Dates, Customer/Payment IDs & Plan Limits
-- ==============================================================================

-- 1. Ensure subscriptions table has complete Razorpay tracking columns
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'FREE', -- 'FREE' | 'RESEARCHER' | 'PRO_RESEARCHER'
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'authenticated' | 'cancelled' | 'expired' | 'halted' | 'pending'
  razorpay_customer_id TEXT,
  razorpay_subscription_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  razorpay_plan_id TEXT,
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add any missing columns in case table already existed
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='plan') THEN
    ALTER TABLE public.subscriptions ADD COLUMN plan TEXT NOT NULL DEFAULT 'FREE';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='razorpay_customer_id') THEN
    ALTER TABLE public.subscriptions ADD COLUMN razorpay_customer_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='razorpay_subscription_id') THEN
    ALTER TABLE public.subscriptions ADD COLUMN razorpay_subscription_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='razorpay_payment_id') THEN
    ALTER TABLE public.subscriptions ADD COLUMN razorpay_payment_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='razorpay_signature') THEN
    ALTER TABLE public.subscriptions ADD COLUMN razorpay_signature TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='razorpay_plan_id') THEN
    ALTER TABLE public.subscriptions ADD COLUMN razorpay_plan_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='current_period_start') THEN
    ALTER TABLE public.subscriptions ADD COLUMN current_period_start TIMESTAMPTZ DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='cancel_at_period_end') THEN
    ALTER TABLE public.subscriptions ADD COLUMN cancel_at_period_end BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='cancelled_at') THEN
    ALTER TABLE public.subscriptions ADD COLUMN cancelled_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='updated_at') THEN
    ALTER TABLE public.subscriptions ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- Enable RLS and Policies for subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own subscriptions" ON public.subscriptions;
CREATE POLICY "Users view own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own subscriptions" ON public.subscriptions;
CREATE POLICY "Users insert own subscriptions"
  ON public.subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own subscriptions" ON public.subscriptions;
CREATE POLICY "Users update own subscriptions"
  ON public.subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- Index for lookup by Razorpay subscription ID and user ID
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_rzp_sub_id ON public.subscriptions(razorpay_subscription_id);

-- 2. Update profiles table with subscription tracking
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='subscription_tier') THEN
    ALTER TABLE public.profiles ADD COLUMN subscription_tier TEXT DEFAULT 'FREE';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='subscription_status') THEN
    ALTER TABLE public.profiles ADD COLUMN subscription_status TEXT DEFAULT 'active';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='razorpay_subscription_id') THEN
    ALTER TABLE public.profiles ADD COLUMN razorpay_subscription_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='subscription_period_end') THEN
    ALTER TABLE public.profiles ADD COLUMN subscription_period_end TIMESTAMPTZ;
  END IF;
END $$;
