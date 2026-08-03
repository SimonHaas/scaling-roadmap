'use client';

import { useEffect } from 'react';

/**
 * On phones the ladder becomes a horizontal strip that starts at stage 09, so
 * the rung you are actually on can sit off-screen. This nudges it into view
 * once, without moving the page itself.
 */
export default function LadderFocus() {
  useEffect(() => {
    const here = document.querySelector<HTMLElement>('.ladder [data-here="1"]');
    const rail = here?.parentElement;
    if (!here || !rail) return;
    // only when the rail is actually scrolling sideways
    if (rail.scrollWidth <= rail.clientWidth + 4) return;
    rail.scrollLeft = Math.max(0, here.offsetLeft - rail.clientWidth / 2 + here.offsetWidth / 2);
  }, []);
  return null;
}
