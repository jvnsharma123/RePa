import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  LogOut,
  FolderKanban,
  Settings,
  Sparkles,
  ChevronDown,
  ShieldCheck,
  Building,
  Key,
  LogIn,
  CreditCard,
  ArrowUpRight,
} from 'lucide-react';
import { UserProfile } from '../types';
import { signOutUser } from '../services/supabase';
import { PlanTier, PLAN_CONFIGS } from '../types/subscription';

interface AccountMenuProps {
  userProfile: UserProfile | null;
  isAuthenticated: boolean;
  currentPlan?: PlanTier;
  onOpenAuthModal: () => void;
  onOpenProfileModal: () => void;
  onNavigate: (view: string) => void;
  onSignOutComplete: () => void;
}

export const AccountMenu: React.FC<AccountMenuProps> = ({
  userProfile,
  isAuthenticated,
  currentPlan = 'FREE',
  onOpenAuthModal,
  onOpenProfileModal,
  onNavigate,
  onSignOutComplete,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setIsOpen(false);
    await signOutUser();
    onSignOutComplete();
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenAuthModal}
          className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
        >
          <LogIn className="w-3.5 h-3.5 text-gray-500" />
          <span>Sign In</span>
        </button>
        <button
          onClick={onOpenAuthModal}
          className="px-3 py-1.5 bg-black hover:bg-neutral-800 text-white rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
        >
          <span>Create Account</span>
        </button>
      </div>
    );
  }

  const initials = userProfile?.name
    ? userProfile.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 transition-all text-xs font-medium cursor-pointer shadow-xs"
      >
        <div className="w-6 h-6 rounded bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700 font-bold text-xs">
          {initials}
        </div>
        <div className="text-left hidden sm:block max-w-[120px] truncate">
          <p className="font-medium text-gray-900 truncate leading-tight">{userProfile?.name || 'Researcher'}</p>
          <p className="text-[10px] text-gray-500 truncate">{userProfile?.institution || 'Academic'}</p>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white border border-gray-200 shadow-lg p-1.5 z-50 text-gray-800 animate-fadeIn text-xs">
          {/* User info card */}
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 mb-1.5">
            <p className="font-semibold text-gray-900">{userProfile?.name || 'Researcher'}</p>
            <p className="text-[11px] text-gray-500 truncate">{userProfile?.email}</p>
            <div className="mt-2 pt-2 border-t border-gray-200 flex items-center justify-between text-[10px]">
              <span className="text-gray-500">{userProfile?.role || 'Principal Investigator'}</span>
              <span className={`px-1.5 py-0.5 rounded font-bold font-mono ${
                currentPlan === 'PRO_RESEARCHER'
                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                  : currentPlan === 'RESEARCHER'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-gray-200/80 text-gray-800'
              }`}>
                {PLAN_CONFIGS[currentPlan]?.name || 'Free'} Plan
              </span>
            </div>
          </div>

          {/* Menu items */}
          <button
            onClick={() => {
              setIsOpen(false);
              onNavigate('pricing');
            }}
            className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 flex items-center justify-between transition-colors cursor-pointer text-gray-800 hover:text-black font-semibold bg-gray-50/50 mb-1 border border-gray-200/60"
          >
            <div className="flex items-center gap-2.5">
              <CreditCard className="w-4 h-4 text-amber-600" />
              <span>{currentPlan === 'FREE' ? 'Upgrade to Paid Plan' : 'Subscription & Pricing'}</span>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-gray-400" />
          </button>

          <button
            onClick={() => {
              setIsOpen(false);
              onOpenProfileModal();
            }}
            className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 flex items-center gap-2.5 transition-colors cursor-pointer text-gray-700 hover:text-black font-medium"
          >
            <User className="w-4 h-4 text-gray-400" />
            <span>Profile & Credentials</span>
          </button>

          <button
            onClick={() => {
              setIsOpen(false);
              onNavigate('dashboard');
            }}
            className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 flex items-center gap-2.5 transition-colors cursor-pointer text-gray-700 hover:text-black font-medium"
          >
            <FolderKanban className="w-4 h-4 text-gray-400" />
            <span>My Research Projects</span>
          </button>

          <button
            onClick={() => {
              setIsOpen(false);
              onNavigate('settings');
            }}
            className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 flex items-center gap-2.5 transition-colors cursor-pointer text-gray-700 hover:text-black font-medium"
          >
            <Sparkles className="w-4 h-4 text-gray-400" />
            <span>Usage & AI Quotas</span>
          </button>

          <button
            onClick={() => {
              setIsOpen(false);
              onNavigate('settings');
            }}
            className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 flex items-center gap-2.5 transition-colors cursor-pointer text-gray-700 hover:text-black font-medium"
          >
            <Settings className="w-4 h-4 text-gray-400" />
            <span>Studio Settings</span>
          </button>

          <div className="my-1 border-t border-gray-100" />

          <button
            onClick={handleSignOut}
            className="w-full text-left px-3 py-2 rounded-md hover:bg-rose-50 text-rose-600 hover:text-rose-700 flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
          >
            <LogOut className="w-4 h-4 text-rose-500" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
};
