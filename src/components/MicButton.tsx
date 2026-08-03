'use client';

import { useEffect, useRef, useState } from 'react';

/* Dictation for the evidence box via the browser's own Web Speech API.
   No audio leaves the page except to the browser vendor's recognizer.
   Where the API does not exist (iOS Safari), a keyboard-mic tip renders
   instead, so the dictation path exists on every phone. */

type Rec = {
  lang: string; continuous: boolean; interimResults: boolean;
  start: () => void; stop: () => void;
  onresult: ((e: { resultIndex: number; results: { isFinal: boolean; 0: { transcript: string } }[] }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
};

export default function MicButton({ onText }: { onText: (t: string) => void }) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [denied, setDenied] = useState(false);
  const recRef = useRef<Rec | null>(null);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) { setSupported(false); return; }
    setSupported(true);
    const rec = new Ctor();
    rec.lang = 'en-US';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let pending = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) onText(e.results[i][0].transcript.trim());
        else pending += e.results[i][0].transcript;
      }
      setInterim(pending.trim());
    };
    rec.onend = () => { setListening(false); setInterim(''); };
    rec.onerror = (e) => {
      if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed') setDenied(true);
      setListening(false); setInterim('');
    };
    recRef.current = rec;
    return () => { try { rec.stop(); } catch { /* already stopped */ } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (supported === null) return null;
  if (!supported) {
    return <span className="tiny">Tip: your keyboard&apos;s mic key dictates into the box.</span>;
  }
  if (denied) {
    return <span className="tiny">Mic blocked in browser settings. Your keyboard&apos;s mic key still works.</span>;
  }

  const toggle = () => {
    const rec = recRef.current;
    if (!rec) return;
    if (listening) { rec.stop(); setListening(false); }
    else { try { rec.start(); setListening(true); } catch { /* double-start */ } }
  };

  return (
    <span className="rowline" style={{ gap: 8 }}>
      <button
        type="button"
        className="micbtn"
        data-on={listening ? '1' : undefined}
        onClick={toggle}
        aria-pressed={listening}
        aria-label={listening ? 'Stop dictating' : 'Dictate your answer'}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/>
        </svg>
        {listening ? 'Listening… tap to stop' : 'Speak instead'}
      </button>
      {listening && interim ? (
        <em className="tiny" aria-hidden="true" style={{ fontStyle: 'italic' }}>{interim}…</em>
      ) : null}
    </span>
  );
}
