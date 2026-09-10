import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

export const isServerSupabaseConfigured = Boolean(
  supabaseUrl &&
  serviceRoleKey &&
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('placeholder')
);

export const supabaseAdmin: SupabaseClient | null = isServerSupabaseConfigured
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

export interface SubscriptionRecord {
  userId: string;
  plan: 'FREE' | 'RESEARCHER' | 'PRO_RESEARCHER';
  status: 'active' | 'authenticated' | 'cancelled' | 'expired' | 'halted' | 'pending';
  razorpayCustomerId?: string;
  razorpaySubscriptionId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  razorpayPlanId?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  cancelledAt?: string;
}

/**
 * Upserts a subscription into Supabase and synchronizes user profile tier.
 */
export async function upsertUserSubscription(sub: SubscriptionRecord): Promise<{ success: boolean; error?: any }> {
  if (!supabaseAdmin) {
    console.log('[SupabaseAdmin] Supabase not configured on server; subscription cached in memory.');
    return { success: true };
  }

  try {
    // 1. Insert/Update subscriptions table
    const { error: subError } = await supabaseAdmin.from('subscriptions').upsert(
      {
        user_id: sub.userId,
        plan: sub.plan,
        status: sub.status,
        razorpay_customer_id: sub.razorpayCustomerId || null,
        razorpay_subscription_id: sub.razorpaySubscriptionId || null,
        razorpay_payment_id: sub.razorpayPaymentId || null,
        razorpay_signature: sub.razorpaySignature || null,
        razorpay_plan_id: sub.razorpayPlanId || null,
        current_period_start: sub.currentPeriodStart || new Date().toISOString(),
        current_period_end: sub.currentPeriodEnd || null,
        cancel_at_period_end: sub.cancelAtPeriodEnd || false,
        cancelled_at: sub.cancelledAt || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'razorpay_subscription_id' }
    );

    if (subError) {
      console.error('[SupabaseAdmin] Error saving subscription record:', subError);
    }

    // 2. Update user profile subscription tier and status
    const { error: profError } = await supabaseAdmin
      .from('profiles')
      .update({
        subscription_tier: sub.plan,
        subscription_status: sub.status,
        razorpay_subscription_id: sub.razorpaySubscriptionId || null,
        subscription_period_end: sub.currentPeriodEnd || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sub.userId);

    if (profError) {
      console.warn('[SupabaseAdmin] Error updating profile subscription_tier:', profError);
    }

    return { success: true };
  } catch (err: any) {
    console.error('[SupabaseAdmin] Subscription sync failure:', err);
    return { success: false, error: err?.message || err };
  }
}

/**
 * Downgrades a user subscription upon cancellation, expiration, or payment failure.
 */
export async function downgradeSubscriptionByRazorpayId(
  razorpaySubscriptionId: string,
  newStatus: 'cancelled' | 'expired' | 'halted' = 'cancelled'
): Promise<{ success: boolean; error?: any }> {
  if (!supabaseAdmin) return { success: true };

  try {
    // Find matching subscription record
    const { data: subData } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id')
      .eq('razorpay_subscription_id', razorpaySubscriptionId)
      .maybeSingle();

    // Update subscription record status
    await supabaseAdmin
      .from('subscriptions')
      .update({
        status: newStatus,
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('razorpay_subscription_id', razorpaySubscriptionId);

    if (subData?.user_id) {
      // Downgrade profile to FREE
      await supabaseAdmin
        .from('profiles')
        .update({
          subscription_tier: 'FREE',
          subscription_status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subData.user_id);
    }

    return { success: true };
  } catch (err: any) {
    console.error('[SupabaseAdmin] Downgrade subscription failure:', err);
    return { success: false, error: err?.message || err };
  }
}

/**
 * Get active user subscription and profile tier.
 */
export async function getUserSubscriptionDetails(userId: string) {
  if (!supabaseAdmin) {
    return {
      plan: 'FREE',
      status: 'active',
      razorpaySubscriptionId: null,
      currentPeriodEnd: null,
    };
  }

  try {
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('subscription_tier, subscription_status, subscription_period_end')
      .eq('id', userId)
      .maybeSingle();

    const plan = (profile?.subscription_tier || sub?.plan || 'FREE') as 'FREE' | 'RESEARCHER' | 'PRO_RESEARCHER';
    const status = profile?.subscription_status || sub?.status || 'active';

    // Auto-check if subscription period has expired
    if (status === 'active' && profile?.subscription_period_end) {
      const expiry = new Date(profile.subscription_period_end).getTime();
      if (expiry < Date.now()) {
        // Expired! Automatically downgrade
        await supabaseAdmin
          .from('profiles')
          .update({ subscription_tier: 'FREE', subscription_status: 'expired', updated_at: new Date().toISOString() })
          .eq('id', userId);
        return {
          plan: 'FREE',
          status: 'expired',
          razorpaySubscriptionId: sub?.razorpay_subscription_id || null,
          currentPeriodEnd: profile.subscription_period_end,
        };
      }
    }

    return {
      plan,
      status,
      razorpaySubscriptionId: sub?.razorpay_subscription_id || null,
      currentPeriodEnd: profile?.subscription_period_end || sub?.current_period_end || null,
    };
  } catch (err) {
    console.error('[SupabaseAdmin] Fetch subscription details error:', err);
    return {
      plan: 'FREE',
      status: 'active',
      razorpaySubscriptionId: null,
      currentPeriodEnd: null,
    };
  }
}

/**
 * Record usage event in public.usage_records
 */
export async function recordUsageEvent(userId: string, actionType: 'ai_analysis' | 'export', metadata: any = {}) {
  if (!supabaseAdmin) return;
  try {
    await supabaseAdmin.from('usage_records').insert({
      user_id: userId,
      action_type: actionType,
      metadata: metadata,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[SupabaseAdmin] Failed to record usage event:', err);
  }
}

/**
 * Get count of usage events in current calendar month.
 */
export async function getMonthlyUsageCounts(userId: string): Promise<{ aiAnalyses: number; exports: number }> {
  if (!supabaseAdmin) return { aiAnalyses: 0, exports: 0 };
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data, error } = await supabaseAdmin
      .from('usage_records')
      .select('action_type')
      .eq('user_id', userId)
      .gte('created_at', startOfMonth.toISOString());

    if (error || !data) return { aiAnalyses: 0, exports: 0 };

    const aiAnalyses = data.filter((d) => d.action_type === 'ai_analysis').length;
    const exports = data.filter((d) => d.action_type === 'export').length;

    return { aiAnalyses, exports };
  } catch {
    return { aiAnalyses: 0, exports: 0 };
  }
}
