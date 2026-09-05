import { useState } from 'react';
import { POSES, RATIO } from './poses';
import './mascot.css';

/**
 * The official CareerPath mascot, shown exactly as supplied.
 *
 * `pose` picks one of the official cut-outs listed in poses.js (point,
 * hello, walk, guide, hooray, confetti, star, sad, flex, meditate and the
 * rest). Nothing here alters the artwork: movement is
 * applied to wrappers around the image, so the whole picture floats, walks,
 * bounces and glides as one, and `flip` only mirrors it to face the way it
 * is going. If a pose file is missing the main one is used; if that is
 * missing too, nothing is rendered rather than a stand-in.
 */
export default function Mascot({ pose = 'point', height = 120, motion = 'mc-float', flip = false, className = '' }) {
  const [failed, setFailed] = useState({});
  const key = failed[pose] ? 'point' : pose;
  if (failed.point && key === 'point') return null;

  const width = Math.round(height * (RATIO[key] || 0.8));
  return (
    <span className={`block ${flip ? '-scale-x-100' : ''} ${className}`} style={{ width, height }} aria-hidden>
      <span className={`block h-full w-full ${motion}`}>
        <img
          src={POSES[key]}
          alt=""
          draggable={false}
          onError={() => setFailed((f) => ({ ...f, [key]: true }))}
          className="h-full w-full object-contain object-bottom select-none"
          style={{ filter: 'drop-shadow(0 12px 16px rgba(28, 95, 214, 0.28))' }}
        />
      </span>
    </span>
  );
}
