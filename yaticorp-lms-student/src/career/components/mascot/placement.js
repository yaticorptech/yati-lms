/**
 * The page's content column, so the tour's dock spans the page and never
 * the sidebar.
 */
export const contentBounds = (minWidth = 0) => {
  const r = document.querySelector('main')?.getBoundingClientRect();
  return r && r.width > minWidth + 16 ? { left: r.left + 8, right: r.right - 8 } : { left: 8, right: window.innerWidth - 8 };
};
