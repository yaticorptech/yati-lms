import { useCallback, useEffect, useState } from 'react';
import { Alignment, Fit, Layout, useRive } from '@rive-app/react-canvas';
import { CANONICAL, INPUTS, RIVE_SRC, STATE_MACHINE } from './riveConfig';
import useBlinkScheduler from './useBlinkScheduler';

/**
 * The rigged mascot: one Rive artboard, one state machine, real interpolated
 * skeletal animation.
 *
 * There is no image swapping here and no frame sequence. The renderer sets a
 * number on the state machine and Rive blends the bone transforms from
 * wherever the character currently is to wherever the new state puts it. That
 * is why the mascot never disappears between states: it is the same character
 * moving, not one picture replaced by another.
 *
 * Loaded lazily, so the runtime is only fetched when the rig is switched on.
 * If mascot.riv is missing or fails to parse, `onUnavailable` fires and the
 * caller falls back to the official PNG artwork. The mascot must never break
 * because a rig is absent.
 */
const reducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function RiveMascot({
  clip = 'idle',
  clipIndex = 0,
  height = 120,
  talking = false,
  flip = false,
  paused = false,
  speed = 0,
  look = 0,
  className = '',
  onUnavailable
}) {
  const [ready, setReady] = useState(false);

  const { rive, RiveComponent } = useRive({
    src: RIVE_SRC,
    stateMachines: STATE_MACHINE,
    autoplay: true,
    // Feet on the baseline, so the character stands on the page rather than
    // floating in the middle of its own box.
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.BottomCenter }),
    onLoad: () => setReady(true),
    onLoadError: () => onUnavailable?.()
  });

  /*
   * Inputs are looked up on the instance rather than through the per-input
   * hook, so each write happens to a local value inside an effect. Same
   * documented API, and it keeps this component free of the mutation the
   * hook-returned handles would require.
   */
  const setInput = useCallback(
    (name, value) => {
      const input = rive?.stateMachineInputs?.(STATE_MACHINE)?.find((i) => i.name === name);
      if (input) input.value = value;
    },
    [rive]
  );

  const fireBlink = useCallback(() => {
    const input = rive?.stateMachineInputs?.(STATE_MACHINE)?.find((i) => i.name === INPUTS.blink);
    input?.fire();
  }, [rive]);

  // The whole product-to-animation join: a state name became a number.
  useEffect(() => {
    if (ready) setInput(INPUTS.state, clipIndex);
  }, [clipIndex, ready, setInput]);

  useEffect(() => {
    if (ready) setInput(INPUTS.talking, !!talking);
  }, [talking, ready, setInput]);

  useEffect(() => {
    if (ready) setInput(INPUTS.faceLeft, !!flip);
  }, [flip, ready, setInput]);

  // The two that keep the character honest: legs at the speed the body is
  // actually moving, head turned toward what it was sent to look at.
  useEffect(() => {
    if (ready) setInput(INPUTS.speed, speed);
  }, [speed, ready, setInput]);

  useEffect(() => {
    if (ready) setInput(INPUTS.look, look);
  }, [look, ready, setInput]);

  useBlinkScheduler(fireBlink, ready && !paused);

  // Nothing animates that nobody is watching, and nothing animates for a
  // student who asked for less motion: the rig holds its rest pose instead.
  useEffect(() => {
    if (!rive) return undefined;
    const settle = () => {
      if (paused || document.hidden || reducedMotion()) rive.pause();
      else rive.play();
    };
    settle();
    document.addEventListener('visibilitychange', settle);
    return () => document.removeEventListener('visibilitychange', settle);
  }, [rive, paused]);

  return (
    <span
      className={`block ${className}`}
      data-mascot-rive={clip}
      // Locked to the canonical canvas. The character's proportions are
      // identical at every size it is drawn, which is the whole point.
      style={{ height, width: Math.round(height * CANONICAL.ratio) }}
      aria-hidden
    >
      <RiveComponent style={{ width: '100%', height: '100%' }} />
    </span>
  );
}
