import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { UserProfile } from '../types';

// Client-safe environment variables
const env = (import.meta as any).env || {};
const rawUrl = typeof env.VITE_SUPABASE_URL === 'string' ? env.VITE_SUPABASE_URL : '';
const rawKey = typeof env.VITE_SUPABASE_ANON_KEY === 'string' ? env.VITE_SUPABASE_ANON_KEY : '';
const supabaseUrl = rawUrl.trim().replace(/^["']|["']$/g, '');
const supabaseAnonKey = rawKey.trim().replace(/^["']|["']$/g, '');

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project.supabase.co' &&
  !supabaseUrl.includes('placeholder') &&
  supabaseUrl.startsWith('http')
);

// Create the single Supabase client instance
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// Default demo profile for unconfigured/guest mode
export const DEMO_USER_PROFILE: UserProfile = {
  id: 'usr-researcher-demo',
  name: 'Dr. Evelyn Vance',
  email: 'e.vance@mit.edu',
  institution: 'Massachusetts Institute of Technology (MIT)',
  department: 'Department of Biological & Chemical Engineering',
  role: 'Faculty / Professor',
  orcidId: '0000-0002-1825-0097',
  subscriptionTier: 'Researcher Pro',
  projectsCreated: 2,
  monthlyQuotaUsed: 4,
  monthlyQuotaLimit: 50,
};

// ----------------------------------------------------------------------------
// Authentication API
// ----------------------------------------------------------------------------

export async function getCurrentUser(): Promise<{ user: User | null; error: Error | null }> {
  if (!supabase) return { user: null, error: null };
  const { data, error } = await supabase.auth.getUser();
  return { user: data?.user || null, error };
}

export async function signUpWithEmail(
  email: string,
  password: string,
  meta?: { name?: string; institution?: string; department?: string; role?: string }
): Promise<{ user: User | null; session: Session | null; error: Error | null }> {
  if (!supabase) {
    return {
      user: null,
      session: null,
      error: new Error('Supabase environment variables (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) are not set.'),
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: meta?.name || splitEmailForName(email),
        institution: meta?.institution || 'Academic Institution',
        department: meta?.department || 'Department of Research',
        role: meta?.role || 'Faculty / Professor',
      },
    },
  });

  if (error) return { user: null, session: null, error };
  return { user: data.user, session: data.session, error: null };
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ user: User | null; session: Session | null; error: Error | null }> {
  if (!supabase) {
    return {
      user: null,
      session: null,
      error: new Error('Supabase credentials not configured.'),
    };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return { user: null, session: null, error };
  return { user: data.user, session: data.session, error: null };
}

export async function signOutUser(): Promise<{ error: Error | null }> {
  if (!supabase) return { error: null };
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function sendPasswordReset(email: string): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error('Supabase credentials not configured.') };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/#reset-password`,
  });
  return { error };
}

export async function updateUserPassword(newPassword: string): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error('Supabase credentials not configured.') };
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  return { error };
}

export async function signInWithGoogle(): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error('Supabase credentials not configured.') };
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });
  return { error };
}

export async function getActiveSession(): Promise<{ user: User | null; session: Session | null }> {
  if (!supabase) return { user: null, session: null };
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return { user: null, session: null };
  return { user: data.session.user, session: data.session };
}

// ----------------------------------------------------------------------------
// User Profile Helpers
// ----------------------------------------------------------------------------

export async function fetchProfileFromSupabase(userId: string): Promise<UserProfile | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      // If profile doesn't exist yet, return minimal profile from auth
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        return {
          id: userData.user.id,
          name: userData.user.user_metadata?.name || splitEmailForName(userData.user.email || ''),
          email: userData.user.email || '',
          institution: userData.user.user_metadata?.institution || 'Academic Institution',
          department: userData.user.user_metadata?.department || 'Department of Research',
          role: userData.user.user_metadata?.role || 'Principal Investigator',
          orcidId: '',
          subscriptionTier: 'Academic Free',
          projectsCreated: 0,
          monthlyQuotaUsed: 0,
          monthlyQuotaLimit: 50,
        };
      }
      return null;
    }

    return {
      id: data.id,
      name: data.name || splitEmailForName(data.email),
      email: data.email,
      institution: data.institution || 'Academic Institution',
      department: data.department || '',
      role: data.role || 'Researcher',
      orcidId: data.orcid_id || '',
      subscriptionTier: data.subscription_tier || 'Academic Free',
      projectsCreated: 0,
      monthlyQuotaUsed: 0,
      monthlyQuotaLimit: 50,
    };
  } catch (err) {
    console.error('Error fetching profile:', err);
    return null;
  }
}

export async function updateProfileInSupabase(
  userId: string,
  profile: Partial<UserProfile>
): Promise<{ success: boolean; error: Error | null }> {
  if (!supabase) return { success: false, error: new Error('Supabase not configured') };

  const payload: any = {
    updated_at: new Date().toISOString(),
  };

  if (profile.name !== undefined) payload.name = profile.name;
  if (profile.institution !== undefined) payload.institution = profile.institution;
  if (profile.department !== undefined) payload.department = profile.department;
  if (profile.role !== undefined) payload.role = profile.role;
  if (profile.orcidId !== undefined) payload.orcid_id = profile.orcidId;
  if (profile.subscriptionTier !== undefined) payload.subscription_tier = profile.subscriptionTier;

  const { error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId);

  return { success: !error, error };
}

// ----------------------------------------------------------------------------
// Supabase Private Storage Helpers (Bucket: 'research-files')
// ----------------------------------------------------------------------------

export async function uploadFileToSupabaseStorage(
  userId: string,
  projectId: string,
  file: File | Blob,
  fileName: string
): Promise<{ storagePath: string | null; error: Error | null }> {
  if (!supabase) {
    return { storagePath: null, error: new Error('Supabase storage not configured') };
  }

  const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${userId}/${projectId}/${Date.now()}_${cleanFileName}`;

  const { error } = await supabase.storage
    .from('research-files')
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    console.error('Supabase storage upload error:', error);
    return { storagePath: null, error };
  }

  return { storagePath, error: null };
}

export async function getSecureSignedFileUrl(
  storagePath: string,
  expiresInSeconds = 3600
): Promise<{ signedUrl: string | null; error: Error | null }> {
  if (!supabase) {
    return { signedUrl: null, error: new Error('Supabase storage not configured') };
  }

  const { data, error } = await supabase.storage
    .from('research-files')
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    return { signedUrl: null, error };
  }

  return { signedUrl: data.signedUrl, error: null };
}

export async function deleteFileFromSupabaseStorage(
  storagePath: string
): Promise<{ error: Error | null }> {
  if (!supabase) return { error: null };

  const { error } = await supabase.storage
    .from('research-files')
    .remove([storagePath]);

  return { error };
}

export async function uploadResearchFileToSupabase(
  file: File,
  userId?: string,
  projectId?: string
): Promise<{ storagePath?: string; publicUrl?: string; error: Error | null }> {
  if (!supabase) return { error: new Error('Supabase not configured') };
  const uid = userId || 'default_user';
  const pid = projectId || 'default_project';
  const { storagePath, error } = await uploadFileToSupabaseStorage(uid, pid, file, file.name);
  if (error || !storagePath) return { error };
  const { signedUrl } = await getSecureSignedFileUrl(storagePath, 86400);
  return { storagePath, publicUrl: signedUrl || undefined, error: null };
}

function splitEmailForName(email: string): string {
  if (!email) return 'Researcher';
  const prefix = email.split('@')[0];
  return prefix
    .split('.')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
