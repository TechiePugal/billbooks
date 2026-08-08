/**
 * Turns a spoken phrase like "idli 2 dosa 3" or "இரண்டு இட்லி மூணு தோசை"
 * (or "rendu idli moonu dosa" — Tamil numbers typed/heard in Latin letters,
 * extremely common with Indian cashiers) into structured { rawName, qty }
 * pairs, then matches each rawName against the shop's product list
 * (including any owner-entered voice aliases), across scripts.
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

// Romanized Tamil ("Tanglish") number words — how Tamil numbers actually come
// out when spoken and picked up by an English-mode recognizer, or typed by
// someone used to WhatsApp-style Tamil. This is the single biggest accuracy
// gap the old parser had: it only understood Tamil-*script* number words.
const NUMBER_WORDS_TANGLISH = {
  onnu: 1, ondru: 1, oru: 1, onnuh: 1,
  rendu: 2, rendhu: 2, erandu: 2, irandu: 2, iru: 2,
  moonu: 3, moonru: 3, munu: 3,
  naalu: 4, naangu: 4, nangu: 4,
  anju: 5, aindhu: 5, ainthu: 5,
  aaru: 6, aru: 6,
  ezhu: 7, yezhu: 7, elu: 7, yelu: 7,
  ettu: 8, yettu: 8,
  onbathu: 9, onpathu: 9, ombathu: 9, onbadhu: 9,
  pathu: 10, patthu: 10,
  irupathu: 20,
  muppathu: 30
};

// Tamil-script number words — formal written forms and the informal spoken
// forms a shop cashier is far more likely to actually use.
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
  'ஒன்பது': 9, 'ஒம்பது': 9,
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
  if (Object.prototype.hasOwnProperty.call(NUMBER_WORDS_TANGLISH, lower)) return NUMBER_WORDS_TANGLISH[lower];
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

// ---------------------------------------------------------------------------
// Tamil-script → Latin transliteration, so a spoken/typed Tamil-script word
// can be fuzzy-matched against an English product name (and vice versa).
// This is approximate (not full ISO-15919), but tuned to match the way
// Tamil food words are actually spelled in Tanglish day-to-day — including
// the intervocalic voicing rule (த/ட/ப/க soften to dh/d/b/g mid-word), which
// is what makes "தோசை" transliterate to "thosai" and "இட்லி" come out as
// "idli" instead of a stiffer, literal "itli".
// ---------------------------------------------------------------------------

const TAMIL_VOWELS = {
  'அ': 'a', 'ஆ': 'aa', 'இ': 'i', 'ஈ': 'ii', 'உ': 'u', 'ஊ': 'uu',
  'எ': 'e', 'ஏ': 'ee', 'ஐ': 'ai', 'ஒ': 'o', 'ஓ': 'oo', 'ஔ': 'au'
};

const TAMIL_VOWEL_SIGNS = {
  'ா': 'aa', 'ி': 'i', 'ீ': 'ii', 'ு': 'u', 'ூ': 'uu',
  'ெ': 'e', 'ே': 'ee', 'ை': 'ai', 'ொ': 'o', 'ோ': 'oo', 'ௌ': 'au'
};

// Colloquial Tanglish rarely preserves vowel length in spelling ("தோசை" is
// written "dosai", not "doosai") — a second, length-collapsed vowel table
// used to generate an alternate transliteration variant for matching.
const TAMIL_VOWELS_COLLAPSED = {
  'அ': 'a', 'ஆ': 'a', 'இ': 'i', 'ஈ': 'i', 'உ': 'u', 'ஊ': 'u',
  'எ': 'e', 'ஏ': 'e', 'ஐ': 'ai', 'ஒ': 'o', 'ஓ': 'o', 'ஔ': 'au'
};

const TAMIL_VOWEL_SIGNS_COLLAPSED = {
  'ா': 'a', 'ி': 'i', 'ீ': 'i', 'ு': 'u', 'ூ': 'u',
  'ெ': 'e', 'ே': 'e', 'ை': 'ai', 'ொ': 'o', 'ோ': 'o', 'ௌ': 'au'
};

const PULLI = '\u0BCD';

// Consonants that don't change sound based on position.
const TAMIL_CONSONANTS_FIXED = {
  'ங': 'ng', 'ஞ': 'ny', 'ண': 'n', 'ந': 'n', 'ம': 'm', 'ய': 'y', 'ர': 'r',
  'ல': 'l', 'வ': 'v', 'ழ': 'zh', 'ள': 'l', 'ற': 'r', 'ன': 'n',
  'ஜ': 'j', 'ஷ': 'sh', 'ஸ': 's', 'ஹ': 'h'
};

// Consonants that voice (soften) when they occur mid-word rather than at the
// start of a word — real Tamil phonology, and the reason "தோசை" should
// transliterate to "thosai" (voiced ச→s), not a stiffer literal form.
const TAMIL_CONSONANTS_INITIAL = { 'க': 'k', 'ச': 'ch', 'ட': 't', 'த': 'th', 'ப': 'p' };
const TAMIL_CONSONANTS_MEDIAL = { 'க': 'g', 'ச': 's', 'ட': 'd', 'த': 'dh', 'ப': 'b' };

const TAMIL_CHAR_RE = /[\u0B80-\u0BFF]/;

/**
 * @param {string} str
 * @param {{ voiceInitial?: boolean, collapseVowels?: boolean }} opts
 *   voiceInitial: also soften the word's FIRST consonant (த/ட/ப/க/ச), matching
 *     the common English loanword spelling ("dosa", not the phonetically
 *     stricter "thosa") rather than strict Tamil word-initial phonology.
 *   collapseVowels: drop long/short vowel distinctions ("dosai" not "doosai"),
 *     matching how these words are actually spelled day-to-day.
 */
