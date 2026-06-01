'use client';

interface AppIconProps {
  letter?: string;
  gradient?: string;
  color?: string;
  imgUrl?: string;
  size?: number;
}

export function AppIcon({ letter, gradient, color, imgUrl, size = 56 }: AppIconProps) {
  const radius = Math.round(size * 0.25);

  if (imgUrl) {
    return (
      <img
        src={imgUrl}
        alt={letter ?? ''}
        width={size}
        height={size}
        style={{ borderRadius: radius, objectFit: 'cover', display: 'block', flexShrink: 0 }}
      />
    );
  }

  return (
    <div
      className="app-icon"
      style={{
        width: size,
        height: size,
        background: gradient ?? 'var(--surface-2)',
        color: color ?? 'var(--text-primary)',
        fontSize: Math.round(size * 0.42),
        borderRadius: radius,
      }}
    >
      <span style={{ position: 'relative', zIndex: 1 }}>{letter}</span>
    </div>
  );
}
