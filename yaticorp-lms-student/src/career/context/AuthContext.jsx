/* eslint-disable react-refresh/only-export-components */
/**
 * @description Who is using Career Path.
 *
 * The standalone FuturePath owned its own session: it signed the student in,
 * kept a `token` in localStorage and fetched /auth/profile. Inside the LMS the
 * student is already signed in before this section is ever reachable, so this
 * provider is an adapter — it takes the LMS session and re-exposes it under the
 * shape every ported page expects (`{ user, loading }`, with `user.name`,
 * `user.email`, `user.xp`, `user.level`).
 *
 * It refetches rather than reusing the cached `studentData` blob because XP and
 * level are written by the server every time a task is completed, and the level
 * ring and rewards page are wrong the moment they go stale. `refresh` is called
 * by CareerShell on every navigation within the section — in the standalone app
 * a full page load did the same job.
 */
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import lmsApi from '../../utils/api';
import { AuthContext as LmsAuthContext } from '../../context/AuthContext';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const { user: lmsUser, loading: lmsLoading, isCreditSystemEnabled } = useContext(LmsAuthContext);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!lmsUser) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await lmsApi.get('/user/profile');
      setUser(data?.user ?? data);
    } catch (error) {
      // A failed refresh must not empty the page. The cached session still has
      // the name and id everything else is keyed on; only XP may be stale.
      console.error('Could not refresh the student for Career Path:', error);
      setUser((current) => current ?? lmsUser);
    } finally {
      setLoading(false);
    }
  }, [lmsUser]);

  useEffect(() => {
    if (!lmsLoading) refresh();
  }, [lmsLoading, refresh]);

  return (
    <AuthContext.Provider
      value={{ user, loading: loading || lmsLoading, refresh, isCreditSystemEnabled }}
    >
      {children}
    </AuthContext.Provider>
  );
};
