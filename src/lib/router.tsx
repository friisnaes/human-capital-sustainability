/**
 * Minimal hash-baseret router.
 *
 * GitHub Pages er statisk hosting uden server-side omskrivning. Hash-routing
 * (#/risici?enhed=DIG) betyder, at serveren altid kun leverer index.html, så
 * direkte links og genindlæsning virker på enhver sti og under enhver
 * repository-specifik base path.
 */
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export interface Route {
  path: string;
  query: URLSearchParams;
}

/** Parametre, der følger med ved navigation (globale filtre). */
export const GLOBAL_PARAMS = ['enhed', 'periode'] as const;

function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '') || '/';
  const [p, q] = raw.split('?');
  const path = '/' + (p ?? '').replace(/^\/+/, '').replace(/\/+$/, '');
  return { path, query: new URLSearchParams(q ?? '') };
}

export function buildHref(path: string, query?: URLSearchParams | Record<string, string | null | undefined>): string {
  const params = query instanceof URLSearchParams ? new URLSearchParams(query) : new URLSearchParams();
  if (query && !(query instanceof URLSearchParams)) {
    for (const [k, v] of Object.entries(query)) if (v !== null && v !== undefined && v !== '') params.set(k, v);
  }
  const qs = params.toString();
  return `#${path}${qs ? `?${qs}` : ''}`;
}

interface RouterValue {
  route: Route;
  /** Navigér til en sti. Globale filtre bevares, medmindre de overskrives. */
  navigate: (path: string, params?: Record<string, string | null | undefined>, opts?: { replace?: boolean; keep?: boolean }) => void;
  /** Opdatér forespørgselsparametre på den aktuelle side. */
  setParams: (params: Record<string, string | null | undefined>, opts?: { replace?: boolean }) => void;
  /** Byg et link, der bevarer globale filtre. */
  href: (path: string, params?: Record<string, string | null | undefined>) => string;
}

const RouterContext = createContext<RouterValue | null>(null);

export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const go = useCallback((target: string, replace: boolean) => {
    if (target === window.location.hash) return;
    if (replace) {
      window.history.replaceState(null, '', target);
      setRoute(parseHash(target));
    } else {
      window.location.hash = target.slice(1);
    }
  }, []);

  const value = useMemo<RouterValue>(() => {
    const globalsFrom = (q: URLSearchParams) => {
      const out = new URLSearchParams();
      for (const k of GLOBAL_PARAMS) {
        const v = q.get(k);
        if (v) out.set(k, v);
      }
      return out;
    };
    const merge = (base: URLSearchParams, params?: Record<string, string | null | undefined>) => {
      const out = new URLSearchParams(base);
      for (const [k, v] of Object.entries(params ?? {})) {
        if (v === null || v === undefined || v === '') out.delete(k);
        else out.set(k, v);
      }
      return out;
    };
    return {
      route,
      navigate: (path, params, opts) => {
        const base = opts?.keep ? route.query : globalsFrom(route.query);
        go(buildHref(path, merge(base, params)), !!opts?.replace);
        if (!opts?.replace) window.scrollTo({ top: 0 });
      },
      setParams: (params, opts) => go(buildHref(route.path, merge(route.query, params)), opts?.replace ?? true),
      href: (path, params) => buildHref(path, merge(globalsFrom(route.query), params)),
    };
  }, [route, go]);

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterValue {
  const v = useContext(RouterContext);
  if (!v) throw new Error('useRouter skal bruges inden for RouterProvider');
  return v;
}

export function Link({
  to,
  params,
  className,
  children,
  ariaLabel,
  ariaCurrent,
}: {
  to: string;
  params?: Record<string, string | null | undefined>;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
  ariaCurrent?: boolean;
}) {
  const { href } = useRouter();
  return (
    <a href={href(to, params)} className={className} aria-label={ariaLabel} aria-current={ariaCurrent ? 'page' : undefined}>
      {children}
    </a>
  );
}
