/** Små, neutrale ikoner som inline-SVG (ingen ekstern afhængighed). */
import type { ReactNode, SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 16, children, ...rest }: P & { children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...rest}>
      {children}
    </svg>
  );
}

export const IconMenu = (p: P) => (
  <Svg {...p}>
    <path d="M2 4h12M2 8h12M2 12h12" />
  </Svg>
);
export const IconClose = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
  </Svg>
);
export const IconInfo = (p: P) => (
  <Svg {...p}>
    <circle cx="8" cy="8" r="6.25" />
    <path d="M8 7.2v4M8 4.9v.1" />
  </Svg>
);
export const IconArrow = (p: P) => (
  <Svg {...p}>
    <path d="M3 8h10M9 4l4 4-4 4" />
  </Svg>
);
export const IconDownload = (p: P) => (
  <Svg {...p}>
    <path d="M8 2.5v8M4.5 7.5L8 11l3.5-3.5M3 13.5h10" />
  </Svg>
);
export const IconPrint = (p: P) => (
  <Svg {...p}>
    <path d="M4.5 6V2.5h7V6M4.5 11.5h-2v-5h11v5h-2M4.5 9.5h7v4h-7z" />
  </Svg>
);
export const IconReset = (p: P) => (
  <Svg {...p}>
    <path d="M3 8a5 5 0 1 0 1.5-3.6M3 2.5v2.5h2.5" />
  </Svg>
);
export const IconCheck = (p: P) => (
  <Svg {...p}>
    <path d="M3 8.5l3 3 7-7" />
  </Svg>
);
export const IconDoc = (p: P) => (
  <Svg {...p}>
    <path d="M4 1.5h5.5L12.5 4.5v10H4zM9.5 1.5v3h3M6 8h4.5M6 10.5h4.5" />
  </Svg>
);
export const IconJudgement = (p: P) => (
  <Svg {...p}>
    <path d="M2.5 12.5c1.5-1.5 2.5-1.5 4 0s2.5 1.5 4 0 2.5-1.5 3 0M8 2.5v7" />
  </Svg>
);
export const IconChevron = (p: P) => (
  <Svg {...p}>
    <path d="M4 6l4 4 4-4" />
  </Svg>
);
