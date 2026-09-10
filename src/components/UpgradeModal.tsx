import React, { useState } from 'react';
import { X, Sparkles, Check, ArrowRight, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { PlanTier, PLAN_CONFIGS } from '../types/subscription';
import { executeRazorpaySubscriptionCheckout } from '../services/subscriptionService';
import { UserProfile } from '../types';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reasonTitle?: string;
  reasonDescription?: string;
  targetPlan?: PlanTier;
  currentPlan: PlanTier;
  userProfile: UserProfile | null;
  userId?: string | null;
  onPlanUpgraded: (newPlan: PlanTier) => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  reasonTitle = 'Plan Limit Reached',
  reasonDescription = 'Upgrade your subscription to unlock higher quotas, unlimited references, and full export capabilities.',
  targetPlan = 'RESEARCHER',
  currentPlan,
  userProfile,
  userId,
  onPlanUpgraded,
}) => {
  const [loadingTier, setLoadingTier] = useState<PlanTier | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpgrade = async (tier: 'RESEARCHER' | 'PRO_RESEARCHER') => {
    setErrorMsg(null);
    setLoadingTier(tier);
    const activeUserId = userId || userProfile?.id || 'usr_guest';

    await executeRazorpaySubscriptionCheckout({
      planTier: tier,
      user: {
        id: activeUserId,
        email: userProfile?.email,
        name: userProfile?.name,
      },
      onSuccess: (activated) => {
        setLoadingTier(null);
        onPlanUpgraded(activated);
        onClose();
      },
      onError: (err) => {
        setLoadingTier(null);
        setErrorMsg(err || 'Checkout was cancelled or payment failed.');
      },
      onCancel: () => {
        setLoadingTier(null);
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn font-sans">
      <div className="relative w-full max-w-2xl bg-white border border-[#141414] shadow-[8px_8px_0px_rgba(20,20,20,0.25)] p-6 sm:p-8 text-[#141414]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-[#141414]/60 hover:text-[#141414] border border-transparent hover:border-[#141414] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Reason Header */}
        <div className="flex items-start gap-3 mb-6">
          <div className="w-9 h-9 bg-[#141414] text-white flex items-center justify-center shrink-0 border border-[#141414]">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#141414] tracking-tight">{reasonTitle}</h3>
            <p className="text-xs text-[#141414]/70 mt-1">{reasonDescription}</p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-300 text-rose-800 text-xs rounded-md flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Plan Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
          {/* RESEARCHER */}
          <div
            className={`border ${
              targetPlan === 'RESEARCHER' ? 'border-[#141414] bg-[#F0EFED]/40 ring-1 ring-[#141414]' : 'border-[#141414]/30 bg-white'
            } p-5 flex flex-col justify-between`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold text-[#141414]/70">SCHOLAR</span>
                <span className="text-[10px] font-mono bg-white border border-[#141414]/20 px-1.5 py-0.5">MOST POPULAR</span>
              </div>
              <h4 className="text-base font-bold text-[#141414] mt-1">Researcher</h4>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-[#141414]">₹299</span>
                <span className="text-xs text-[#141414]/60 font-mono">/ month</span>
              </div>

              <div className="my-3 border-t border-[#141414]/10" />

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>5 active projects</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>100 AI analyses / month</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>Unlimited references</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>Unlimited DOCX/PDF exports</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>All citation styles &amp; formats</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleUpgrade('RESEARCHER')}
              disabled={loadingTier !== null}
              className="mt-5 w-full py-2 bg-[#141414] hover:bg-[#333333] text-white text-xs font-mono uppercase font-bold tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-[#141414]"
            >
              {loadingTier === 'RESEARCHER' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Connecting Razorpay...</span>
                </>
              ) : (
                <>
                  <span>Upgrade (₹299/mo)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          {/* PRO RESEARCHER */}
          <div
            className={`border ${
              targetPlan === 'PRO_RESEARCHER' ? 'border-[#141414] bg-[#F0EFED]/40 ring-1 ring-[#141414]' : 'border-[#141414]/30 bg-white'
            } p-5 flex flex-col justify-between`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold text-[#141414]/70">POWER USER</span>
                <span className="text-[10px] font-mono bg-white border border-[#141414]/20 px-1.5 py-0.5">UNLIMITED</span>
              </div>
              <h4 className="text-base font-bold text-[#141414] mt-1">Pro Researcher</h4>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-[#141414]">₹699</span>
                <span className="text-xs text-[#141414]/60 font-mono">/ month</span>
              </div>

              <div className="my-3 border-t border-[#141414]/10" />

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#141414] shrink-0" />
                  <span>Unlimited projects</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#141414] shrink-0" />
                  <span>300 AI analyses / month</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#141414] shrink-0" />
                  <span>Unlimited references &amp; exports</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#141414] shrink-0" />
                  <span>Advanced AI analysis</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#141414] shrink-0" />
                  <span>Priority processing</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleUpgrade('PRO_RESEARCHER')}
              disabled={loadingTier !== null}
              className="mt-5 w-full py-2 bg-white hover:bg-gray-100 text-[#141414] text-xs font-mono uppercase font-bold tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-[#141414]"
            >
              {loadingTier === 'PRO_RESEARCHER' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Connecting Razorpay...</span>
                </>
              ) : (
                <>
                  <span>Upgrade (₹699/mo)</span>
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footnote */}
        <div className="flex items-center justify-between text-[11px] text-[#141414]/60 pt-3 border-t border-[#141414]/10">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Secure Razorpay checkout with instant activation</span>
          </span>
          <button
            onClick={onClose}
            className="text-[#141414] hover:underline font-medium cursor-pointer"
          >
            Continue with Free Limits
          </button>
        </div>
      </div>
    </div>
  );
};
