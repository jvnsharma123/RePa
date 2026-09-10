import React, { useState } from 'react';
import { X, User, Building, GraduationCap, Award, Shield, Check, Loader2 } from 'lucide-react';
import { UserProfile } from '../types';
import { updateProfileInSupabase } from '../services/supabase';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  onProfileUpdated: (updated: UserProfile) => void;
  currentPlan?: string;
  onNavigateToPricing?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onProfileUpdated,
  currentPlan,
  onNavigateToPricing,
}) => {
  const [name, setName] = useState(userProfile?.name || '');
  const [institution, setInstitution] = useState(userProfile?.institution || '');
  const [department, setDepartment] = useState(userProfile?.department || '');
  const [role, setRole] = useState(userProfile?.role || 'Principal Investigator');
  const [orcidId, setOrcidId] = useState(userProfile?.orcidId || '');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    setIsSaving(true);
    const updated: UserProfile = {
      ...userProfile,
      name,
      institution,
      department,
      role,
      orcidId,
    };

    try {
      await updateProfileInSupabase(userProfile.id, updated);
      onProfileUpdated(updated);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 800);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden text-gray-900 font-sans">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-black flex items-center justify-center text-white font-bold text-sm">
              {name ? name.charAt(0) : 'M'}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 leading-tight">Researcher Profile & Academic Credentials</h2>
              <p className="text-xs text-gray-500 mt-0.5">Manage your author attribution details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Full Academic Name & Titles</label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. Evelyn Vance, Ph.D."
                className="w-full bg-white border border-gray-200 rounded-md pl-9 pr-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Institution / University</label>
              <div className="relative">
                <Building className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="MIT / Harvard / Stanford"
                  className="w-full bg-white border border-gray-200 rounded-md pl-9 pr-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-black"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Department / Lab</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Dept of Bioengineering"
                className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-black"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Academic Role</label>
              <div className="relative">
                <GraduationCap className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-md pl-9 pr-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-black"
                >
                  <option value="Principal Investigator">Principal Investigator</option>
                  <option value="Associate Professor">Associate Professor</option>
                  <option value="Postdoctoral Researcher">Postdoctoral Researcher</option>
                  <option value="PhD Candidate">PhD Candidate</option>
                  <option value="Graduate Researcher">Graduate Researcher</option>
                  <option value="Senior Scientist">Senior Scientist</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">ORCID iD</label>
              <div className="relative">
                <Award className="w-4 h-4 text-emerald-600 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={orcidId}
                  onChange={(e) => setOrcidId(e.target.value)}
                  placeholder="0000-0002-1825-0097"
                  className="w-full bg-white border border-gray-200 rounded-md pl-9 pr-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-black font-mono"
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-gray-600" />
              <div>
                <span className="text-gray-600 font-medium">Subscription Tier: </span>
                <span className="text-gray-900 font-semibold">{currentPlan || userProfile?.subscriptionTier || 'Free Plan'}</span>
              </div>
            </div>
            {onNavigateToPricing ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToPricing();
                }}
                className="text-[11px] font-semibold text-black hover:underline cursor-pointer"
              >
                Manage / Upgrade
              </button>
            ) : (
              <span className="text-[11px] text-gray-500">Cloud Auth Connected</span>
            )}
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-md text-xs font-medium transition-colors cursor-pointer shadow-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-black hover:bg-neutral-800 disabled:opacity-50 text-white rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Credentials</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
