import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { HiMicrophone, HiOutlineTrash, HiOutlineXMark } from 'react-icons/hi2';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { formatCurrency } from '../../utils/billing';
import {
  parseBestAlternative,
  parseAndMatch,
  SUPPORTS_SPEECH_RECOGNITION,
  SUPPORTS_SPEECH_SYNTHESIS
} from '../../utils/voiceParser';

const LANGUAGES = [
  { code: 'ta-IN', label: 'தமிழ்' },
  { code: 'en-IN', label: 'English' }
];

/**
 * Reads a just-heard phrase back out loud, e.g. "idli 2, dosa 3 கேட்டது" —
 * so the cashier can confirm by ear, without looking down at the screen,
 * that the mic heard that phrase correctly. Called once per finalized
 * phrase (not the whole growing bill) so it doesn't repeat everything
 * said so far every time.
 */
function speakConfirmation(results, langCode) {
  if (!SUPPORTS_SPEECH_SYNTHESIS || results.length === 0) return;
  const heard = results.map((r) => `${r.product ? r.product.name : r.rawName} ${r.qty}`).join(', ');
  const text = langCode === 'ta-IN' ? `கேட்டது: ${heard}` : `Heard: ${heard}`;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = langCode;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export default function VoiceBillingModal({ isOpen, onClose, products, onAddItems }) {
  const [langCode, setLangCode] = useState('ta-IN');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [manualText, setManualText] = useState('');
  const [results, setResults] = useState([]);
  const [micError, setMicError] = useState('');
  const recognitionRef = useRef(null);
  const userStoppedRef = useRef(false); // true once the cashier explicitly taps stop

  const totalToAdd = useMemo(
    () => results.filter((r) => r.product).reduce((sum, r) => sum + r.qty * r.product.sellingPrice, 0),
    [results]
  );
  const matchedCount = results.filter((r) => r.product).length;
  const unmatchedCount = results.length - matchedCount;

  // Appends newly-heard items to the running bill rather than replacing it,
  // so the cashier can keep talking — "idli 2 dosa 3" … pause … "vada 1" —
  // and everything accumulates into one bill without re-tapping the mic.
  const appendResults = (newEntries) => {
    if (newEntries.length === 0) return;
    setResults((prev) => [...prev, ...newEntries]);
    speakConfirmation(newEntries, langCode);
  };

  const runManualParse = (text) => {
    if (!text.trim()) return;
    const parsed = parseAndMatch(text, products);
    appendResults(parsed);
  };

  const stopListening = () => {
    userStoppedRef.current = true;
    recognitionRef.current?.stop();
  };

  const startListening = () => {
    if (!SUPPORTS_SPEECH_RECOGNITION) return;
    setMicError('');
    setTranscript('');
    userStoppedRef.current = false;

    const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionImpl();
    recognition.lang = langCode;
    // Continuous + auto-restart-on-end (below) means the cashier can just
    // keep talking — one phrase after another — building up the whole bill
    // without tapping the mic again between items. Much faster at a counter.
    recognition.continuous = true;
    recognition.interimResults = true;
    // Ask for a few ranked guesses per phrase, not just the top one — the
    // recognizer's #1 guess is often wrong on Tamil food words it has no
    // language model for, but the right reading is frequently in guess #2/#3.
    recognition.maxAlternatives = 4;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event) => {
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const alternatives = [];
          for (let a = 0; a < result.length; a++) alternatives.push(result[a].transcript);
          const best = parseBestAlternative(alternatives, products);
          setTranscript(best.transcript.trim());
          appendResults(best.results);
        } else {
          interimText += result[0].transcript;
        }
      }
      if (interimText.trim()) setTranscript(interimText.trim());
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        setMicError('Microphone permission was denied. Allow mic access in your browser settings and try again.');
        userStoppedRef.current = true; // don't auto-restart into another permission failure
        setIsListening(false);
      } else if (event.error === 'no-speech' || event.error === 'aborted') {
        // Expected in continuous mode during natural pauses — onend will
        // restart it quietly, no need to alarm the cashier with an error.
      } else {
        setMicError('Voice recognition had a problem. You can type the order below instead.');
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // Some browsers end the session on their own after a silence even in
      // continuous mode — restart automatically unless the cashier chose to stop.
      if (!userStoppedRef.current) {
        try {
          recognition.start();
          return;
        } catch {
          // fall through to marking as stopped if restart itself fails
        }
      }
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const toggleListening = () => {
    if (isListening) stopListening();
    else startListening();
  };

  const removeResult = (index) => setResults((prev) => prev.filter((_, i) => i !== index));

  const clearAll = () => setResults([]);

  const updateQty = (index, qty) =>
    setResults((prev) => prev.map((r, i) => (i === index ? { ...r, qty: Math.max(1, qty) } : r)));

  const assignProduct = (index, productId) => {
    const product = products.find((p) => p.id === productId) || null;
    setResults((prev) => prev.map((r, i) => (i === index ? { ...r, product, confidence: 1 } : r)));
  };

  const handleAddAll = () => {
    const toAdd = results.filter((r) => r.product);
    if (toAdd.length === 0) {
      toast.error('No matched items to add yet');
      return;
    }
    onAddItems(toAdd);
    toast.success(`${toAdd.length} item${toAdd.length > 1 ? 's' : ''} added to bill`);
    handleClose();
  };

  const handleClose = () => {
    stopListening();
    window.speechSynthesis?.cancel();
    setTranscript('');
    setManualText('');
    setResults([]);
    setMicError('');
    onClose();
  };

  // Stop the mic if the modal is closed from outside (e.g. Esc / backdrop click).
  useEffect(() => {
    if (!isOpen) stopListening();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Start listening the moment the modal opens — one less tap for every bill.
  useEffect(() => {
    if (isOpen && SUPPORTS_SPEECH_RECOGNITION) startListening();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Voice Billing">
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => {
                setLangCode(l.code);
                if (isListening) {
                  stopListening();
                  setTimeout(startListening, 150);
                }
              }}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                langCode === l.code ? 'bg-brand-500 text-white' : 'bg-brand-50 text-brand-600'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {SUPPORTS_SPEECH_RECOGNITION ? (
          <div className="flex flex-col items-center gap-3 py-2">
            <button
              type="button"
              onClick={toggleListening}
              className={`flex h-20 w-20 items-center justify-center rounded-full shadow-card transition active:scale-95 ${
                isListening ? 'animate-pulse bg-red-500 text-white' : 'bg-brand-500 text-white'
              }`}
              aria-label={isListening ? 'Stop listening' : 'Start listening'}
            >
              <HiMicrophone className="h-9 w-9" />
            </button>
            <p className="text-center text-sm text-gray-500">
              {isListening
                ? langCode === 'ta-IN'
                  ? 'கேட்கிறேன்… சொல்லுங்கள் — முடிந்ததும் நிறுத்தலாம்'
                  : 'Listening… keep going, tap to stop when done'
                : 'Tap the mic and say e.g. "idli 2 dosa 3"'}
            </p>
            {transcript && (
              <p className="rounded-card bg-brand-50 px-3 py-2 text-center text-sm text-brand-700">
                “{transcript}”
              </p>
            )}
            {micError && <p className="text-center text-xs text-red-500">{micError}</p>}
          </div>
        ) : (
          <div className="space-y-2 rounded-card bg-accent-50 p-3 text-sm text-brand-800">
            <p>
              Voice input isn't supported in this browser. Try Chrome or Edge — or type the order below and
              it'll be parsed the same way.
            </p>
            <div className="flex gap-2">
              <input
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder='e.g. "idli 2 dosa 3"'
                className="flex-1 rounded-card border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
              />
              <Button
                className="w-auto px-4"
                size="sm"
                onClick={() => {
                  runManualParse(manualText);
                  setManualText('');
                }}
              >
                Parse
              </Button>
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                {matchedCount} matched{unmatchedCount > 0 ? ` · ${unmatchedCount} not recognised` : ''}
              </p>
              <button
                onClick={clearAll}
                className="flex items-center gap-0.5 text-xs font-medium text-gray-400 active:text-red-500"
              >
                <HiOutlineXMark className="h-3.5 w-3.5" /> Clear all
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {results.map((r, i) => (
                <div
                  key={i}
                  className={`flex flex-col overflow-hidden rounded-card border p-2.5 shadow-card ${
                    r.product ? 'border-brand-100 bg-white' : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <p className="truncate text-sm font-medium text-ink">{r.product ? r.product.name : r.rawName}</p>
                    <button onClick={() => removeResult(i)} className="shrink-0 text-gray-300 active:text-red-500">
                      <HiOutlineTrash className="h-4 w-4" />
                    </button>
                  </div>

                  {r.product ? (
                    <p className="text-xs text-brand-500">{formatCurrency(r.product.sellingPrice)} each</p>
                  ) : (
                    <select
                      onChange={(e) => assignProduct(i, e.target.value)}
                      defaultValue=""
                      className="mt-1 w-full rounded-lg border border-red-200 bg-white px-1.5 py-1 text-xs"
                    >
                      <option value="" disabled>
                        Didn't recognise "{r.rawName}" — pick one?
                      </option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  )}

                  <div className="mt-1.5 flex items-center justify-center gap-2">
                    <button
                      onClick={() => updateQty(i, r.qty - 1)}
                      className="h-6 w-6 rounded-full bg-brand-50 text-sm font-bold text-brand-600 active:bg-brand-100"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">{r.qty}</span>
                    <button
                      onClick={() => updateQty(i, r.qty + 1)}
                      className="h-6 w-6 rounded-full bg-brand-50 text-sm font-bold text-brand-600 active:bg-brand-100"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button onClick={handleAddAll} disabled={matchedCount === 0}>
          {matchedCount > 0 ? `Add ${matchedCount} item${matchedCount > 1 ? 's' : ''} · ${formatCurrency(totalToAdd)}` : 'Add to bill'}
        </Button>
      </div>
    </Modal>
  );
}
