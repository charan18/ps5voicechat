const GAMING_PHRASES: Array<[RegExp, string]> = [
  // Common misrecognitions
  [/^heal\b/i, 'need heals'],
  [/^hill\b/i, 'need heals'],
  [/^heel\b/i, 'need heals'],
  [/^nead\b/i, 'need'],
  [/^ult\b|^ultimate\b/i, 'ult ready'],
  [/^reloading\b|^reload\b/i, 'reloading'],
  [/^left flank\b/i, 'left'],
  [/^right flank\b/i, 'right'],
  [/^pish\b|^posh\b/i, 'push'],
  [/^enemy\s+left\b/i, 'left'],
  [/^enemy\s+right\b/i, 'right'],
  [/^enemy\s+mid\b/i, 'mid'],
  [/^behind\s+you\b/i, 'behind you'],
  [/^help\b/i, 'need help'],
  [/^retreat\b/i, 'fall back'],
  [/^coming\b/i, 'on my way'],
  [/^half\s+hp\b/i, 'one'],
  [/^low\s+hp\b/i, 'one shot'],
  [/^group\s+up\b/i, 'group up'],

  // "whatsup" type fixes
  [/whatsop/i, "what's up"],
  [/wassup/i, "what's up"],
  [/^hey\b/i, 'hey'],
]

export function normalizeTranscript(text: string): string {
  let result = text;

  for (const [pattern, replacement] of GAMING_PHRASES) {
    result = result.replace(pattern, replacement);
  }

  return result.trim();
}