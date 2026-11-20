import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The browser's speech recognition (Speak Up, 2026-11-19): start / stop, the words heard so far (final + in progress)
 * and how long the student spoke. Chrome and Edge (desktop and Android) have it; where it is missing `supported` is
 * false and the game lets the student type instead.
 */
const Recognition = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export default function useSpeech() {
  const [listening, setListening] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState(null);
  const rec = useRef(null);
  const finals = useRef('');
  const lastFinal = useRef('');
  const started = useRef(0);
  const [seconds, setSeconds] = useState(0);
  const wanted = useRef(false);
  // WORDCRAFT (2026-11-20): long silences while speaking, and when speech was last heard (for auto-stop).
  const lastHeard = useRef(0);
  const pauseCount = useRef(0);
  const [pauses, setPauses] = useState(0);

  const stop = useCallback(() => {
    wanted.current = false;
    rec.current?.stop();
    setListening(false);
    if (started.current) setSeconds((Date.now() - started.current) / 1000);
    setPauses(pauseCount.current);
  }, []);

  const start = useCallback(() => {
    if (!Recognition) return;
    finals.current = ''; lastFinal.current = ''; setText(''); setError(null); setSeconds(0);
    lastHeard.current = 0; pauseCount.current = 0; setPauses(0);
    const r = new Recognition();
    r.lang = 'en-IN'; r.continuous = true; r.interimResults = true; r.maxAlternatives = 1;
    r.onresult = (e) => {
      const now = Date.now();
      if (lastHeard.current && now - lastHeard.current >= 3000) pauseCount.current += 1;
      lastHeard.current = now;
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        const t = e.results[i][0].transcript.trim();
        if (!e.results[i].isFinal) { interim += ` ${t}`; continue; }
        // Android Chrome repeats the earlier words in each new final result ("she sells" → "she sells seashells"):
        // a final that starts with the previous one replaces it instead of being added (2026-11-20).
        const prev = lastFinal.current;
        if (prev && t.length > prev.length && t.toLowerCase().startsWith(prev.toLowerCase())) finals.current = `${finals.current.slice(0, finals.current.length - prev.length)}${t}`;
        else finals.current += ` ${t}`;
        lastFinal.current = t;
      }
      setText(`${finals.current}${interim}`.trim());
    };
    r.onerror = (e) => { if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(e.error)) wanted.current = false; if (e.error !== 'no-speech' && e.error !== 'aborted') setError(e.error === 'not-allowed' ? 'Microphone permission is blocked — allow it in the browser to speak.' : 'The microphone stopped — tap to try again.'); };
    // Some browsers end a long recording on their own: carry on while the student is still speaking.
    r.onend = () => { if (wanted.current) { try { r.start(); } catch { /* already running */ } } else setListening(false); };
    rec.current = r;
    wanted.current = true;
    started.current = Date.now();
    try { r.start(); setListening(true); } catch { setError('Could not start the microphone.'); }
  }, []);

  useEffect(() => () => { wanted.current = false; rec.current?.abort?.(); }, []);
  const heardAgo = useCallback(() => (lastHeard.current ? Date.now() - lastHeard.current : null), []);
  const elapsed = useCallback(() => (started.current ? (Date.now() - started.current) / 1000 : 0), []);
  return { supported: !!Recognition, listening, text, seconds, error, start, stop, setText, pauses, heardAgo, elapsed };
}

/** Say a word or sentence aloud (the correct pronunciation), in a clear Indian-English voice when there is one. */
export const sayAloud = (text, rate = 0.85) => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  u.voice = voices.find((v) => v.lang === 'en-IN') || voices.find((v) => v.lang?.startsWith('en-GB')) || voices.find((v) => v.lang?.startsWith('en')) || null;
  u.lang = u.voice?.lang || 'en-IN';
  u.rate = rate;
  window.speechSynthesis.speak(u);
};
