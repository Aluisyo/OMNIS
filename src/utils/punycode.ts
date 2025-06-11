import { toUnicode } from 'punycode';

/**
 * Decode Punycode domain label to Unicode (e.g., emojis, non-latin chars).
 * Falls back to original if decoding fails.
 */
export function decodeName(name: string): string {
  try {
    return toUnicode(name);
  } catch {
    return name;
  }
}
