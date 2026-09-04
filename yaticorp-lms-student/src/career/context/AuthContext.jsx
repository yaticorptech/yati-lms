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
      return null;
    }
    try {
      const { data } = await lmsApi.get('/user/profile');
      const fresh = data?.user ?? data;
      setUser(fresh);

      // Tell the rest of the app. The sidebar card and the header pills live in
      // StudentLayout, outside this provider, and only refetched on navigation
      // — so finishing a task that crossed a level left the nav chip reading
      // "Level 3" while the sidebar beside it still said "Level 2 · 295 XP".
      // A plain DOM event rather than lifted state: nothing else about these
      // two trees needs to know about each other.
      window.dispatchEvent(new CustomEvent('yati:progress-changed'));
      // Handed back as well as stored. A caller that has just completed
      // something needs the new XP total in the same tick to work out what the
      // server actually awarded, and `setUser` will not have landed by then.
      return fresh;
    } catch (error) {
      // A failed refresh must not empty the page. The cached session still has
      // the name and id everything else is keyed on; only XP may be stale.
      console.error('Could not refresh the student for Career Path:', error);
      setUser((current) => current ?? lmsUser);
      return null;
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
