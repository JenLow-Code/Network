import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authenticateEmail, registerEmail, revokeRefreshToken, type AuthReply } from '@/lib/authApi';
import { loadSession, saveSession, setAccessToken, type StoredUser } from '@/lib/api/session';
import { api, onSessionChange, refreshAccessToken } from '@/lib/api/client';

/**
 * Authentication against the JenLow beta auth Worker (the single token issuer the API
 * trusts). The context shape is unchanged for existing screens. Google/Apple sign-in and
 * password recovery stay disabled until a provider is configured and verified end to end.
 */
type Social = 'google' | 'apple';
export type AppUser = {
  id: string;
  email: string;
  handle?: string;
  user_metadata: { display_name?: string; avatar_url?: string };
};
type AuthContext = {
  user: AppUser | null;
  session: { userId: string } | null;
  initialized: boolean;
  configured: boolean;
  /** False until an OAuth provider is configured and verified with the API. */
  socialConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    name: string,
    email: string,
    password: string,
    inviteCode: string,
  ) => Promise<'confirmed' | 'email_confirmation_required'>;
  signInWithSocial: (provider: Social) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};
const Context = createContext<AuthContext | null>(null);

const toUser = (u: StoredUser): AppUser => ({ id: u.id, email: u.email, handle: u.handle, user_metadata: { display_name: u.displayName } });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Restore the session after a reload: rotate the stored refresh token, then confirm identity.
  useEffect(() => {
    let alive = true;
    void (async () => {
      const stored = await loadSession();
      if (stored && (await refreshAccessToken())) {
        try {
          const me = await api<{ user: { id: string; handle: string; displayName: string; email: string } }>('/api/me', { auth: 'required' });
          const fresh: StoredUser = { id: me.user.id, email: me.user.email, displayName: me.user.displayName, handle: me.user.handle };
          const latest = await loadSession();
          if (latest) await saveSession({ ...latest, user: fresh });
          if (alive) setUser(toUser(fresh));
        } catch {
          if (alive) setUser(toUser(stored.user));
        }
      }
      if (alive) setInitialized(true);
    })();
    const off = onSessionChange(signedIn => {
      if (!signedIn && alive) setUser(null);
    });
    return () => {
      alive = false;
      off();
    };
  }, []);

  const accept = async (reply: AuthReply) => {
    setAccessToken(reply.session.accessToken, reply.session.expiresIn);
    const stored: StoredUser = { id: reply.user.id, email: reply.user.email, displayName: reply.user.displayName, handle: reply.user.handle };
    await saveSession({ refreshToken: reply.session.refreshToken, user: stored });
    setUser(toUser(stored));
  };

  const actions = useMemo<AuthContext>(
    () => ({
      user,
      session: user ? { userId: user.id } : null,
      initialized,
      configured: true,
      socialConfigured: false,
      async signIn(email, password) {
        await accept(await authenticateEmail(email.trim().toLowerCase(), password));
      },
      async signUp(name, email, password, inviteCode) {
        await accept(await registerEmail(name.trim(), email.trim().toLowerCase(), password, inviteCode.trim()));
        return 'confirmed';
      },
      async signInWithSocial() {
        throw new Error('oauth_not_configured');
      },
      async resetPassword() {
        throw new Error('password_reset_unavailable');
      },
      async signOut() {
        const stored = await loadSession();
        if (stored) await revokeRefreshToken(stored.refreshToken);
        await saveSession(null);
        setAccessToken(null);
        setUser(null);
      },
    }),
    [user, initialized],
  );
  return <Context.Provider value={actions}>{children}</Context.Provider>;
}

export function useAuth() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('AuthProvider missing');
  return ctx;
}