function transliterateTamil(str, { voiceInitial = false, collapseVowels = false } = {}) {
  if (!str || !TAMIL_CHAR_RE.test(str)) return str || '';

  const vowels = collapseVowels ? TAMIL_VOWELS_COLLAPSED : TAMIL_VOWELS;
  const vowelSigns = collapseVowels ? TAMIL_VOWEL_SIGNS_COLLAPSED : TAMIL_VOWEL_SIGNS;
  const chars = [...str];
  let out = '';

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];

    if (vowels[ch]) {
      out += vowels[ch];
      continue;
    }

    if (ch === PULLI) continue; // stray pulli with no preceding consonant — ignore

    const isConsonant = TAMIL_CONSONANTS_FIXED[ch] || TAMIL_CONSONANTS_INITIAL[ch];
    if (isConsonant) {
      const wordStart = i === 0 || chars[i - 1] === ' ';
      const useVoiced = !wordStart || voiceInitial;
      const base = TAMIL_CONSONANTS_FIXED[ch]
        ?? (useVoiced ? TAMIL_CONSONANTS_MEDIAL[ch] : TAMIL_CONSONANTS_INITIAL[ch]);
      const next = chars[i + 1];

      if (next === PULLI) {
        // Geminate consonant (e.g. ப்ப in "சப்பாத்தி"): the pulli'd letter is
        // silent — Tamil doubles the consonant for a slight emphasis, but
        // spelling it out twice ("chabbaadhdhi") drifts far from how it's
        // actually written ("chapathi"). Skip emitting the silent half; the
        // repeated letter right after carries the sound.
        const isGeminate = chars[i + 2] === ch;
        if (!isGeminate) out += base;
        i++;
      } else if (next && vowelSigns[next]) {
        out += base + vowelSigns[next];
        i++;
      } else {
        out += base + 'a';
      }
      continue;
    }

    if (ch === ' ') {
      out += ' ';
    } else if (!TAMIL_CHAR_RE.test(ch)) {
      out += ch; // pass through digits / Latin characters already in the string
    }
    // else: unmapped Tamil glyph (rare grantha combos) — skip rather than guess wrong
  }

  return out;
}

