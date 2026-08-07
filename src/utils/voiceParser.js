/**
 * Turns a spoken phrase like "idli 2 dosa 3" or "இரண்டு இட்லி மூணு தோசை"
 * into structured { rawName, qty } pairs, then matches each rawName against
 * the shop's product list (including any owner-entered voice aliases).
 *
 * This is a best-effort parser, not a full NLU pipeline — it's tuned for the
 * short, transactional phrases a cashier actually says at a counter
 * ("<item> <qty>" or "<qty> <item>", repeated), not free-form sentences.
 */

// English number words a cashier might say instead of digits.
const NUMBER_WORDS_EN = {
  zero: 0, one: 1, two: 2, to: 2, too: 2, three: 3, four: 4, for: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  dozen: 12, half: 0.5, single: 1, pair: 2, couple: 2
};

// Tamil number words — both the "formal" written forms and the informal
// spoken forms a shop cashier is far more likely to actually use.
const NUMBER_WORDS_TA = {
  'பூஜ்ஜியம்': 0,
  'ஒன்று': 1, 'ஒண்ணு': 1, 'ஒரு': 1,
  'இரண்டு': 2, 'ரெண்டு': 2, 'ரெண்ட': 2,
  'மூன்று': 3, 'மூணு': 3,
  'நான்கு': 4, 'நாலு': 4,
  'ஐந்து': 5, 'அஞ்சு': 5,
  'ஆறு': 6,
  'ஏழு': 7,
  'எட்டு': 8,
  'ஒன்பது': 9, 'ஒம்பது': 9, 'ஒன்பது': 9,
  'பத்து': 10, 'பத்த': 10,
  'இருபது': 20,
  'முப்பது': 30
};

// Tamil digit glyphs (௦-௯), in case the recognizer emits these instead of words.
const TAMIL_DIGITS = { '௦': '0', '௧': '1', '௨': '2', '௩': '3', '௪': '4', '௫': '5', '௬': '6', '௭': '7', '௮': '8', '௯': '9' };

function tamilDigitsToArabic(token) {
  if (![...token].some((ch) => TAMIL_DIGITS[ch])) return token;
  return [...token].map((ch) => TAMIL_DIGITS[ch] ?? ch).join('');
}

function parseNumberToken(rawToken) {
  const token = tamilDigitsToArabic(rawToken.trim());
  const clean = token.replace(/[.,]/g, '');
  if (clean === '') return null;
  if (/^\d+(\.\d+)?$/.test(clean)) return Number(clean);
  const lower = clean.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(NUMBER_WORDS_EN, lower)) return NUMBER_WORDS_EN[lower];
  if (Object.prototype.hasOwnProperty.call(NUMBER_WORDS_TA, clean)) return NUMBER_WORDS_TA[clean];
  return null;
}

function tokenize(text) {
  return text
    .replace(/[!?.।]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

// Collapse consecutive tokens of the same kind ("word"/"num") into runs, so
// "chicken 65 2" groups as [word: "chicken 65", num: 2] rather than treating
// "65" as a quantity that splits the item name.
function toSegments(tokens) {
  const segments = [];
  for (const token of tokens) {
    const num = parseNumberToken(token);
    const type = num != null ? 'num' : 'word';
    const last = segments[segments.length - 1];
    if (last && last.type === type) {
      last.tokens.push(token);
      if (type === 'num') last.value = num; // last number in a run wins
    } else {
      segments.push({ type, tokens: [token], value: type === 'num' ? num : null });
    }
  }
  return segments;
}

/**
 * @param {string} transcript
 * @returns {{ rawName: string, qty: number }[]}
 */
export function parseVoiceTranscript(transcript) {
  if (!transcript?.trim()) return [];
  const segments = toSegments(tokenize(transcript));
  if (segments.length === 0) return [];

  const results = [];
  // A whole utterance is almost always spoken consistently as either
  // "<item> <qty>, <item> <qty>…" or "<qty> <item>, <qty> <item>…" —
  // people don't usually switch order mid-sentence — so we detect which
  // pattern this utterance uses from its first segment and apply it throughout.
  const numberFirst = segments[0].type === 'num';

  if (numberFirst) {
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (seg.type === 'num' && segments[i + 1]?.type === 'word') {
        results.push({ rawName: segments[i + 1].tokens.join(' '), qty: seg.value });
        i++;
      } else if (seg.type === 'word') {
        results.push({ rawName: seg.tokens.join(' '), qty: 1 });
      }
    }
  } else {
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (seg.type !== 'word') continue;
      const next = segments[i + 1];
      const qty = next?.type === 'num' ? next.value : 1;
      results.push({ rawName: seg.tokens.join(' '), qty });
      if (next?.type === 'num') i++;
    }
  }

  return results.filter((r) => r.qty > 0);
}

function normalize(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim();
}

// Simple Levenshtein edit distance, used only as a last-resort fuzzy fallback
// for near-miss speech recognition (e.g. "dosai" heard as "dosa").
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function similarity(a, b) {
  if (!a || !b) return 0;
  const distance = levenshtein(a, b);
  return 1 - distance / Math.max(a.length, b.length);
}

function candidateNamesForProduct(product) {
  const aliases = (product.voiceAliases || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return [product.name, ...aliases].filter(Boolean).map((name) => ({ raw: name, norm: normalize(name) }));
}

/**
 * Matches a spoken item name against the product list. Tries, in order:
 * exact match, substring match, then fuzzy (edit-distance) match — against
 * both the product's name and any owner-entered voice aliases.
 *
 * @returns {{product: object, score: number} | null}
 */
export function matchProduct(rawName, products) {
  const target = normalize(rawName);
  if (!target) return null;

  let best = null;

  for (const product of products) {
    for (const candidate of candidateNamesForProduct(product)) {
      if (!candidate.norm) continue;

      let score = 0;
      if (candidate.norm === target) {
        score = 1;
      } else if (candidate.norm.includes(target) || target.includes(candidate.norm)) {
        score = 0.85;
      } else {
        score = similarity(candidate.norm, target) * 0.75; // cap fuzzy matches below substring matches
      }

      if (!best || score > best.score) {
        best = { product, score };
      }
    }
  }

  // Below this, it's more likely a false match than a real one — surface it
  // to the cashier as "not recognised" instead of silently guessing wrong.
  const MIN_CONFIDENCE = 0.45;
  return best && best.score >= MIN_CONFIDENCE ? best : null;
}

/**
 * Full pipeline: transcript → parsed (item, qty) pairs → matched products.
 * Every entry is returned, matched or not, so the UI can show what the mic
 * heard even when it couldn't find a matching product.
 */
export function parseAndMatch(transcript, products) {
  return parseVoiceTranscript(transcript).map((entry) => {
    const match = matchProduct(entry.rawName, products);
    return {
      rawName: entry.rawName,
      qty: entry.qty,
      product: match?.product ?? null,
      confidence: match?.score ?? 0
    };
  });
}

export const SUPPORTS_SPEECH_RECOGNITION =
  typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

export const SUPPORTS_SPEECH_SYNTHESIS =
  typeof window !== 'undefined' && !!window.speechSynthesis;
