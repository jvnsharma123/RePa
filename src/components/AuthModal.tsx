import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  Building,
  GraduationCap,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Loader2,
  ShieldCheck,
  KeyRound
} from 'lucide-react';
import {
  signInWithEmail,
  signUpWithEmail,
  sendPasswordReset,
  updateUserPassword,
  signInWithGoogle,
  isSupabaseConfigured
} from '../services/supabase';

export type AuthModalTab = 'signin' | 'signup' | 'forgot' | 'reset';

interface AuthModalProps {
  isOpen: boolean;
  initialTab?: AuthModalTab;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialTab = 'signin',
  onClose,
  onSuccess,
}) => {
  const [tab, setTab] = useState<AuthModalTab>(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState('Principal Investigator');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Password validation
  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const passwordScore = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      if (!isSupabaseConfigured) {
        // When Supabase is not yet connected via credentials, inform user gracefully
        setErrorMsg(
          'Supabase backend credentials (VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY) are required. Please configure your Supabase variables.'
        );
        setIsLoading(false);
        return;
      }

      if (tab === 'signin') {
        if (!email.trim() || !password) {
          throw new Error('Please enter both email and password.');
        }
        const { error } = await signInWithEmail(email.trim(), password);
        if (error) throw error;

        setSuccessMsg('Successfully signed in. Loading your research projects...');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 600);
      } else if (tab === 'signup') {
        if (!email.trim() || !password) {
          throw new Error('Please provide an email and password.');
        }
        if (password.length < 8) {
          throw new Error('Password must be at least 8 characters long.');
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }

        const { user, error } = await signUpWithEmail(email.trim(), password, {
          name: name.trim() || undefined,
          institution: institution.trim() || undefined,
          department: department.trim() || undefined,
          role,
        });

        if (error) throw error;

        if (user && !user.confirmed_at && user.identities?.length) {
          setSuccessMsg(
            'Account created! If email confirmation is enabled on your Supabase instance, please check your inbox.'
          );
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 1200);
        } else {
          setSuccessMsg('Account created and signed in successfully!');
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 600);
        }
      } else if (tab === 'forgot') {
        if (!email.trim()) {
          throw new Error('Please provide your registered email address.');
        }
        const { error } = await sendPasswordReset(email.trim());
        if (error) throw error;
        setSuccessMsg('Password reset instructions have been sent to your email.');
      } else if (tab === 'reset') {
        if (!password || password.length < 8) {
          throw new Error('New password must be at least 8 characters.');
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }
        const { error } = await updateUserPassword(password);
        if (error) throw error;
        setSuccessMsg('Your password has been successfully updated! You may now sign in.');
        setTimeout(() => {
          setTab('signin');
          setSuccessMsg(null);
        }, 1500);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      // Clean, user-friendly error formatting
      let cleanMsg = err.message || 'An unexpected authentication error occurred.';
      if (cleanMsg.includes('Invalid login credentials')) {
        cleanMsg = 'Invalid email or password. Please verify your credentials.';
      } else if (cleanMsg.includes('User already registered')) {
        cleanMsg = 'An account with this email already exists. Try signing in instead.';
      }
      setErrorMsg(cleanMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const { error } = await signInWithGoogle();
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || 'Google authentication failed.');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-md bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden text-gray-900 font-sans">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-black flex items-center justify-center text-white font-bold text-sm">
              M
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 leading-tight">
                {tab === 'signin' && 'Researcher Sign In'}
                {tab === 'signup' && 'Create Academic Account'}
                {tab === 'forgot' && 'Reset Password'}
                {tab === 'reset' && 'Set New Password'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {tab === 'signin' && 'Access your persistent research manuscripts & datasets'}
                {tab === 'signup' && 'Sync research projects to your private cloud repository'}
                {tab === 'forgot' && 'Enter your email to receive recovery instructions'}
                {tab === 'reset' && 'Create a secure new password for your account'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        {(tab === 'signin' || tab === 'signup') && (
          <div className="grid grid-cols-2 p-1 bg-gray-50 border-b border-gray-200 text-xs font-medium">
            <button
              onClick={() => {
                setTab('signin');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-1.5 rounded transition-all cursor-pointer ${
                tab === 'signin'
                  ? 'bg-white text-black shadow-xs font-semibold'
                  : 'text-gray-500 hover:text-black'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setTab('signup');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-1.5 rounded transition-all cursor-pointer ${
                tab === 'signup'
                  ? 'bg-white text-black shadow-xs font-semibold'
                  : 'text-gray-500 hover:text-black'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Status Alerts */}
        <div className="px-6 pt-4">
          {errorMsg && (
            <div className="p-3 mb-3 rounded-md bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 mb-3 rounded-md bg-green-50 border border-green-200 flex items-start gap-2.5 text-xs text-green-800">
              <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-1 space-y-3">
          {tab === 'signup' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Full Name & Title</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dr. Alex Morgan"
                    className="w-full bg-white border border-gray-200 rounded-md pl-9 pr-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Institution / Univ</label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      placeholder="e.g. Stanford Univ"
                      className="w-full bg-white border border-gray-200 rounded-md pl-9 pr-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-black"
                    />
                  </div>
                </div>
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
                      <option value="Postdoctoral Fellow">Postdoctoral Fellow</option>
                      <option value="PhD Scholar">PhD Scholar</option>
                      <option value="Graduate Researcher">Graduate Researcher</option>
                      <option value="Undergraduate">Undergraduate</option>
                      <option value="Industry R&D">Industry R&D</option>
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}

          {(tab === 'signin' || tab === 'signup' || tab === 'forgot') && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Academic / Work Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="scholar@university.edu"
                  className="w-full bg-white border border-gray-200 rounded-md pl-9 pr-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>
            </div>
          )}

          {(tab === 'signin' || tab === 'signup' || tab === 'reset') && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-gray-700">
                  {tab === 'reset' ? 'New Password' : 'Password'}
                </label>
                {tab === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setTab('forgot');
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-xs text-gray-600 hover:text-black hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-white border border-gray-200 rounded-md pl-9 pr-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>

              {/* Password strength meter for signup/reset */}
              {(tab === 'signup' || tab === 'reset') && password && (
                <div className="mt-1.5 space-y-1">
                  <div className="flex gap-1 h-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`flex-1 rounded-full transition-colors ${
                          passwordScore >= level
                            ? passwordScore <= 2
                              ? 'bg-amber-400'
                              : 'bg-green-500'
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-500">
                    {passwordScore <= 2 ? 'Weak password (mix letters, numbers, symbols)' : 'Strong secure password'}
                  </span>
                </div>
              )}
            </div>
          )}

          {(tab === 'signup' || tab === 'reset') && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Confirm Password</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-white border border-gray-200 rounded-md pl-9 pr-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2 px-4 bg-black hover:bg-neutral-800 disabled:bg-neutral-400 text-white rounded-md text-xs font-medium flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>
                  {tab === 'signin' && 'Sign In to Studio'}
                  {tab === 'signup' && 'Create Cloud Account'}
                  {tab === 'forgot' && 'Send Reset Instructions'}
                  {tab === 'reset' && 'Update Password'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>

          {/* Social Auth (Google) */}
          {(tab === 'signin' || tab === 'signup') && (
            <>
              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-white px-2 text-gray-400 font-medium">Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={isLoading}
                className="w-full py-2 px-4 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-md text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>
            </>
          )}

          {/* Switch tabs footer */}
          {tab === 'forgot' && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setTab('signin');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-xs text-gray-500 hover:text-black cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          )}

          <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5 text-gray-400" />
            <span>Encrypted & private academic data repository</span>
          </div>
        </form>
      </div>
    </div>
  );
};
