import { useEffect, useRef } from 'react';

/**
 * <LoopWalker /> — mounts the Loop mascot once for the whole app (put it in your root layout).
 * Place loop-walker.js, loop-walker.css and mascot.glb in /public/loop-walker/ (or pass your own URLs).
 *
 * Props: every LoopWalker.mount() option (model, height, mode, explain, greeting, facecam, hint, zIndex,
 * onReady, onTelemetry, onError, …) plus `script` (URL of loop-walker.js, default /loop-walker/loop-walker.js).
 *
 * The package's react/LoopWalker.jsx, changed only for this repo's lint rules: the latest options are
 * stored from an effect rather than during render, the mount-only options are left out of the live
 * update by name rather than by destructuring them into unused variables, and the eslint-disable
 * comment the rules here do not need is gone.
 */

// Options that only mean something to mount(); the rest can change while Loop is on the page.
const MOUNT_ONLY = ['onReady', 'onTelemetry', 'onError', 'model', 'css', 'three', 'container'];

export default function LoopWalker({ script = '/loop-walker/loop-walker.js', ...options }) {
  const handle = useRef(null);
  const latest = useRef(options);

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
  }, [script]);

  // runtime option changes (height, mode, facecam, explain texts…) without remounting
  useEffect(() => {
    latest.current = options;
    if (!handle.current) return;
    const live = { ...options };
    MOUNT_ONLY.forEach((k) => { delete live[k]; });
    handle.current.set(live);
  });

  return null;
}
