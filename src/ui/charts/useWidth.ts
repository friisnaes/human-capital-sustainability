import { type RefObject, useEffect, useState } from 'react';

/** Måler et elements bredde, så diagrammer tegnes i faktiske pixel (ingen forvrænget tekst). */
export function useWidth(ref: RefObject<HTMLElement | null>, fallback = 640): number {
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setW(Math.max(260, Math.round(el.getBoundingClientRect().width)));
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}
