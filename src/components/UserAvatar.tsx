import React from 'react';
import { getDeterministicAvatar, DeterministicAvatarData } from '../lib/avatarGenerator';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface UserAvatarProps {
  nickname: string;
  size?: AvatarSize;
  className?: string;
  showInitials?: boolean;
  animate?: boolean;
}

const SIZE_MAP: Record<AvatarSize, { dimension: string; textClass: string; px: number }> = {
  xs: { dimension: 'w-6 h-6', textClass: 'text-[9px] tracking-tight', px: 24 },
  sm: { dimension: 'w-7 h-7', textClass: 'text-[10px] tracking-tight', px: 28 },
  md: { dimension: 'w-8 h-8', textClass: 'text-xs', px: 32 },
  lg: { dimension: 'w-10 h-10', textClass: 'text-sm font-bold', px: 40 },
  xl: { dimension: 'w-12 h-12', textClass: 'text-base font-bold', px: 48 },
  '2xl': { dimension: 'w-16 h-16', textClass: 'text-xl font-bold', px: 64 },
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  nickname,
  size = 'md',
  className = '',
  showInitials = true,
  animate = false,
}) => {
  const avatar: DeterministicAvatarData = getDeterministicAvatar(nickname || 'Guest');
  const sizeConfig = SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full shrink-0 select-none overflow-hidden shadow-xs ring-1 ring-black/10 dark:ring-white/15 transition-transform duration-200 ${
        animate ? 'hover:scale-105 active:scale-95' : ''
      } ${sizeConfig.dimension} ${className}`}
      style={{
        background: avatar.gradient,
      }}
      title={nickname || 'Anonymous'}
      aria-label={`Avatar for ${nickname || 'Anonymous'}`}
      role="img"
    >
      {/* Deterministic SVG Background Motif */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full pointer-events-none opacity-30"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={`glow-${avatar.initials}-${avatar.angle}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {avatar.patternType === 'circles' && (
          <>
            <circle cx="20" cy="20" r="28" fill="#ffffff" opacity="0.35" />
            <circle cx="85" cy="80" r="34" fill="#ffffff" opacity="0.25" />
          </>
        )}

        {avatar.patternType === 'rings' && (
          <>
            <circle cx="50" cy="50" r="36" fill="none" stroke="#ffffff" strokeWidth="6" opacity="0.4" />
            <circle cx="50" cy="50" r="22" fill="none" stroke="#ffffff" strokeWidth="4" opacity="0.3" />
          </>
        )}

        {avatar.patternType === 'mesh' && (
          <>
            <path
              d="M-20 20 L120 80 M-20 60 L120 120 M20 -20 L80 120"
              stroke="#ffffff"
              strokeWidth="4"
              strokeDasharray="6 6"
              opacity="0.3"
            />
          </>
        )}

        {avatar.patternType === 'dots' && (
          <>
            <circle cx="25" cy="25" r="5" fill="#ffffff" opacity="0.5" />
            <circle cx="75" cy="25" r="5" fill="#ffffff" opacity="0.5" />
            <circle cx="25" cy="75" r="5" fill="#ffffff" opacity="0.5" />
            <circle cx="75" cy="75" r="5" fill="#ffffff" opacity="0.5" />
          </>
        )}

        {avatar.patternType === 'crosses' && (
          <>
            <path d="M45 20 L55 20 M50 15 L50 25" stroke="#ffffff" strokeWidth="3" opacity="0.4" />
            <path d="M75 70 L85 70 M80 65 L80 75" stroke="#ffffff" strokeWidth="3" opacity="0.4" />
            <path d="M15 70 L25 70 M20 65 L20 75" stroke="#ffffff" strokeWidth="3" opacity="0.4" />
          </>
        )}

        {/* Ambient Center Glow */}
        <circle cx="50" cy="50" r="48" fill={`url(#glow-${avatar.initials}-${avatar.angle})`} />
      </svg>

      {/* User Initials Display */}
      {showInitials && (
        <span
          className={`relative z-10 font-bold leading-none text-white drop-shadow-xs select-none ${sizeConfig.textClass}`}
        >
          {avatar.initials}
        </span>
      )}
    </div>
  );
};
