/**
 * Deterministic Avatar Generator for SayHola
 * Generates consistent, distinctive duotone gradients, initials, and geometric accents
 * based on the user's nickname. Zero external network requests or profile pictures needed.
 */

export interface DeterministicAvatarData {
  initials: string;
  gradient: string;
  fromColor: string;
  toColor: string;
  textColor: string;
  angle: number;
  patternType: 'circles' | 'rings' | 'mesh' | 'dots' | 'crosses';
  accentColor: string;
}

// 16 curated accessible duotone gradient pairs with high aesthetic appeal
export const AVATAR_PALETTES = [
  { from: '#4f46e5', to: '#7c3aed', accent: '#a78bfa' }, // Indigo -> Violet
  { from: '#0284c7', to: '#2563eb', accent: '#60a5fa' }, // Sky -> Blue
  { from: '#059669', to: '#0d9488', accent: '#34d399' }, // Emerald -> Teal
  { from: '#d97706', to: '#ea580c', accent: '#fbbf24' }, // Amber -> Orange
  { from: '#e11d48', to: '#be123c', accent: '#fb7185' }, // Rose -> Crimson
  { from: '#c026d3', to: '#9333ea', accent: '#f472b6' }, // Fuchsia -> Purple
  { from: '#0891b2', to: '#0284c7', accent: '#38bdf8' }, // Cyan -> Sky
  { from: '#16a34a', to: '#059669', accent: '#4ade80' }, // Green -> Emerald
  { from: '#7c3aed', to: '#db2777', accent: '#e879f9' }, // Violet -> Pink
  { from: '#dc2626', to: '#d97706', accent: '#f87171' }, // Red -> Amber
  { from: '#2563eb', to: '#4f46e5', accent: '#93c5fd' }, // Blue -> Indigo
  { from: '#0d9488', to: '#0284c7', accent: '#2dd4bf' }, // Teal -> Sky
  { from: '#9333ea', to: '#4f46e5', accent: '#c084fc' }, // Purple -> Indigo
  { from: '#ea580c', to: '#e11d48', accent: '#fdba74' }, // Orange -> Rose
  { from: '#0f766e', to: '#115e59', accent: '#5eead4' }, // Deep Teal
  { from: '#4338ca', to: '#1e1b4b', accent: '#818cf8' }, // Midnight Indigo
];

// FNV-1a 32-bit deterministic hash
export function hashNickname(str: string): number {
  const normalized = (str || 'Guest').trim().toLowerCase();
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// Extract 1 or 2 meaningful initials
export function getInitials(name: string): string {
  if (!name || !name.trim()) return '?';
  const clean = name.trim().replace(/^[@#_]+/, '');
  if (!clean) return name.slice(0, 1).toUpperCase();

  // Check for words separated by space, underscore, dot or hyphen
  const parts = clean.split(/[\s_\-.]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  // Check for camelCase / PascalCase transitions (e.g. TariqDev -> TD, NeonFalcon -> NF)
  const camelMatches = clean.match(/[A-Z][a-z0-9]*/g);
  if (camelMatches && camelMatches.length >= 2) {
    return (camelMatches[0][0] + camelMatches[1][0]).toUpperCase();
  }

  // If single word, return first 2 letters if >= 2 chars, else 1
  return clean.length >= 2 ? clean.slice(0, 2).toUpperCase() : clean.toUpperCase();
}

const PATTERNS: Array<'circles' | 'rings' | 'mesh' | 'dots' | 'crosses'> = [
  'circles',
  'rings',
  'mesh',
  'dots',
  'crosses',
];

const ANGLES = [135, 45, 160, 210, 90, 180, 120, 240];

export function getDeterministicAvatar(name: string): DeterministicAvatarData {
  const hash = hashNickname(name);
  const paletteIndex = hash % AVATAR_PALETTES.length;
  const palette = AVATAR_PALETTES[paletteIndex];
  const angle = ANGLES[(hash >> 4) % ANGLES.length];
  const patternType = PATTERNS[(hash >> 8) % PATTERNS.length];

  return {
    initials: getInitials(name),
    gradient: `linear-gradient(${angle}deg, ${palette.from}, ${palette.to})`,
    fromColor: palette.from,
    toColor: palette.to,
    textColor: '#ffffff',
    angle,
    patternType,
    accentColor: palette.accent,
  };
}

// Backward-compatible helper for legacy uses
export function getAvatarColorForNickname(name: string): string {
  const hash = hashNickname(name);
  return AVATAR_PALETTES[hash % AVATAR_PALETTES.length].from;
}
