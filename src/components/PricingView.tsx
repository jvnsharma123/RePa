import React, { useState } from 'react';
import {
  Check,
  Zap,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  HelpCircle,
  Clock,
  Layers,
  FileText,
  BookOpen,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { PlanTier, PLAN_CONFIGS } from '../types/subscription';
import { executeRazorpaySubscriptionCheckout, cancelSubscription } from '../services/subscriptionService';
import { UserProfile } from '../types';

interface PricingViewProps {
  currentPlan: PlanTier;
  userProfile: UserProfile | null;
  userId?: string | null;
  onPlanChanged: (newPlan: PlanTier) => void;
  onOpenAuthModal?: () => void;
}

export const PricingView: React.FC<PricingViewProps> = ({
  currentPlan,
  userProfile,
  userId,
  onPlanChanged,
  onOpenAuthModal,
}) => {
  const [loadingTier, setLoadingTier] = useState<PlanTier | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const handleUpgrade = async (tier: 'RESEARCHER' | 'PRO_RESEARCHER') => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const activeUserId = userId || userProfile?.id || 'usr_guest';

    setLoadingTier(tier);
    await executeRazorpaySubscriptionCheckout({
      planTier: tier,
      user: {
        id: activeUserId,
        email: userProfile?.email,
        name: userProfile?.name,
      },
      onSuccess: (activated) => {
        setLoadingTier(null);
        setSuccessMessage(`Successfully upgraded to ${PLAN_CONFIGS[activated].name}! Your higher quotas and features are active.`);
        onPlanChanged(activated);
      },
      onError: (err) => {
        setLoadingTier(null);
        setErrorMessage(err || 'Payment failed or was cancelled');
      },
      onCancel: () => {
        setLoadingTier(null);
      },
    });
  };

  const handleCancelSub = async () => {
    if (!confirm('Are you sure you want to cancel your paid subscription? You will be downgraded to the Free tier.')) {
      return;
    }
    setCancelling(true);
    const activeUserId = userId || userProfile?.id || 'usr_guest';
    const subId = (userProfile as any)?.razorpay_subscription_id || 'sub_active';
    const ok = await cancelSubscription(activeUserId, subId);
    setCancelling(false);
    if (ok) {
      setSuccessMessage('Subscription successfully cancelled. Your account has been reverted to the Free plan.');
      onPlanChanged('FREE');
    } else {
      setErrorMessage('Failed to cancel subscription. Please check your connection or contact support.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 font-sans">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-[#141414] text-[#141414] text-[11px] font-mono uppercase tracking-wider mb-3">
          <ShieldCheck className="w-3.5 h-3.5 text-[#141414]" />
          <span>Academic Subscriptions & Transparent Limits</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif-academic font-bold text-[#141414] tracking-tight">
          Invest in Your Academic Productivity
        </h1>
        <p className="text-xs sm:text-sm text-[#141414]/70 mt-2">
          Transparent, monthly subscriptions backed by secure Razorpay payments. Cancel anytime with zero lock-in.
        </p>

        {/* Status notification banner */}
        {successMessage && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-md flex items-center gap-2 justify-center">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-300 text-rose-800 text-xs rounded-md flex items-center gap-2 justify-center">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* FREE PLAN */}
        <div
          className={`bg-white border ${
            currentPlan === 'FREE' ? 'border-[#141414] shadow-[6px_6px_0px_rgba(20,20,20,0.15)] ring-1 ring-[#141414]' : 'border-[#141414]/20'
          } p-6 flex flex-col justify-between transition-all`}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-xs uppercase font-bold tracking-wider text-[#141414]/70">STARTER</span>
              {currentPlan === 'FREE' && (
                <span className="px-2 py-0.5 bg-[#F0EFED] border border-[#141414]/30 text-[#141414] text-[10px] font-mono uppercase font-bold">
                  Current Plan
                </span>
              )}
            </div>

            <h3 className="text-xl font-bold text-[#141414]">Free</h3>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-[#141414]">₹0</span>
              <span className="text-xs text-[#141414]/60 font-mono">/ forever</span>
            </div>
            <p className="text-xs text-[#141414]/70 mt-2">
              Essential scholarly workspace for individual research manuscripts.
            </p>

            <div className="my-6 border-t border-[#141414]/10" />

            {/* Limits Checklist */}
            <div className="space-y-3 text-xs text-[#141414]">
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[#141414] shrink-0 mt-0.5" />
                <span><strong>1 active project</strong></span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[#141414] shrink-0 mt-0.5" />
                <span><strong>10 AI analyses</strong> / month</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[#141414] shrink-0 mt-0.5" />
                <span><strong>20 references</strong> limit</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[#141414] shrink-0 mt-0.5" />
                <span><strong>2 DOCX/PDF exports</strong> / month</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[#141414] shrink-0 mt-0.5" />
                <span>Core citation styles (Vancouver, APA, IEEE)</span>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <button
              disabled
              className="w-full py-2.5 bg-[#F0EFED] text-[#141414]/50 border border-[#141414]/20 text-xs font-mono uppercase font-bold cursor-default text-center"
            >
              {currentPlan === 'FREE' ? 'Active Plan' : 'Free Tier'}
            </button>
          </div>
        </div>

        {/* RESEARCHER PLAN */}
        <div
          className={`bg-white border ${
            currentPlan === 'RESEARCHER' ? 'border-[#141414] shadow-[6px_6px_0px_rgba(20,20,20,0.15)] ring-2 ring-[#141414]' : 'border-[#141414]/40'
          } p-6 flex flex-col justify-between relative transition-all`}
        >
          <div className="absolute -top-3 left-6">
            <span className="bg-[#141414] text-white text-[10px] font-mono uppercase px-2.5 py-0.5 border border-[#141414] tracking-wider font-bold">
              RECOMMENDED FOR FACULTY &amp; PHDS
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4 mt-2">
              <span className="font-mono text-xs uppercase font-bold tracking-wider text-[#141414]/70">SCHOLAR</span>
              {currentPlan === 'RESEARCHER' && (
                <span className="px-2 py-0.5 bg-emerald-100 border border-emerald-500 text-emerald-800 text-[10px] font-mono uppercase font-bold">
                  Active Plan
                </span>
              )}
            </div>

            <h3 className="text-xl font-bold text-[#141414]">Researcher</h3>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-[#141414]">₹299</span>
              <span className="text-xs text-[#141414]/60 font-mono">/ month</span>
            </div>
            <p className="text-xs text-[#141414]/70 mt-2">
              Expanded capacity for active authors and publishing researchers.
            </p>

            <div className="my-6 border-t border-[#141414]/10" />

            {/* Limits Checklist */}
            <div className="space-y-3 text-xs text-[#141414]">
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span><strong>5 active projects</strong></span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span><strong>100 AI analyses</strong> / month</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span><strong>Unlimited references</strong></span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span><strong>Unlimited DOCX/PDF exports</strong></span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span><strong>All citation styles</strong> (Harvard, Chicago, MLA, etc.)</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span><strong>All manuscript formats</strong> &amp; journal guidelines</span>
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-2">
            {currentPlan === 'RESEARCHER' ? (
              <div className="space-y-2">
                <button
                  disabled
                  className="w-full py-2.5 bg-emerald-50 text-emerald-800 border border-emerald-500 text-xs font-mono uppercase font-bold cursor-default text-center"
                >
                  Current Plan
                </button>
                <button
                  onClick={handleCancelSub}
                  disabled={cancelling}
                  className="w-full py-1 text-[11px] text-rose-600 hover:text-rose-800 underline text-center cursor-pointer"
                >
                  {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleUpgrade('RESEARCHER')}
                disabled={loadingTier !== null}
                className="w-full py-2.5 bg-[#141414] hover:bg-[#333333] text-white border border-[#141414] text-xs font-mono uppercase font-bold tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                {loadingTier === 'RESEARCHER' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Razorpay...</span>
                  </>
                ) : (
                  <>
                    <span>Upgrade to Researcher</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* PRO RESEARCHER PLAN */}
        <div
          className={`bg-white border ${
            currentPlan === 'PRO_RESEARCHER' ? 'border-[#141414] shadow-[6px_6px_0px_rgba(20,20,20,0.15)] ring-2 ring-[#141414]' : 'border-[#141414]/30'
          } p-6 flex flex-col justify-between transition-all`}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-xs uppercase font-bold tracking-wider text-[#141414]/70">ENTERPRISE LAB</span>
              {currentPlan === 'PRO_RESEARCHER' && (
                <span className="px-2 py-0.5 bg-indigo-100 border border-indigo-500 text-indigo-800 text-[10px] font-mono uppercase font-bold">
                  Active Plan
                </span>
              )}
            </div>

            <h3 className="text-xl font-bold text-[#141414]">Pro Researcher</h3>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-[#141414]">₹699</span>
              <span className="text-xs text-[#141414]/60 font-mono">/ month</span>
            </div>
            <p className="text-xs text-[#141414]/70 mt-2">
              Maximum capability with high-throughput synthesis and priority AI processing.
            </p>

            <div className="my-6 border-t border-[#141414]/10" />

            {/* Limits Checklist */}
            <div className="space-y-3 text-xs text-[#141414]">
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[#141414] shrink-0 mt-0.5" />
                <span><strong>Unlimited projects</strong></span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[#141414] shrink-0 mt-0.5" />
                <span><strong>300 AI analyses</strong> / month</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[#141414] shrink-0 mt-0.5" />
                <span><strong>Unlimited references</strong></span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[#141414] shrink-0 mt-0.5" />
                <span><strong>Unlimited DOCX/PDF exports</strong></span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[#141414] shrink-0 mt-0.5" />
                <span><strong>Advanced AI analysis</strong> (deep cross-corpus synthesis)</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[#141414] shrink-0 mt-0.5" />
                <span><strong>Priority processing</strong> engine</span>
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-2">
            {currentPlan === 'PRO_RESEARCHER' ? (
              <div className="space-y-2">
                <button
                  disabled
                  className="w-full py-2.5 bg-indigo-50 text-indigo-800 border border-indigo-500 text-xs font-mono uppercase font-bold cursor-default text-center"
                >
                  Current Plan
                </button>
                <button
                  onClick={handleCancelSub}
                  disabled={cancelling}
                  className="w-full py-1 text-[11px] text-rose-600 hover:text-rose-800 underline text-center cursor-pointer"
                >
                  {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleUpgrade('PRO_RESEARCHER')}
                disabled={loadingTier !== null}
                className="w-full py-2.5 bg-[#141414] hover:bg-[#333333] text-white border border-[#141414] text-xs font-mono uppercase font-bold tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                {loadingTier === 'PRO_RESEARCHER' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Razorpay...</span>
                  </>
                ) : (
                  <>
                    <span>Upgrade to Pro Researcher</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Security & FAQ Footer */}
      <div className="mt-12 bg-white border border-[#141414]/20 p-6 text-xs text-[#141414]/80">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="font-bold uppercase font-mono text-[#141414] mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Secure Razorpay Checkout
            </h4>
            <p className="text-[11px] text-[#141414]/70">
              Payments are verified via cryptographic SHA256 HMAC signatures. RePa never handles or stores raw card or banking credentials.
            </p>
          </div>
          <div>
            <h4 className="font-bold uppercase font-mono text-[#141414] mb-1 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#141414]" />
              Automated Subscription Lifecycle
            </h4>
            <p className="text-[11px] text-[#141414]/70">
              Paid plans are activated immediately upon verified payment. If cancelled or expired, access gracefully reverts to Free limits without deleting your manuscripts.
            </p>
          </div>
          <div>
            <h4 className="font-bold uppercase font-mono text-[#141414] mb-1 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-[#141414]" />
              Need Institutional Invoicing?
            </h4>
            <p className="text-[11px] text-[#141414]/70">
              University lab groups, departments, and grants requiring GST invoices can configure their institutional billing profiles directly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
