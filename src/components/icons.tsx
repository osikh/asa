'use client';

interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

function Icon({
  children,
  size = 16,
  strokeWidth = 1.5,
  className,
  style,
}: IconProps & { children: React.ReactNode; strokeWidth?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={style}
    >
      {children}
    </svg>
  );
}

export function BrandMark({ size = 18, className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      style={style}
    >
      <path d="M12 2.5 21.5 12 12 21.5 2.5 12Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 7.5 16.5 12 12 16.5 7.5 12Z" fill="currentColor" opacity="0.85" />
    </svg>
  );
}

export const IconArrowUp = (p: IconProps) => <Icon {...p}><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></Icon>;
export const IconCheck = (p: IconProps) => <Icon {...p}><path d="M20 6 9 17l-5-5" /></Icon>;
export const IconX = (p: IconProps) => <Icon {...p}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Icon>;
export const IconCircle = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="9" /></Icon>;
export const IconLoader = (p: IconProps) => <Icon {...p}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></Icon>;
export const IconPlus = (p: IconProps) => <Icon {...p}><path d="M12 5v14" /><path d="M5 12h14" /></Icon>;
export const IconStar = (p: IconProps) => (
  <Icon {...p} strokeWidth={0}>
    <path
      fill="currentColor"
      d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"
    />
  </Icon>
);
export const IconZap = (p: IconProps) => <Icon {...p}><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" /></Icon>;
export const IconTrendingUp = (p: IconProps) => <Icon {...p}><path d="M22 7 13.5 15.5 8.5 10.5 2 17" /><path d="M16 7h6v6" /></Icon>;
export const IconCompass = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="10" /><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36z" /></Icon>;
export const IconBarChart = (p: IconProps) => <Icon {...p}><path d="M3 3v18h18" /><path d="M7 16V11" /><path d="M12 16V8" /><path d="M17 16v-3" /></Icon>;
export const IconType = (p: IconProps) => <Icon {...p}><path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" /></Icon>;
export const IconText = (p: IconProps) => <Icon {...p}><path d="M4 6h16" /><path d="M4 12h10" /><path d="M4 18h16" /></Icon>;
export const IconKey = (p: IconProps) => <Icon {...p}><path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" /></Icon>;
export const IconImage = (p: IconProps) => <Icon {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></Icon>;
export const IconVideo = (p: IconProps) => <Icon {...p}><path d="m22 8-6 4 6 4V8z" /><rect x="2" y="6" width="14" height="12" rx="2" /></Icon>;
export const IconTrophy = (p: IconProps) => <Icon {...p}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></Icon>;
export const IconTarget = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></Icon>;
export const IconArrowExternal = (p: IconProps) => <Icon {...p}><path d="M7 17 17 7" /><path d="M7 7h10v10" /></Icon>;
