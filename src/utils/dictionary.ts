const GAMING_PHRASES: Array<[RegExp, string]> = [
  // Hero-shooter callouts
  [/^heal\b/i, 'need heals'],
  [/^hill\b/i, 'need heals'],
  [/^heel\b/i, 'need heals'],
  [/^heals\b/i, 'need heals'],
  [/^nead\b/i, 'need'],
  [/^ult\b|^ultimate\b/i, 'ult ready'],
  [/^reloading\b|^reload\b/i, 'reloading'],
  [/^pish\b|^posh\b/i, 'push'],
  [/^enemy\s+left\b/i, 'left'],
  [/^enemy\s+right\b/i, 'right'],
  [/^enemy\s+mid\b/i, 'mid'],
  [/^enemy\s+behind\b/i, 'behind us'],
  [/^behind\s+you\b/i, 'behind you'],
  [/^help\b/i, 'need help'],
  [/^retreat\b/i, 'fall back'],
  [/^coming\b/i, 'on my way'],
  [/^half\s+hp\b/i, 'one'],
  [/^low\s+hp\b/i, 'one shot'],
  [/^group\s+up\b/i, 'group up'],
  [/^support\s+down\b/i, 'support down'],
  [/^healer\s+down\b/i, 'healer down'],
  [/^tank\s+down\b/i, 'tank down'],
  [/^spread\s+out\b/i, 'spread out'],
  [/^contest\b/i, 'contest'],
  [/^on\s+my\s+way\b/i, 'on my way'],
  [/^back\s+up\b/i, 'back up'],
  [/^over\s+there\b/i, 'over there'],

  // Greetings / common
  [/whatsop/i, "what's up"],
  [/wassup/i, "what's up"],
  [/^hey\b/i, 'hey'],
  [/^hi\b/i, 'hi'],
  [/^yo\b/i, 'yo'],
  [/^gg(s)?\b/i, 'gg'],
  [/^good\s+game\b/i, 'good game'],
  [/^let['']?s?\s+go\b/i, "let's go"],

  // Contractions and common speech-to-text fixes
  [/\bim\b/i, "I'm"],
  [/\bdont\b/i, "don't"],
  [/\bcant\b/i, "can't"],
  [/\bwont\b/i, "won't"],
  [/\bid\b/i, "I'd"],
  [/\bive\b/i, "I've"],
  [/\byoure\b/i, "you're"],
  [/\btheyre\b/i, "they're"],
  [/\bthats\b/i, "that's"],
  [/\bwhats\b/i, "what's"],
  [/\bwassup\b/i, "what's up"],
  [/\bgonna\b/i, 'going to'],
  [/\bwanna\b/i, 'want to'],
  [/\bgotta\b/i, 'got to'],
]

export function normalizeTranscript(text: string): string {
  let result = text.trim();

  for (const [pattern, replacement] of GAMING_PHRASES) {
    result = result.replace(pattern, replacement);
  }

  result = result.replace(/\s+/g, ' ').trim();
  if (!result) return result;

  result = result.charAt(0).toUpperCase() + result.slice(1);

  if (!/[.!?]$/.test(result)) {
    result += '.';
  }

  return result;
}
