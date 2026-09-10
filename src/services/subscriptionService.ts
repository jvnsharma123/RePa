import { PlanTier, PLAN_CONFIGS, SubscriptionState, SubscriptionStatus } from '../types/subscription';

const STORAGE_KEY = 'repa_subscription_state';

// Load Razorpay Standard Checkout Script dynamically
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      return resolve(false);
    }
    if ((window as any).Razorpay) {
      return resolve(true);
    }
    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn('Failed to load Razorpay checkout script.');
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

/**
 * Get initial default subscription state
 */
export function getDefaultSubscriptionState(): SubscriptionState {
  const currentMonthKey = new Date().toISOString().substring(0, 7); // YYYY-MM
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.monthKey === currentMonthKey) {
        return {
          plan: parsed.plan || 'FREE',
          status: parsed.status || 'active',
          razorpaySubscriptionId: parsed.razorpaySubscriptionId || null,
          currentPeriodEnd: parsed.currentPeriodEnd || null,
          usage: {
            aiAnalysesThisMonth: parsed.usage?.aiAnalysesThisMonth || 0,
            exportsThisMonth: parsed.usage?.exportsThisMonth || 0,
          },
        };
      }
    }
  } catch {
    // Ignore localStorage errors
  }

  return {
    plan: 'FREE',
    status: 'active',
    razorpaySubscriptionId: null,
    currentPeriodEnd: null,
    usage: {
      aiAnalysesThisMonth: 0,
      exportsThisMonth: 0,
    },
  };
}

/**
 * Persist state to local cache
 */
export function saveSubscriptionState(state: SubscriptionState) {
  try {
    const currentMonthKey = new Date().toISOString().substring(0, 7);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...state,
        monthKey: currentMonthKey,
      })
    );
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Query backend for updated subscription and monthly usage
 */
export async function fetchSubscriptionStatus(userId?: string): Promise<SubscriptionState> {
  try {
    const res = await fetch(`/api/subscription/status?userId=${encodeURIComponent(userId || 'default_user')}`);
    if (!res.ok) throw new Error('Status fetch failed');
    const data = await res.json();

    const state: SubscriptionState = {
      plan: (data.plan as PlanTier) || 'FREE',
      status: (data.status as SubscriptionStatus) || 'active',
      razorpaySubscriptionId: data.razorpaySubscriptionId || null,
      currentPeriodEnd: data.currentPeriodEnd || null,
      usage: {
        aiAnalysesThisMonth: data.usage?.aiAnalyses || 0,
        exportsThisMonth: data.usage?.exports || 0,
      },
    };

    saveSubscriptionState(state);
    return state;
  } catch {
    return getDefaultSubscriptionState();
  }
}

export const getSubscriptionState = fetchSubscriptionStatus;

/**
 * Record action usage
 */
export async function trackActionUsage(
  actionType: 'ai_analysis' | 'export',
  userId?: string
): Promise<SubscriptionState> {
  const current = getDefaultSubscriptionState();
  if (actionType === 'ai_analysis') {
    current.usage.aiAnalysesThisMonth += 1;
  } else if (actionType === 'export') {
    current.usage.exportsThisMonth += 1;
  }
  saveSubscriptionState(current);

  // Sync with server if online
  try {
    await fetch('/api/usage/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userId || 'default_user',
        actionType,
        metadata: { timestamp: new Date().toISOString() },
      }),
    });
  } catch {
    // Silent fallback
  }

  return current;
}

export const recordUsageAction = (
  userId: string,
  actionType: 'ai_analysis' | 'export',
  _amount = 1
): Promise<SubscriptionState> => trackActionUsage(actionType, userId);

/**
 * Validates whether user is allowed to perform a plan-governed action
 */
export function checkPlanLimits(params: {
  action: 'create_project' | 'ai_analysis' | 'add_reference' | 'export';
  currentPlan: PlanTier;
  currentUsage: { aiAnalysesThisMonth: number; exportsThisMonth: number };
  activeProjectsCount?: number;
  currentReferencesCount?: number;
}): { allowed: boolean; reason?: string; limit?: number; current?: number; targetPlan?: PlanTier } {
  const { action, currentPlan, currentUsage, activeProjectsCount = 0, currentReferencesCount = 0 } = params;
  const limits = PLAN_CONFIGS[currentPlan];

  switch (action) {
    case 'create_project': {
      if (activeProjectsCount >= limits.maxActiveProjects) {
        return {
          allowed: false,
          reason: `You have reached your limit of ${limits.maxActiveProjects} active project${limits.maxActiveProjects > 1 ? 's' : ''} on the ${limits.name} plan.`,
          limit: limits.maxActiveProjects,
          current: activeProjectsCount,
          targetPlan: currentPlan === 'FREE' ? 'RESEARCHER' : 'PRO_RESEARCHER',
        };
      }
      return { allowed: true };
    }

    case 'ai_analysis': {
      if (currentUsage.aiAnalysesThisMonth >= limits.maxAiAnalysesPerMonth) {
        return {
          allowed: false,
          reason: `Monthly AI analysis quota reached (${limits.maxAiAnalysesPerMonth}/${limits.maxAiAnalysesPerMonth} used) on the ${limits.name} plan.`,
          limit: limits.maxAiAnalysesPerMonth,
          current: currentUsage.aiAnalysesThisMonth,
          targetPlan: currentPlan === 'FREE' ? 'RESEARCHER' : 'PRO_RESEARCHER',
        };
      }
      return { allowed: true };
    }

    case 'add_reference': {
      if (currentReferencesCount >= limits.maxReferencesPerProject) {
        return {
          allowed: false,
          reason: `The Free plan is limited to ${limits.maxReferencesPerProject} references per project.`,
          limit: limits.maxReferencesPerProject,
          current: currentReferencesCount,
          targetPlan: 'RESEARCHER',
        };
      }
      return { allowed: true };
    }

    case 'export': {
      if (currentUsage.exportsThisMonth >= limits.maxExportsPerMonth) {
        return {
          allowed: false,
          reason: `Monthly export limit reached (${limits.maxExportsPerMonth}/${limits.maxExportsPerMonth} DOCX/PDF exports used) on the ${limits.name} plan.`,
          limit: limits.maxExportsPerMonth,
          current: currentUsage.exportsThisMonth,
          targetPlan: 'RESEARCHER',
        };
      }
      return { allowed: true };
    }

    default:
      return { allowed: true };
  }
}

