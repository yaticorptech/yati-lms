/**
 * How the last answer went, for the character on the screen to show it (2026-11-06, the user's Duolingo picture: "the
 * cartoon gives the action — the answer right, thumbs up; wrong, sad; and a voice too"): 'right' | 'wrong' | null.
 * Given by Session; read by the characters on the question screens (exercises.jsx MoodMascot).
 */
import { createContext } from 'react';

export const MoodContext = createContext(null);
/** The pose for a mood: thumbs up, sad, or the screen's own. */
export const poseFor = (mood, pose) => (mood === 'right' ? 'thumbs-up' : mood === 'wrong' ? 'sad' : pose);
