import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { isThemePreference, useTheme } from './ThemeContext';
import { normalizeAccountState, normalizeAuthStatus, type AccountState, type AuthStatus } from '../../shared/contracts/account.js';
import type { AuthContextValue, AuthMutationResponse, ChildrenProp } from './types';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: ChildrenProp) {
  const { setThemePreference } = useTheme();
  const [loading, setLoading] = useState(true);
  const [accountState, setAccountState] = useState(() => normalizeAccountState());

  async function refreshAccountState(auth: AuthStatus | AccountState = accountState): Promise<AccountState> {
    try {
      const account = await api.getAccount();
      const savedTheme = await api.getPreference('theme').catch(() => null);
      if (isThemePreference(savedTheme?.value)) {
        setThemePreference(savedTheme.value);
      }
      const nextState = normalizeAccountState({ auth, account });
      setAccountState(nextState);
      return nextState;
    } catch (error) {
      const nextState = normalizeAccountState({ auth, accountUnavailable: true });
      setAccountState(nextState);
      throw error;
    }
  }

  async function refresh(): Promise<void> {
    setLoading(true);
    try {
      const status = await api.getAuthStatus();

      if (status.loggedIn) {
        await refreshAccountState(status).catch(() => null);
      } else {
        setThemePreference('system');
        setAccountState(normalizeAccountState({ auth: status }));
      }
    } catch {
      setAccountState(normalizeAccountState());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    loading,
    accountState,
    capabilities: accountState.capabilities,
    needsBootstrap: accountState.needsBootstrap,
    user: accountState.user,
    loggedIn: accountState.loggedIn,
    isAdmin: accountState.isAdmin,
    discogsConfigured: accountState.discogs.tokenConfigured === true,
    accountUnavailable: accountState.accountUnavailable,
    currency: accountState.preferences.currency,
    async login(username: string, password: string): Promise<AuthMutationResponse> {
      const result = await api.login({ username, password });
      const auth = normalizeAuthStatus({ needsBootstrap: false, loggedIn: true, user: result.user });
      setAccountState(normalizeAccountState({ auth }));
      setLoading(false);
      await refreshAccountState(auth).catch(() => null);
      return result;
    },
    async bootstrap(username: string, password: string): Promise<AuthMutationResponse> {
      const result = await api.bootstrap({ username, password });
      const auth = normalizeAuthStatus({ needsBootstrap: false, loggedIn: true, user: result.user });
      setAccountState(normalizeAccountState({ auth, account: { tokenConfigured: false } }));
      setLoading(false);
      return result;
    },
    async logout() {
      await api.logout();
      setThemePreference('system');
      await refresh();
    },
    async refreshAccount() {
      return refreshAccountState();
    },
    async setCurrencyPreference(nextCurrency) {
      await api.setPreference('currency', nextCurrency);
      const nextState = normalizeAccountState({
        auth: accountState,
        account: {
          discogsUsername: accountState.discogs.username || '',
          tokenConfigured: accountState.discogs.tokenConfigured === true,
          tokenPreview: accountState.discogs.tokenPreview,
          currency: nextCurrency
        }
      });
      setAccountState(nextState);
      return nextState.preferences.currency;
    },
    refresh
  }), [loading, accountState, setThemePreference]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
