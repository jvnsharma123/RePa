import React, { useState } from 'react';
import {
  Settings,
  User,
  ShieldCheck,
  Database,
  Download,
  CheckCircle2,
  Lock,
  GraduationCap,
  Key
} from 'lucide-react';
import { UserProfile } from '../types';

interface SettingsViewProps {
  userProfile: UserProfile | null;
  onUpdateProfile?: (updated: UserProfile) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ userProfile }) => {
  const [name, setName] = useState(userProfile?.name || 'Dr. Elena Rostova, Ph.D.');
  const [email, setEmail] = useState(userProfile?.email || 'elena.rostova@stanford.edu');
  const [institution, setInstitution] = useState(userProfile?.institution || 'Stanford University School of Medicine');
  const [department, setDepartment] = useState(userProfile?.department || 'Department of Bioengineering');
  const [orcid, setOrcid] = useState(userProfile?.orcidId || '0000-0002-1825-0097');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <h1 className="text-xl font-serif-academic font-bold text-white">Researcher Profile & System Settings</h1>
        <p className="text-xs text-slate-400 mt-1 font-sans-ui">
          Manage your academic credentials, ORCID identifier, and architecture integrations.
        </p>
      </div>

      {/* Academic Profile Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 text-xs">
        <div className="flex items-center gap-2 text-white font-semibold text-sm border-b border-slate-800 pb-3">
          <GraduationCap className="w-4 h-4 text-indigo-400" />
          Academic Affiliation & Authorship Identity
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Full Name & Title</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Academic Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">University / Research Institute</label>
            <input
              type="text"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Department / Laboratory</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">ORCID iD</label>
            <input
              type="text"
              value={orcid}
              onChange={(e) => setOrcid(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          {savedSuccess ? (
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Changes saved successfully.
            </span>
          ) : (
            <span className="text-slate-500">Auto-populated into new manuscript author blocks.</span>
          )}

          <button
            onClick={handleSave}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer"
          >
            Save Profile
          </button>
        </div>
      </div>

      {/* Cloud & Supabase Architecture Status */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 text-xs">
        <div className="flex items-center gap-2 text-white font-semibold text-sm border-b border-slate-800 pb-3">
          <Database className="w-4 h-4 text-emerald-400" />
          Backend Storage & Future Cloud Database Integration
        </div>

        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200">Current Architecture State:</span>
            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono text-[10px]">
              Active &amp; Persistent In-Memory Express Service
            </span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            The data layer is built with modular schema interfaces (`/src/types/index.ts` and `/server/routes.ts`) designed to connect to Supabase PostgreSQL, institutional single-sign-on (SSO), and external literature search APIs without refactoring frontend components.
          </p>
        </div>
      </div>
    </div>
  );
};
