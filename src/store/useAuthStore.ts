'use client';

import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import { getSafeRedirect } from '@/lib/auth/redirect';
import { createClient } from '@/lib/supabase/client';
import { mapAuthError } from '@/lib/supabase/auth-errors';
import type { Profile, UserPlan } from '@/lib/supabase/database.types';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  plan: UserPlan;
  createdAt: string;
}

type AuthResult =
  | { ok: true; needsEmailConfirmation?: boolean }
  | { ok: false; error: string };

interface AuthStore {
  user: AuthUser | null;
  sessionUser: User | null;
  profile: Profile | null;
  initialized: boolean;
  initialize: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  signup: (name: string, email: string, password: string, plan?: UserPlan) => Promise<AuthResult>;
  login: (email: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  updateProfile: (patch: { fullName?: string }) => Promise<{ ok: true } | { ok: false; error: string }>;
}

function profileToAuthUser(profile: Profile, email: string): AuthUser {
  return {
    id: profile.id,
    name: profile.full_name || email.split('@')[0],
    email,
    plan: profile.plan,
    createdAt: profile.created_at,
  };
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  sessionUser: null,
  profile: null,
  initialized: false,

  initialize: async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        set({ user: null, sessionUser: null, profile: null, initialized: true });
        return;
      }

      try {
        let profile = await fetchProfile(user.id);
        if (!profile) {
          const { data } = await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              full_name: (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || '',
            })
            .select('*')
            .single();
          profile = data;
        }

        set({
          sessionUser: user,
          profile,
          user: profile ? profileToAuthUser(profile, user.email ?? '') : null,
          initialized: true,
        });
      } catch {
        set({
          sessionUser: user,
          profile: null,
          user: {
            id: user.id,
            name: (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'User',
            email: user.email ?? '',
            plan: 'free',
            createdAt: user.created_at,
          },
          initialized: true,
        });
      }
    } catch {
      set({ user: null, sessionUser: null, profile: null, initialized: true });
    }
  },

  refreshProfile: async () => {
    const sessionUser = get().sessionUser;
    if (!sessionUser) return;
    const profile = await fetchProfile(sessionUser.id);
    if (profile) {
      set({
        profile,
        user: profileToAuthUser(profile, sessionUser.email ?? ''),
      });
    }
  },

  signup: async (name, email, password, plan) => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (!trimmedName || !trimmedEmail || !password) {
      return { ok: false, error: 'All fields are required.' };
    }
    if (password.length < 6) {
      return { ok: false, error: 'Password must be at least 6 characters.' };
    }

    const signupPlan = plan === 'pro' || plan === 'team' ? plan : undefined;
    const redirectPath = getSafeRedirect(
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('redirect')
        : null,
    );
    const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectPath)}`;

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          full_name: trimmedName,
          ...(signupPlan ? { requested_plan: signupPlan } : {}),
        },
        emailRedirectTo: callbackUrl,
      },
    });

    if (error) return { ok: false, error: mapAuthError(error.message) };

    if (data.session && data.user) {
      let profile = await fetchProfile(data.user.id);

      if (signupPlan === 'pro' && profile) {
        const { data: updated } = await supabase
          .from('profiles')
          .update({ plan: 'pro' })
          .eq('id', data.user.id)
          .select('*')
          .single();
        if (updated) profile = updated;
      }

      set({
        sessionUser: data.user,
        profile,
        user: profile
          ? profileToAuthUser(profile, data.user.email ?? trimmedEmail)
          : {
              id: data.user.id,
              name: trimmedName,
              email: trimmedEmail,
              plan: signupPlan === 'pro' ? 'pro' : 'free',
              createdAt: data.user.created_at,
            },
      });
      return { ok: true };
    }

    return { ok: true, needsEmailConfirmation: true };
  },

  login: async (email, password) => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      return { ok: false, error: 'Email and password are required.' };
    }

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (error) return { ok: false, error: mapAuthError(error.message) };
    if (!data.user) return { ok: false, error: 'Login failed.' };

    const profile = await fetchProfile(data.user.id);
    set({
      sessionUser: data.user,
      profile,
      user: profile
        ? profileToAuthUser(profile, data.user.email ?? trimmedEmail)
        : {
            id: data.user.id,
            name: (data.user.user_metadata?.full_name as string) || trimmedEmail.split('@')[0],
            email: data.user.email ?? trimmedEmail,
            plan: 'free',
            createdAt: data.user.created_at,
          },
    });

    return { ok: true };
  },

  logout: async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    set({ user: null, sessionUser: null, profile: null });
  },

  updateProfile: async ({ fullName }) => {
    const sessionUser = get().sessionUser;
    if (!sessionUser) return { ok: false, error: 'Not signed in.' };

    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles')
      .update({ full_name: fullName?.trim() ?? '' })
      .eq('id', sessionUser.id)
      .select('*')
      .single();

    if (error) return { ok: false, error: error.message };

    set({
      profile: data,
      user: profileToAuthUser(data, sessionUser.email ?? ''),
    });

    return { ok: true };
  },
}));
