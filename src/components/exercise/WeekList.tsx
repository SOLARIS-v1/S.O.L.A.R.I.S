'use client';

import { type ReactNode, useEffect, useRef } from 'react';
import s from './exercise.module.css';

/**
 * The week's days as a list. Where it scrolls sideways (mid widths), it opens on today, fades only the edges that
 * have more days past them, and takes keyboard focus so the arrow keys scroll it. Elsewhere it is a plain list.
 */
export function WeekList({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let opened = false;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      const can = max > 1;
      // Focusable only while it scrolls, so the arrow keys can move it; a list that fits is no tab stop.
      if (can) el.tabIndex = 0;
      else el.removeAttribute('tabindex');
      // The first time it scrolls, centre today (inline only: the page itself must not move).
      if (can && !opened) {
        opened = true;
        const today = el.querySelector<HTMLElement>('[aria-current="date"]');
        if (today) {
          const left = today.getBoundingClientRect().left - el.getBoundingClientRect().left;
          el.scrollLeft += left - (el.clientWidth - today.offsetWidth) / 2;
        }
      }
      const start = can && el.scrollLeft > 1;
      const end = can && el.scrollLeft < max - 1;
      el.dataset.fade = start && end ? 'both' : start ? 'start' : end ? 'end' : '';
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    el.addEventListener('scroll', update, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', update);
    };
  }, []);

  return (
    <ol ref={ref} className={s.week} aria-label="Days this week">
      {children}
    </ol>
  );
}