/**
 * Initiates Razorpay checkout subscription
 */
export async function executeRazorpaySubscriptionCheckout(params: {
  planTier: 'RESEARCHER' | 'PRO_RESEARCHER';
  user: {
    id: string;
    email?: string;
    name?: string;
  };
  onSuccess: (activatedPlan: PlanTier) => void;
  onError: (errorMessage: string) => void;
  onCancel?: () => void;
}) {
  const { planTier, user, onSuccess, onError, onCancel } = params;

  try {
    // 1. Request session creation from server
    const createRes = await fetch('/api/subscription/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planTier,
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json();
      throw new Error(err.error || 'Failed to initialize subscription checkout');
    }

    const session = await createRes.json();

    // 2. Load script
    const scriptLoaded = await loadRazorpayScript();

    // If running in simulation mode or Razorpay window is available
    if (session.isTestSimulation || !(window as any).Razorpay || !scriptLoaded) {
      // Prompt user with simulation modal / confirm
      const confirmSimulated = window.confirm(
        `[Test Mode / Simulation]\nUpgrade to ${session.planName} for ₹${session.amount / 100}/month?\n\n(Click OK to simulate verified payment confirmation)`
      );

      if (!confirmSimulated) {
        if (onCancel) onCancel();
        return;
      }

      // Verify simulated payment
      const verifyRes = await fetch('/api/subscription/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          planTier,
          razorpayPaymentId: `pay_sim_${Date.now()}`,
          razorpaySubscriptionId: session.subscriptionId || `sub_sim_${Date.now()}`,
          razorpayOrderId: session.orderId,
          razorpaySignature: 'simulated_valid_signature',
          isTestSimulation: true,
        }),
      });

      const verifyData = await verifyRes.json();
      if (verifyData.success) {
        const updated = getDefaultSubscriptionState();
        updated.plan = planTier;
        updated.status = 'active';
        saveSubscriptionState(updated);
        onSuccess(planTier);
      } else {
        onError(verifyData.error || 'Payment verification simulation failed');
      }
      return;
    }

    // 3. Real Razorpay Checkout Modal
    const options: any = {
      key: session.keyId,
      amount: session.amount,
      currency: session.currency || 'INR',
      name: 'RePa Manuscript Studio',
      description: `${session.planName} (Monthly Subscription)`,
      image: 'https://ais-dev-nfn7oovk26qfblcysjnfhm-836047865862.asia-southeast1.run.app/favicon.ico',
      order_id: session.orderId,
      subscription_id: session.subscriptionId,
      prefill: {
        name: user.name || '',
        email: user.email || '',
      },
      notes: {
        userId: user.id,
        planTier,
      },
      theme: {
        color: '#141414',
      },
      modal: {
        ondismiss: function () {
          if (onCancel) onCancel();
        },
      },
      handler: async function (response: any) {
        try {
          // Send verification payload to server
          const verifyRes = await fetch('/api/subscription/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              planTier,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySubscriptionId: response.razorpay_subscription_id || session.subscriptionId,
              razorpayOrderId: response.razorpay_order_id || session.orderId,
              razorpaySignature: response.razorpay_signature,
            }),
          });

          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            const updated = getDefaultSubscriptionState();
            updated.plan = planTier;
            updated.status = 'active';
            saveSubscriptionState(updated);
            onSuccess(planTier);
          } else {
            onError(verifyData.error || 'Payment verification failed');
          }
        } catch (err: any) {
          onError(err.message || 'Error communicating with payment verification server');
        }
      },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.on('payment.failed', function (resp: any) {
      onError(resp.error?.description || 'Payment was declined or failed');
    });
    rzp.open();
  } catch (err: any) {
    onError(err.message || 'Subscription checkout failed to initiate');
  }
}

/**
 * Cancel user subscription
 */
export async function cancelSubscription(userId: string, subscriptionId: string): Promise<boolean> {
  try {
    const res = await fetch('/api/subscription/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, subscriptionId }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.success) {
      const state = getDefaultSubscriptionState();
      state.plan = 'FREE';
      state.status = 'cancelled';
      saveSubscriptionState(state);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
