import { useEffect, useId, useSyncExternalStore } from 'react';
import MascotController from './MascotController';
import MascotSignals from './MascotSignals';
import { claimStage, getStageOwner, releaseStage, subscribeStage } from './stageOwner';

/**
 * 🎪 The stage: the only thing in the application that renders a mascot.
 *
 * Mounted once, by CareerPathMascot inside CareerShell. That is deliberate
 * and is what confines the character to Career Path: leaving the section
 * unmounts the shell, the stage goes with it, and no other part of the
 * application can put a mascot on screen.
 *
 * Uniqueness is a module-level claim rather than a convention or a hiding
 * trick. A second stage cannot take ownership and renders nothing at all, so
 * there is never a spare instance sitting invisible in the tree. The claim
 * lives outside React, which is what makes it survive the route changes and
 * rapid remounts that would otherwise let a duplicate slip through.
 */
export default function MascotStage() {
  const id = useId();
  const owner = useSyncExternalStore(subscribeStage, getStageOwner, getStageOwner);

  useEffect(() => {
    if (!claimStage(id)) {
      console.error(
        '[mascot] A second MascotStage was mounted and will render nothing. ' +
          'There must be exactly one, mounted by CareerPathMascot.'
      );
    }
    return () => releaseStage(id);
  }, [id]);

  if (owner !== id) return null;

  return (
    <>
      <MascotSignals />
      <MascotController />
    </>
  );
}
