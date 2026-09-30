import React, { useMemo } from 'react';
import './mascot-rig.js';
import parts from './raster-manifest.js';

const rig = window.MascotRig;
let uid = 0;
/**
 * <Mascot pose="waving" expression="happy" size={240} assetBase="/mascot/raster-parts/" />
 * pose:       original | idle | pointLeft | pointRight | lookUp | lookDown | lookButton | greeting | listening | thinkingPose | sleeping | celebrating | jumping | clapping | waving | walk | run | breathing | blink | bounce
 * expression: neutral | happy | excited | curious | thinking | encouraged | sleepy
 * mode:       'raster' (default, pixel-identical parts of the original PNG) | 'vector' (pure SVG redraw)
 * assetBase:  public URL folder that contains the raster-parts/*.png files
 * Every body part is a <g id="..."> with data-pivot="x,y" so you can also drive it with GSAP / Framer / Rive.
 */
export default function Mascot({ pose = 'idle', expression, size = 240, animate = true, mode = 'raster', assetBase = '/mascot/raster-parts/', className, style }) {
  const prefix = useMemo(() => 'mascot' + (uid++), []);
  const svg = useMemo(() => {
    rig.setMode(mode); rig.setRaster({ base: assetBase, parts });
    return rig.render(pose, { expression, animate, prefix });
  }, [pose, expression, animate, prefix, mode, assetBase]);
  return <div className={className} style={{ width: size, lineHeight: 0, ...style }} dangerouslySetInnerHTML={{ __html: svg }} />;
}
export const MASCOT_POSES = rig.poses;
export const MASCOT_EXPRESSIONS = rig.expressions;
