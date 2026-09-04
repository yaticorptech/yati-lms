/**
 * The rewards context and its hook, in a file of their own so the provider
 * file exports only a component (which is what fast refresh needs).
 */
import { createContext, useContext } from 'react';

export const RewardsContext = createContext({ enabled: false, summary: null, refresh: () => {}, celebrate: () => {}, pullEvents: () => {} });

export const useRewards = () => useContext(RewardsContext);