// Generates a small set of plausible Latin spellings for a Tamil-script
// string, covering the "strict phonology" vs "common loanword spelling"
// and "long vowel" vs "collapsed vowel" ambiguities — rather than betting on
// one single romanization being right.
function transliterateVariants(str) {
  if (!str || !TAMIL_CHAR_RE.test(str)) return [str || ''];
  return [...new Set([
    transliterateTamil(str),
    transliterateTamil(str, { voiceInitial: true }),
    transliterateTamil(str, { collapseVowels: true }),
    transliterateTamil(str, { voiceInitial: true, collapseVowels: true })
  ])];
}

function normalize(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFC')
    // Explicit character ranges instead of \p{L}/\p{N} Unicode property
    // escapes: those aren't supported by every JS engine still in use on
    // budget/older Android phones, and a regex literal that fails to even
    // *parse* breaks the entire file — and with it, the whole app. Covers
    // Latin, digits, and the Tamil Unicode block (voice input only ever
    // needs to normalize Latin/Tamil text here).
    .replace(/[^a-z0-9\u0B80-\u0BFF\s]/g, '')
    .trim();
}

// All plausible normalized forms of a string: itself, plus (if it contains
// Tamil script) every transliteration variant. For a pure-Latin string this
// is just [itself] — harmless, the cross-script comparisons are simply
// redundant-but-cheap for English words.
function allForms(str) {
  const forms = [normalize(str), ...transliterateVariants(str).map(normalize)];
  return [...new Set(forms)].filter(Boolean);
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

function pairScore(candidateNorm, targetNorm) {
  if (!candidateNorm || !targetNorm) return 0;
  if (candidateNorm === targetNorm) return 1;
  if (candidateNorm.includes(targetNorm) || targetNorm.includes(candidateNorm)) return 0.85;
  return similarity(candidateNorm, targetNorm) * 0.75; // cap fuzzy matches below substring matches
}

function candidateNamesForProduct(product) {
  const aliases = (product.voiceAliases || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return [product.name, ...aliases].filter(Boolean);
}

/**
 * Matches a spoken item name against the product list — trying the raw
 * (native-script) form AND a Tamil→Latin transliterated form on both sides,
 * so "இட்லி" matches a product named "Idli" and "dosai" matches a product
 * named "தோசை", not just matches within the same script.
 *
 * @returns {{product: object, score: number} | null}
 */
export function matchProduct(rawName, products) {
  const targetForms = allForms(rawName);
  if (targetForms.length === 0) return null;

  let best = null;

  for (const product of products) {
    for (const candidateRaw of candidateNamesForProduct(product)) {
      const candidateForms = allForms(candidateRaw);
      let score = 0;
      for (const c of candidateForms) {
        for (const t of targetForms) {
          const s = pairScore(c, t);
          if (s > score) score = s;
        }
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

/**
 * Given several alternative transcripts for the SAME utterance (the speech
 * recognizer's ranked guesses), parses and matches each one against the
 * product list and returns the results for whichever alternative actually
 * matched the shop's products best. The recognizer's #1 guess is often
 * wrong on Tamil food words it has no language model for — but the correct
 * reading is frequently sitting right there in alternative #2 or #3.
 *
 * @param {string[]} transcripts
 * @param {object[]} products
 */
export function parseBestAlternative(transcripts, products) {
  let best = { transcript: transcripts[0] || '', results: [], score: -1 };

  for (const transcript of transcripts) {
    if (!transcript?.trim()) continue;
    const results = parseAndMatch(transcript, products);
    // Reward both how confident the matches are AND how many items matched —
    // an alternative that recognises 2 items decently beats one that
    // recognises 1 item perfectly and mangles the rest.
    const score = results.reduce((sum, r) => sum + (r.product ? 0.5 + r.confidence : 0), 0);
    if (score > best.score) best = { transcript, results, score };
  }

  return best;
}

export const SUPPORTS_SPEECH_RECOGNITION =
  typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

export const SUPPORTS_SPEECH_SYNTHESIS =
  typeof window !== 'undefined' && !!window.speechSynthesis;
