/**
 * SayHola Moderation & Abusive Word Filter
 * Supports English and common Roman Urdu abusive terms with leetspeak & repeat character normalization.
 */

// Default Roman Urdu prohibited terms (normalized roots)
export const ROMAN_URDU_BAD_WORDS = [
  'bhenchod',
  'behenchod',
  'madarchod',
  'bhosdike',
  'bhosdi',
  'bhosadike',
  'chutiya',
  'chutiye',
  'chootiya',
  'gandu',
  'gaandu',
  'harami',
  'haraami',
  'haramkhor',
  'kamina',
  'kaminey',
  'kutta',
  'kutte',
  'kutti',
  'randi',
  'raandi',
  'dalla',
  'dallay',
  'kanjar',
  'kanjri',
  'bhadva',
  'bhadwa',
  'lauda',
  'lawda',
  'lodu',
  'gaand',
  'gand',
  'chut',
  'chod',
  'chodu',
  'teri maa',
  'maa ki aankh',
  'gashti',
  'tatte',
];

// Default English prohibited terms (severe vulgarities, slurs, harassment)
export const ENGLISH_BAD_WORDS = [
  'fuck',
  'fucking',
  'fucker',
  'motherfucker',
  'shit',
  'bullshit',
  'bitch',
  'bitches',
  'asshole',
  'cunt',
  'dickhead',
  'bastard',
  'nigger',
  'nigga',
  'faggot',
  'whore',
  'slut',
  'pussy',
  'retard',
  'kill yourself',
  'kys',
];

// Reserved administrative names that users cannot claim
export const RESERVED_ADMIN_NAMES = [
  'admin',
  'administrator',
  'moderator',
  'mod',
  'sayhola',
  'openchat',
  'system',
  'staff',
  'root',
  'support',
  'official',
  'helpdesk',
  'bot',
  'owner',
  'superuser',
  'security',
];

/**
 * Normalizes text to defeat simple evasion tricks:
 * - Leetspeak substitutions (@ -> a, 1 -> i, 0 -> o, etc.)
 * - Punctuation / separator removal within words (f.u.c.k -> fuck)
 * - Collapsing 3+ repeated characters (fuuuuck -> fuck)
 */
export function normalizeTextForFilter(text: string): string {
  if (!text) return '';

  let normalized = text.toLowerCase();

  // Common leetspeak mappings
  const leetMap: Record<string, string> = {
    '@': 'a',
    '4': 'a',
    '8': 'b',
    '3': 'e',
    '1': 'i',
    '!': 'i',
    '|': 'i',
    '0': 'o',
    '$': 's',
    '5': 's',
    '7': 't',
    '+': 't',
    'v': 'u',
  };

  // Replace leet characters
  let replaced = '';
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    replaced += leetMap[ch] !== undefined ? leetMap[ch] : ch;
  }
  normalized = replaced;

  // Collapse 3 or more repeated characters to 1 (e.g., 'fuuuuck' -> 'fuck', 'kuttaaaa' -> 'kuta')
  normalized = normalized.replace(/(.)\1{2,}/g, '$1');

  return normalized;
}

/**
 * Checks a message against the filter.
 * Returns an object indicating whether the text is clean and the reason if blocked.
 */
export function checkProfanity(
  rawText: string,
  customForbiddenWords: string[] = []
): { isClean: boolean; matchedWord?: string; reason?: string } {
  if (!rawText || !rawText.trim()) {
    return { isClean: false, reason: 'Message cannot be empty.' };
  }

  const rawLower = rawText.toLowerCase();
  const normalized = normalizeTextForFilter(rawText);

  // Combine default and custom word lists
  const allProhibited = [
    ...ENGLISH_BAD_WORDS,
    ...ROMAN_URDU_BAD_WORDS,
    ...customForbiddenWords.map(w => w.trim().toLowerCase()),
  ].filter(Boolean);

  for (const word of allProhibited) {
    if (!word) continue;
    const cleanWord = word.toLowerCase();

    // Check with word boundaries for short words (< 4 chars) to prevent false positives like 'pass' -> 'ass'
    if (cleanWord.length <= 3) {
      const regex = new RegExp(`\\b${escapeRegExp(cleanWord)}\\b`, 'i');
      if (regex.test(rawLower) || regex.test(normalized)) {
        return {
          isClean: false,
          matchedWord: word,
          reason: 'Your message was blocked because it contains prohibited language.',
        };
      }
    } else {
      // For longer words, check both space-separated and punctuation-stripped normalized strings
      // Also match if separated by dots, spaces, or dashes
      const stripped = normalized.replace(/[^a-z0-9]/g, '');
      const wordStripped = cleanWord.replace(/[^a-z0-9]/g, '');

      if (
        rawLower.includes(cleanWord) ||
        normalized.includes(cleanWord) ||
        (wordStripped.length >= 4 && stripped.includes(wordStripped))
      ) {
        return {
          isClean: false,
          matchedWord: word,
          reason: 'Your message was blocked because it contains prohibited language.',
        };
      }
    }
  }

  return { isClean: true };
}

/**
 * Validates a proposed nickname
 */
export function validateNickname(
  nickname: string,
  existingNicknames: string[] = []
): { isValid: boolean; error?: string } {
  if (!nickname) {
    return { isValid: false, error: 'Nickname is required.' };
  }

  const trimmed = nickname.trim();

  if (trimmed.length < 3) {
    return { isValid: false, error: 'Nickname must be at least 3 characters.' };
  }

  if (trimmed.length > 20) {
    return { isValid: false, error: 'Nickname cannot exceed 20 characters.' };
  }

  // Letters, numbers, and underscores only
  const validPattern = /^[a-zA-Z0-9_]+$/;
  if (!validPattern.test(trimmed)) {
    return {
      isValid: false,
      error: 'Nickname can only contain letters, numbers, and underscores.',
    };
  }

  const normalized = trimmed.toLowerCase();

  // Check reserved admin names
  for (const reserved of RESERVED_ADMIN_NAMES) {
    if (normalized === reserved || normalized.startsWith(`${reserved}_`) || normalized.endsWith(`_${reserved}`)) {
      return {
        isValid: false,
        error: 'This nickname is reserved for administrators or system use.',
      };
    }
  }

  // Check bad words
  const profanityCheck = checkProfanity(trimmed);
  if (!profanityCheck.isClean) {
    return {
      isValid: false,
      error: 'Nickname contains inappropriate words.',
    };
  }

  // Check duplicate normalized nicknames
  const isDuplicate = existingNicknames.some(
    existing => existing.toLowerCase().trim() === normalized
  );
  if (isDuplicate) {
    return {
      isValid: false,
      error: 'This nickname is already in use by an active chatter. Please choose another.',
    };
  }

  return { isValid: true };
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
