import crypto from 'crypto';
import Razorpay from 'razorpay';
import {
  upsertUserSubscription,
  downgradeSubscriptionByRazorpayId,
  recordUsageEvent,
} from './supabaseAdmin';

export const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
export const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
export const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';

export const isRazorpayConfigured = Boolean(
  RAZORPAY_KEY_ID &&
  RAZORPAY_KEY_SECRET &&
  !RAZORPAY_KEY_ID.includes('placeholder')
);

// Lazy Razorpay instance
let razorpayInstance: any = null;

export function getRazorpayClient(): any {
  if (!isRazorpayConfigured) return null;
  if (!razorpayInstance) {
    razorpayInstance = new (Razorpay as any)({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayInstance;
}

export const PLAN_PRICING = {
  FREE: {
    id: 'FREE',
    name: 'Free',
    amount: 0,
    currency: 'INR',
    period: 'monthly',
  },
  RESEARCHER: {
    id: 'RESEARCHER',
    name: 'Researcher Plan',
    amount: 29900, // in paise (₹299.00)
    currency: 'INR',
    period: 'monthly',
    envPlanId: process.env.RAZORPAY_PLAN_RESEARCHER_ID,
  },
  PRO_RESEARCHER: {
    id: 'PRO_RESEARCHER',
    name: 'Pro Researcher Plan',
    amount: 69900, // in paise (₹699.00)
    currency: 'INR',
    period: 'monthly',
    envPlanId: process.env.RAZORPAY_PLAN_PRO_RESEARCHER_ID,
  },
} as const;

export type SupportedPlan = 'RESEARCHER' | 'PRO_RESEARCHER';

/**
 * Ensures or retrieves a Razorpay Plan ID for a given tier.
 */
async function getOrCreateRazorpayPlanId(planTier: SupportedPlan): Promise<string | null> {
  const rzp = getRazorpayClient();
  if (!rzp) return null;

  const planConfig = PLAN_PRICING[planTier];
  if (planConfig.envPlanId) {
    return planConfig.envPlanId;
  }

  try {
    const createdPlan = await rzp.plans.create({
      period: 'monthly',
      interval: 1,
      item: {
        name: `RePa ${planConfig.name}`,
        amount: planConfig.amount,
        currency: planConfig.currency,
        description: `RePa Academic Studio ${planConfig.name} Subscription`,
      },
      notes: {
        platform: 'RePa Academic Manuscript Studio',
        tier: planTier,
      },
    });
    return createdPlan.id;
  } catch (err: any) {
    console.warn('[Razorpay] Plan creation fallback notice:', err?.message || err);
    return null;
  }
}

/**
 * Creates a Razorpay Subscription or Order for subscription checkout.
 */
export async function createCheckoutSession(params: {
  planTier: SupportedPlan;
  userId: string;
  userEmail?: string;
  userName?: string;
}) {
  const { planTier, userId, userEmail, userName } = params;
  const planInfo = PLAN_PRICING[planTier];

  if (!planInfo) {
    throw new Error(`Invalid plan selected: ${planTier}`);
  }

  const rzp = getRazorpayClient();

  // If Razorpay keys are configured in Test Mode or Live Mode:
  if (rzp) {
    try {
      const planId = await getOrCreateRazorpayPlanId(planTier);
      let subscriptionId: string | null = null;

      if (planId) {
        try {
          const subscription = await rzp.subscriptions.create({
            plan_id: planId,
            total_count: 12,
            quantity: 1,
            customer_notify: 1,
            notes: {
              userId,
              planTier,
              userEmail: userEmail || '',
              userName: userName || '',
            },
          });
          subscriptionId = subscription.id;
        } catch (subErr) {
          console.warn('[Razorpay] Recurring subscription creation notice:', subErr);
        }
      }

      // Also create an order as universal fallback for test checkout
      const order = await rzp.orders.create({
        amount: planInfo.amount,
        currency: planInfo.currency,
        receipt: `repa_sub_${Date.now()}`,
        notes: {
          userId,
          planTier,
          subscriptionId: subscriptionId || '',
        },
      });

      return {
        isTestSimulation: false,
        keyId: RAZORPAY_KEY_ID,
        planTier,
        amount: planInfo.amount,
        currency: planInfo.currency,
        subscriptionId: subscriptionId || undefined,
        orderId: order.id,
        planName: planInfo.name,
      };
    } catch (err: any) {
      console.error('[Razorpay] Failed to create checkout with Razorpay API:', err);
      throw new Error(`Razorpay checkout initialization failed: ${err.message || 'Check credentials'}`);
    }
  }

  // Simulated test mode when RAZORPAY_KEY_ID / SECRET are not yet set in environment
  const mockSubId = `sub_test_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const mockOrderId = `order_test_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  return {
    isTestSimulation: true,
    keyId: 'rzp_test_placeholder',
    planTier,
    amount: planInfo.amount,
    currency: planInfo.currency,
    subscriptionId: mockSubId,
    orderId: mockOrderId,
    planName: planInfo.name,
    warning: 'Running in Test Simulation Mode. Configure RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET in Settings/.env for live test transactions.',
  };
}

/**
 * Verifies Razorpay payment signature and activates the purchased plan in Supabase.
 */
export async function verifyPaymentAndActivate(params: {
  userId: string;
  planTier: SupportedPlan;
  razorpayPaymentId: string;
  razorpaySubscriptionId?: string;
  razorpayOrderId?: string;
  razorpaySignature: string;
  isTestSimulation?: boolean;
}): Promise<{ success: boolean; error?: string; plan: string }> {
  const {
    userId,
    planTier,
    razorpayPaymentId,
    razorpaySubscriptionId,
    razorpayOrderId,
    razorpaySignature,
    isTestSimulation,
  } = params;

  if (isTestSimulation || !isRazorpayConfigured) {
    console.log('[Razorpay] Simulating verified payment activation for test mode.');
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await upsertUserSubscription({
      userId,
      plan: planTier,
      status: 'active',
      razorpaySubscriptionId: razorpaySubscriptionId || `sub_sim_${Date.now()}`,
      razorpayPaymentId: razorpayPaymentId || `pay_sim_${Date.now()}`,
      razorpaySignature: razorpaySignature || 'simulated_signature',
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd,
    });

    return { success: true, plan: planTier };
  }

  // Real cryptographic HMAC SHA256 signature verification
  let expectedSignature = '';

  if (razorpaySubscriptionId) {
    // Subscription signature: payment_id + '|' + subscription_id
    expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpayPaymentId}|${razorpaySubscriptionId}`)
      .digest('hex');
  } else if (razorpayOrderId) {
    // Order signature: order_id + '|' + payment_id
    expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');
  } else {
    return { success: false, error: 'Missing subscription ID or order ID for verification', plan: 'FREE' };
  }

  if (expectedSignature !== razorpaySignature) {
    console.error('[Razorpay] Signature mismatch!', { expectedSignature, razorpaySignature });
    return { success: false, error: 'Invalid payment signature. Verification failed.', plan: 'FREE' };
  }

  // Signature is authentic and verified!
  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days active access

  const saveResult = await upsertUserSubscription({
    userId,
    plan: planTier,
    status: 'active',
    razorpaySubscriptionId: razorpaySubscriptionId || razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: periodEnd,
  });

  if (!saveResult.success) {
    console.warn('[Razorpay] Warning saving subscription to Supabase:', saveResult.error);
  }

  return { success: true, plan: planTier };
}

/**
 * Handles incoming Razorpay Webhook events.
 */
export async function handleRazorpayWebhook(
  rawBody: string,
  signatureHeader: string
): Promise<{ processed: boolean; message: string }> {
  if (RAZORPAY_WEBHOOK_SECRET) {
    const expectedSig = crypto
      .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    if (expectedSig !== signatureHeader) {
      console.error('[Razorpay Webhook] Invalid webhook signature');
      throw new Error('Invalid webhook signature');
    }
  }

  const event = JSON.parse(rawBody);
  const eventName = event.event;
  console.log(`[Razorpay Webhook] Received event: ${eventName}`);

  switch (eventName) {
    case 'subscription.authenticated':
    case 'subscription.activated':
    case 'subscription.charged': {
      const subEntity = event.payload?.subscription?.entity;
      const paymentEntity = event.payload?.payment?.entity;
      const subId = subEntity?.id;
      const userId = subEntity?.notes?.userId || paymentEntity?.notes?.userId;
      const planTier = (subEntity?.notes?.planTier || paymentEntity?.notes?.planTier || 'RESEARCHER') as SupportedPlan;

      if (userId && subId) {
        const periodStart = subEntity?.current_start
          ? new Date(subEntity.current_start * 1000).toISOString()
          : new Date().toISOString();
        const periodEnd = subEntity?.current_end
          ? new Date(subEntity.current_end * 1000).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        await upsertUserSubscription({
          userId,
          plan: planTier,
          status: 'active',
          razorpaySubscriptionId: subId,
          razorpayPaymentId: paymentEntity?.id,
          razorpayCustomerId: subEntity?.customer_id,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        });
        console.log(`[Razorpay Webhook] Activated ${planTier} for user ${userId}`);
      }
      break;
    }

    case 'payment.captured': {
      const payment = event.payload?.payment?.entity;
      const userId = payment?.notes?.userId;
      const planTier = payment?.notes?.planTier as SupportedPlan;
      if (userId && planTier) {
        const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        await upsertUserSubscription({
          userId,
          plan: planTier,
          status: 'active',
          razorpayPaymentId: payment.id,
          razorpaySubscriptionId: payment.notes?.subscriptionId || payment.order_id,
          currentPeriodEnd: periodEnd,
        });
        console.log(`[Razorpay Webhook] Payment captured. Activated ${planTier} for user ${userId}`);
      }
      break;
    }

    case 'subscription.cancelled':
    case 'subscription.halted':
    case 'subscription.expired': {
      const subEntity = event.payload?.subscription?.entity;
      const subId = subEntity?.id;
      if (subId) {
        const newStatus = eventName === 'subscription.expired' ? 'expired' : 'cancelled';
        await downgradeSubscriptionByRazorpayId(subId, newStatus);
        console.log(`[Razorpay Webhook] Downgraded subscription ${subId} to ${newStatus}`);
      }
      break;
    }

    case 'payment.failed': {
      const payment = event.payload?.payment?.entity;
      console.warn('[Razorpay Webhook] Payment failed for transaction:', payment?.id);
      break;
    }

    default:
      console.log(`[Razorpay Webhook] Unhandled event type: ${eventName}`);
  }

  return { processed: true, message: `Event ${eventName} handled successfully.` };
}

/**
 * Cancels a subscription via Razorpay API and downgrades user in Supabase.
 */
export async function cancelUserSubscription(userId: string, subscriptionId: string) {
  const rzp = getRazorpayClient();
  if (rzp && subscriptionId && !subscriptionId.startsWith('sub_sim_') && !subscriptionId.startsWith('sub_test_')) {
    try {
      await rzp.subscriptions.cancel(subscriptionId, false); // false = cancel immediately or at cycle end
    } catch (err: any) {
      console.warn('[Razorpay] Subscription cancellation API warning:', err?.message || err);
    }
  }

  // Downgrade in Supabase
  await downgradeSubscriptionByRazorpayId(subscriptionId, 'cancelled');
  return { success: true };
}
