import { useEffect, useRef } from 'react';

/**
 * <LoopWalker /> — mounts the Loop mascot once for the whole app (put it in your root layout).
 * Place loop-walker.js, loop-walker.css and mascot.glb in /public/loop-walker/ (or pass your own URLs).
 *
 * Props: every LoopWalker.mount() option (model, height, mode, explain, greeting, facecam, hint, zIndex,
 * onReady, onTelemetry, onError, …) plus `script` (URL of loop-walker.js, default /loop-walker/loop-walker.js).
 */
export default function LoopWalker({ script = '/loop-walker/loop-walker.js', ...options }) {
  const handle = useRef(null);
  const latest = useRef(options);
  latest.current = options;

  useEffect(() => {
    let cancelled = false;
    const load = () => new Promise((resolve, reject) => {
      if (window.LoopWalker) return resolve();
      const existing = document.querySelector(`script[src="${script}"]`);
      if (existing) { existing.addEventListener('load', () => resolve()); existing.addEventListener('error', reject); return; }
      const s = document.createElement('script');
      s.src = script; s.async = true; s.onload = () => resolve(); s.onerror = () => reject(new Error('loop-walker.js failed to load'));
      document.head.appendChild(s);
    });
    load().then(() => {
      if (cancelled) return;
      const base = script.replace(/[^/]*$/, '');
      handle.current = window.LoopWalker.mount({ model: base + 'mascot.glb', css: base + 'loop-walker.css', ...latest.current });
    }).catch((e) => latest.current.onError ? latest.current.onError(e) : console.warn(e));
    return () => { cancelled = true; if (handle.current) { handle.current.destroy(); handle.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [script]);

  // runtime option changes (height, mode, facecam, explain texts…) without remounting
  useEffect(() => {
    if (!handle.current) return;
    const { onReady, onTelemetry, onError, script: _s, model, css, three, container, ...live } = options;
    handle.current.set(live);
  });

  return null;
}
