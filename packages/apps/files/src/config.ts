/**
 * Tunables for the Files app. Kept in one place so the virtualizer, layout,
 * and test fixtures can share the same numbers.
 */

/** Item count at which the views switch to virtualized rendering. */
export const VIRTUALIZE_THRESHOLD = 200

/** Grid column target width; the actual count is floored from container width. */
export const GRID_MIN_COL_PX = 104

/** Estimated grid row height (icon + name block + gap). */
export const GRID_ROW_PX = 92

/** Estimated list row height (tight row). */
export const LIST_ROW_PX = 28

/** Rows rendered outside the visible window for smooth scrolling. */
export const VIRTUAL_OVERSCAN = 6
