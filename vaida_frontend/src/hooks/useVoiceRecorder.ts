import { useState, useCallback, useRef } from 'react';

interface VoiceRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioBlob: Blob | null;
  waveformData: number[];
  error: string | null;
}

export function useVoiceRecorder() {
  const [state, setState] = useState<VoiceRecorderState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioBlob: null,
    waveformData: [],
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);

  const updateWaveform = useCallback(() => {
    if (!analyserRef.current) return;
    const buf = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteTimeDomainData(buf);
    const samples = 40;
    const step = Math.floor(buf.length / samples);
    const data: number[] = [];
    for (let i = 0; i < samples; i++) {
      const val = (buf[i * step] - 128) / 128;
      data.push(Math.abs(val));
    }
    setState(s => ({ ...s, waveformData: data }));
    animFrameRef.current = requestAnimationFrame(updateWaveform);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
      });

      const ac = new AudioContext();
      const source = ac.createMediaStreamSource(stream);
      const analyser = ac.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioContextRef.current = ac;
      analyserRef.current = analyser;

      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setState(s => ({ ...s, audioBlob: blob, isRecording: false }));
        stream.getTracks().forEach(t => t.stop());
        cancelAnimationFrame(animFrameRef.current);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(100);

      setState(s => ({ ...s, isRecording: true, duration: 0, error: null, audioBlob: null }));

      const startTime = Date.now();
      const tick = () => {
        if (mediaRecorderRef.current?.state === 'recording') {
          setState(s => ({ ...s, duration: Math.floor((Date.now() - startTime) / 1000) }));
          timerRef.current = window.setTimeout(tick, 1000);
        }
      };
      tick();
      updateWaveform();
    } catch (err) {
      setState(s => ({ ...s, error: 'Microphone access denied' }));
    }
  }, [updateWaveform]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    clearTimeout(timerRef.current);
    audioContextRef.current?.close();
  }, []);

  const resetRecording = useCallback(() => {
    setState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      audioBlob: null,
      waveformData: [],
      error: null,
    });
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    resetRecording,
  };
}
