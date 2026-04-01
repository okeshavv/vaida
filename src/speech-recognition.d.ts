/** Web Speech API (browser-specific; not always in DOM lib typings). */
export {};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }

  interface SpeechRecognitionLike {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: ((ev: SpeechRecognitionResultLike) => void) | null;
    onend: (() => void) | null;
    onerror: (() => void) | null;
  }

  interface SpeechRecognitionResultLike {
    results: Array<{ 0: { transcript: string }; length: number }>;
  }
}
