/**
 * @description levelProgress() with the admin's level ladder filled in.
 *
 * The ladder is an admin rule, so it comes from the server: from the rewards
 * summary when Rewards is on (already loaded app-wide, nothing extra to ask
 * for), otherwise from /career/profile/levels, which answers either way —
 * students keep earning XP and levels while Rewards is locked.
 *
 * Usable outside Career Path (the sidebar card, the LMS profile): it needs
 * only the RewardsProvider, which wraps the whole student app.
 */
import { useEffect, useState } from 'react';
import { useRewards } from '../../context/useRewards';
import lmsApi from '../../utils/api';
import { knownLevelThresholds, levelProgress, rememberLevelThresholds } from '../utils/progress';

/*
 * One request per session, shared by every caller. Through the LMS client,
 * not the Career Path one: the sidebar asks for this on every page, and a 403
 * from a locked Career Path must not send a student on the home page to the
 * home page again (see the CAREER_PATH_LOCKED handler in ../services/api.js).
 * A failure is forgotten so the next mount can try again.
 */
let request = null;
const loadLadder = () => {
  if (!request) {
    request = lmsApi
      .get('/career/profile/levels')
      .then(({ data }) => data?.thresholds || null)
      .catch(() => {
        request = null;
        return null;
      });
  }
  return request;
};

export default function useLevelProgress(xp, level) {
  const { summary } = useRewards();
  const ladder = summary?.config?.levelThresholds;
  const fromRewards = Array.isArray(ladder) && ladder.length >= 2 ? ladder : null;
  const [fetched, setFetched] = useState(knownLevelThresholds);

  useEffect(() => {
    if (fromRewards) {
      rememberLevelThresholds(fromRewards);
      return undefined;
    }
    let alive = true;
    loadLadder().then((loaded) => {
      if (!alive || !loaded) return;
      rememberLevelThresholds(loaded);
      setFetched(loaded);
    });
    return () => {
      alive = false;
    };
  }, [fromRewards]);

  return levelProgress(xp, level, fromRewards || fetched);
}
