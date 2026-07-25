import { useState } from 'react';

interface TeamLogoProps {
  abbreviation: string;
  primaryColor: string;
  /** px size for both width and height (default 32) */
  size?: number;
  className?: string;
}

/**
 * Renders /logos/{abbreviation}.png if available, otherwise falls back to a
 * small colored circle with the team's primary color.
 */
export function TeamLogo({ abbreviation, primaryColor, size = 32, className = '' }: TeamLogoProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        className={`rounded-full shrink-0 ${className}`}
        style={{
          width: size,
          height: size,
          backgroundColor: primaryColor,
          display: 'inline-block',
        }}
        aria-label={abbreviation}
      />
    );
  }

  return (
    <img
      src={`/logos/${abbreviation}.png`}
      alt={abbreviation}
      width={size}
      height={size}
      className={`object-contain shrink-0 ${className}`}
      onError={() => setFailed(true)}
      style={{ width: size, height: size }}
    />
  );
}
