/** Drag-and-drop helpers for the group-G verbal games (see GVerbalKit.jsx). */

export const DRAG_TYPE = 'text/plain';

/** Props that make any element a drop target: a dragged chip's id, or a click (place the held chip). */
export const dropProps = (onDropId, onClickEmpty) => ({
  onDragOver: (e) => e.preventDefault(),
  onDrop: (e) => {
    e.preventDefault();
    const id = e.dataTransfer.getData(DRAG_TYPE);
    if (id !== '') onDropId(id);
  },
  onClick: onClickEmpty
});

/** A fresh seed for a level's generator. */
export const freshSeed = () => Math.floor(Math.random() * 4294967296);
