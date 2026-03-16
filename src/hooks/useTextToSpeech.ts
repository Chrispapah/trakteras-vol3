import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const STREAM_MIME_TYPE = 'audio/mpeg';

const cleanTextForSpeech = (text: string) =>
  text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`[^`]+`/g, '')
    .trim()
    .slice(0, 3000);

export function useTextToSpeech() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const cleanupAudio = useCallback((clearMessageId = true) => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

    if (audioRef.current) {
      audioRef.current.onplay = null;
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
      audioRef.current = null;
    }

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    setIsPlaying(false);
    setIsLoading(false);

    if (clearMessageId) {
      setCurrentMessageId(null);
    }
  }, []);

  const attachAudioHandlers = useCallback((audio: HTMLAudioElement, messageId: string) => {
    audio.volume = 1.0;
    audio.onplay = () => {
      setIsLoading(false);
      setIsPlaying(true);
      setCurrentMessageId(messageId);
    };
    audio.onended = () => {
      cleanupAudio(true);
    };
    audio.onerror = (event) => {
      console.error('Audio playback error:', event);
      cleanupAudio(true);
    };
  }, [cleanupAudio]);

  const playBlobAudio = useCallback(async (response: Response, messageId: string) => {
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    audioRef.current = audio;
    audioUrlRef.current = audioUrl;
    attachAudioHandlers(audio, messageId);

    await audio.play();
  }, [attachAudioHandlers]);

  const playStreamingAudio = useCallback(async (response: Response, messageId: string, signal: AbortSignal) => {
    if (
      typeof MediaSource === 'undefined' ||
      !MediaSource.isTypeSupported(STREAM_MIME_TYPE) ||
      !response.body
    ) {
      await playBlobAudio(response, messageId);
      return;
    }

    const mediaSource = new MediaSource();
    const audioUrl = URL.createObjectURL(mediaSource);
    const audio = new Audio(audioUrl);
    const reader = response.body.getReader();

    audioRef.current = audio;
    audioUrlRef.current = audioUrl;
    attachAudioHandlers(audio, messageId);

    await new Promise<void>((resolve, reject) => {
      let sourceBuffer: SourceBuffer | null = null;
      let streamEnded = false;
      let playbackStarted = false;
      const pendingChunks: Uint8Array[] = [];

      const finishStream = () => {
        if (!sourceBuffer?.updating && pendingChunks.length === 0 && mediaSource.readyState === 'open') {
          try {
            mediaSource.endOfStream();
          } catch (error) {
            console.warn('Unable to finalize audio stream:', error);
          }
          resolve();
        }
      };

      const appendNextChunk = () => {
        if (!sourceBuffer || sourceBuffer.updating || pendingChunks.length === 0) {
          if (streamEnded) {
            finishStream();
          }
          return;
        }

        sourceBuffer.appendBuffer(pendingChunks.shift()!);
      };

      const startPlaybackIfPossible = async () => {
        if (playbackStarted || audio.buffered.length === 0) {
          return;
        }

        playbackStarted = true;
        await audio.play();
      };

      const onSourceOpen = async () => {
        try {
          sourceBuffer = mediaSource.addSourceBuffer(STREAM_MIME_TYPE);

          sourceBuffer.addEventListener('updateend', () => {
            void startPlaybackIfPossible()
              .then(() => {
                appendNextChunk();
              })
              .catch(reject);
          });

          sourceBuffer.addEventListener('error', () => {
            reject(new Error('Audio buffering failed.'));
          });

          while (true) {
            const { done, value } = await reader.read();

            if (signal.aborted) {
              resolve();
              return;
            }

            if (done) {
              streamEnded = true;
              finishStream();
              return;
            }

            if (value?.length) {
              pendingChunks.push(value);
              appendNextChunk();
            }
          }
        } catch (error) {
          reject(error);
        }
      };

      mediaSource.addEventListener('sourceopen', () => {
        void onSourceOpen();
      }, { once: true });
    });
  }, [attachAudioHandlers, playBlobAudio]);

  const speak = useCallback(async (text: string, messageId: string) => {
    if ((isPlaying || isLoading) && currentMessageId === messageId) {
      stop();
      return;
    }

    cleanupAudio(false);

    setIsLoading(true);
    setCurrentMessageId(messageId);

    try {
      const cleanText = cleanTextForSpeech(text);
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token ?? SUPABASE_PUBLISHABLE_KEY;
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/text_to_speech`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': STREAM_MIME_TYPE,
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ text: cleanText }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();

        try {
          const errorData = JSON.parse(errorText) as { error?: string };
          throw new Error(errorData.error || `TTS failed: ${response.status}`);
        } catch {
          throw new Error(errorText || `TTS failed: ${response.status}`);
        }
      }

      await playStreamingAudio(response, messageId, abortController.signal);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      console.error('Failed to generate speech:', error);
      cleanupAudio(true);
    } finally {
      abortControllerRef.current = null;
      if (audioRef.current) {
        setIsLoading(false);
      }
    }
  }, [cleanupAudio, currentMessageId, isLoading, isPlaying, playStreamingAudio]);

  const stop = useCallback(() => {
    cleanupAudio(true);
  }, [cleanupAudio]);

  return {
    speak,
    stop,
    isPlaying,
    isLoading,
    currentMessageId,
  };
}
