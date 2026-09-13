import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The counter microphone.
 *
 * Transcription runs in the browser, on the device, through the Web Speech API.
 * No audio ever leaves the phone and there is no service to pay for, which is
 * both the fastest thing to build and the only version a shopkeeper would leave
 * switched on all day next to a till.
 *
 * Support is uneven — Chrome and Edge have it, Firefox does not, iOS Safari is
 * unreliable — so `isSupported` is reported rather than assumed. The screen
 * that uses this falls back to a text box that posts to the same endpoint, so
 * the feature works on every device and in a shop too loud to dictate in.
 */

const SpeechRecognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : undefined;

export function useSpeechRecognition({ lang = 'hi-IN', onResult } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  // Held in a ref so restarting the recogniser does not need a new callback
  // identity, which would tear down and rebuild it on every render.
  const onResultRef = useRef(onResult);
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);

  const isSupported = Boolean(SpeechRecognition);

  useEffect(() => {
    if (!isSupported) return undefined;

    const recognition = new SpeechRecognition();
    // Hindi with a Latin-script fallback is what a Hinglish counter sale
    // actually sounds like; the parser accepts either spelling.
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let finalText = '';
      let pending = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else pending += result[0].transcript;
      }
      setInterim(pending);
      if (finalText.trim()) {
        setInterim('');
        onResultRef.current?.(finalText.trim());
      }
    };

    recognition.onerror = (event) => {
      // `no-speech` and `aborted` are the user saying nothing or stopping;
      // surfacing those as failures would make the button feel broken.
      if (event.error === 'no-speech' || event.error === 'aborted') {
        setIsListening(false);
        return;
      }
      setError(
        event.error === 'not-allowed'
          ? 'Mic ki permission nahi mili. Browser settings mein allow karein.'
          : 'Mic se sun nahi paaye. Neeche type kar sakte hain.',
      );
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterim('');
    };

    recognitionRef.current = recognition;
    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.abort();
      } catch {
        // Already stopped; nothing to unwind.
      }
      recognitionRef.current = null;
    };
  }, [isSupported, lang]);

  const start = useCallback(() => {
    if (!recognitionRef.current || isListening) return;
    setError(null);
    setInterim('');
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      // Calling start() twice throws; the recogniser is already running.
      setIsListening(true);
    }
  }, [isListening]);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {
      // Already stopped.
    }
    setIsListening(false);
  }, []);

  return { isSupported, isListening, interim, error, start, stop, clearError: () => setError(null) };
}
