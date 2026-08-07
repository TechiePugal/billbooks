import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { HiMicrophone, HiOutlineTrash } from 'react-icons/hi2';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { formatCurrency } from '../../utils/billing';
import {
  parseAndMatch,
  SUPPORTS_SPEECH_RECOGNITION,
  SUPPORTS_SPEECH_SYNTHESIS
} from '../../utils/voiceParser';

const LANGUAGES = [
  { code: 'ta-IN', label: 'தமிழ்' },
  { code: 'en-IN', label: 'English' }
];

/**
 * Reads the parsed items back out loud in the chosen language, e.g.
 * "idli 2, dosa 3 கேட்டது" — so the cashier can confirm by ear, without
 * looking down at the screen, that the mic heard the order correctly.
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

  const totalToAdd = useMemo(
    () => results.filter((r) => r.product).reduce((sum, r) => sum + r.qty * r.product.sellingPrice, 0),
    [results]
  );
  const matchedCount = results.filter((r) => r.product).length;
  const unmatchedCount = results.length - matchedCount;

  const runParse = (text) => {
    if (!text.trim()) return;
    const parsed = parseAndMatch(text, products);
    setResults(parsed);
    if (parsed.length > 0) speakConfirmation(parsed, langCode);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  const startListening = () => {
    if (!SUPPORTS_SPEECH_RECOGNITION) return;
    setMicError('');
    setTranscript('');
    setResults([]);

    const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionImpl();
    recognition.lang = langCode;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      for (let i = 0; i < event.results.length; i++) {
        const chunk = event.results[i];
        if (chunk.isFinal) finalText += chunk[0].transcript;
        else interimText += chunk[0].transcript;
      }
      const combined = (finalText || interimText).trim();
      setTranscript(combined);
      if (finalText.trim()) runParse(finalText.trim());
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        setMicError('Microphone permission was denied. Allow mic access in your browser settings and try again.');
      } else if (event.error === 'no-speech') {
        setMicError('Didn\u2019t catch that — try again, a bit closer to the mic.');
      } else {
        setMicError('Voice recognition had a problem. You can type the order below instead.');
      }
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  const toggleListening = () => {
    if (isListening) stopListening();
    else startListening();
  };

  const removeResult = (index) => setResults((prev) => prev.filter((_, i) => i !== index));

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

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Voice Billing">
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => setLangCode(l.code)}
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
                  ? 'கேட்கிறேன்… சொல்லுங்கள்'
                  : 'Listening… speak now'
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
              <Button className="w-auto px-4" size="sm" onClick={() => runParse(manualText)}>
                Parse
              </Button>
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              {matchedCount} matched{unmatchedCount > 0 ? ` · ${unmatchedCount} not recognised` : ''}
            </p>
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
