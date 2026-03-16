import { useEffect, useState, useRef, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Mic, MicOff, Image, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ChatInputProps {
  onSend: (message: string, images?: string[]) => void;
  onVoiceSend?: (audioBlob: Blob) => Promise<void>;
  disabled?: boolean;
  assetContext?: string;
  onVoiceStateChange?: (isListening: boolean) => void;
}

export function ChatInput({ onSend, onVoiceSend, disabled, assetContext, onVoiceStateChange }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isVoicePressActiveRef = useRef(false);
  const shouldStopAfterStartRef = useRef(false);
  const { toast } = useToast();

  const updateListeningState = (listening: boolean) => {
    setIsListening(listening);
    setIsVoiceActive(listening);
    onVoiceStateChange?.(listening);
  };

  const handleSend = () => {
    if (message.trim() || images.length > 0) {
      onSend(message.trim(), images.length > 0 ? images : undefined);
      setMessage('');
      setImages([]);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setImages((prev) => [...prev, event.target!.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const stopMediaTracks = () => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  };

  useEffect(() => {
    return () => {
      const recorder = mediaRecorderRef.current;

      isVoicePressActiveRef.current = false;
      shouldStopAfterStartRef.current = false;
      audioChunksRef.current = [];

      if (recorder) {
        recorder.onstart = null;
        recorder.ondataavailable = null;
        recorder.onerror = null;
        recorder.onstop = null;

        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      }

      mediaRecorderRef.current = null;
      stopMediaTracks();
    };
  }, []);

  const stopVoiceRecording = () => {
    shouldStopAfterStartRef.current = false;

    const recorder = mediaRecorderRef.current;
    if (!recorder) {
      updateListeningState(false);
      return;
    }

    if (recorder.state === 'inactive') {
      return;
    }

    setIsVoiceLoading(true);
    recorder.stop();
  };

  const startVoiceRecording = async () => {
    if (!onVoiceSend || !assetContext) {
      toast({
        title: "Μη διαθέσιμο",
        description: "Επίλεξε πρώτα ένα στοιχείο για να χρησιμοποιήσεις φωνητικά μηνύματα.",
        variant: "destructive",
      });
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast({
        title: "Μη διαθέσιμο",
        description: "Η εγγραφή ήχου δεν υποστηρίζεται σε αυτό το πρόγραμμα περιήγησης.",
        variant: "destructive",
      });
      return;
    }

    try {
      shouldStopAfterStartRef.current = false;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.onstart = () => {
        updateListeningState(true);
        toast({
          title: "Ακούω...",
          description: "Κράτα πατημένο το μικρόφωνο όσο μιλάς και άφησέ το για αποστολή.",
        });

        if (shouldStopAfterStartRef.current) {
          stopVoiceRecording();
        }
      };

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        shouldStopAfterStartRef.current = false;
        stopMediaTracks();
        mediaRecorderRef.current = null;
        audioChunksRef.current = [];
        setIsVoiceLoading(false);
        updateListeningState(false);
        toast({
          title: "Σφάλμα",
          description: "Δεν ήταν δυνατή η εγγραφή φωνής. Δοκίμασε ξανά.",
          variant: "destructive",
        });
      };

      recorder.onstop = async () => {
        shouldStopAfterStartRef.current = false;
        updateListeningState(false);

        const mimeType = recorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        audioChunksRef.current = [];
        mediaRecorderRef.current = null;
        stopMediaTracks();

        try {
          if (!audioBlob.size) {
            throw new Error('empty-audio');
          }

          await onVoiceSend(audioBlob);
        } catch (error) {
          console.error('Voice upload error:', error);
          toast({
            title: "Σφάλμα",
            description: "Δεν ήταν δυνατή η αποστολή του φωνητικού μηνύματος.",
            variant: "destructive",
          });
        } finally {
          setIsVoiceLoading(false);
        }
      };

      recorder.start();
    } catch (error) {
      console.error('Voice recording error:', error);
      shouldStopAfterStartRef.current = false;
      stopMediaTracks();
      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
      setIsVoiceLoading(false);
      toast({
        title: "Σφάλμα",
        description: "Δεν δόθηκε άδεια ήχου ή η εγγραφή απέτυχε.",
        variant: "destructive",
      });
      updateListeningState(false);
    }
  };

  const handleVoicePressStart = async (event: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || isVoiceLoading || isListening || isVoicePressActiveRef.current) {
      return;
    }

    event.preventDefault();
    isVoicePressActiveRef.current = true;
    shouldStopAfterStartRef.current = false;
    event.currentTarget.setPointerCapture?.(event.pointerId);

    await startVoiceRecording();
  };

  const handleVoicePressEnd = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!isVoicePressActiveRef.current) {
      return;
    }

    event.preventDefault();
    isVoicePressActiveRef.current = false;

    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }

    if (mediaRecorderRef.current) {
      stopVoiceRecording();
      return;
    }

    shouldStopAfterStartRef.current = true;
  };

  return (
    <div className="border-t border-border bg-background/95 backdrop-blur-sm px-2.5 pt-2 pb-[max(env(safe-area-inset-bottom),8px)] sm:p-4 sm:pb-[env(safe-area-inset-bottom,12px)]">
      {/* Asset Context Indicator */}
      {assetContext && (
        <div className="mb-1.5 sm:mb-2">
          <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[11px] sm:text-xs px-2 py-0.5 rounded-full">
            📍 {assetContext}
          </span>
        </div>
      )}

      {/* Image Preview */}
      {images.length > 0 && (
        <div className="flex gap-1.5 mb-2 flex-wrap">
          {images.map((img, idx) => (
            <div key={idx} className="relative">
              <img
                src={img}
                alt={`Εικόνα ${idx + 1}`}
                className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-lg border border-border"
              />
              <button
                onClick={() => removeImage(idx)}
                className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end gap-1 sm:gap-2">
        {/* Image Upload */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          multiple
          className="hidden"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full"
          disabled={disabled}
        >
          <Image className="w-4 h-4 sm:w-5 sm:h-5" />
        </Button>

        {/* Text Input */}
        <div className="flex-1 relative min-w-0">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ρώτα κάτι..."
            className="min-h-[38px] sm:min-h-[42px] max-h-[100px] sm:max-h-[120px] resize-none rounded-2xl bg-card border-border text-[13px] sm:text-sm py-2 px-3"
            disabled={disabled}
            rows={1}
          />
        </div>

        {/* Voice Button */}
        <Button
          variant="voice"
          size="icon-lg"
          onPointerDown={handleVoicePressStart}
          onPointerUp={handleVoicePressEnd}
          onPointerCancel={handleVoicePressEnd}
          className={cn(
            'flex-shrink-0 transition-all w-9 h-9 sm:w-11 sm:h-11 rounded-full',
            isVoiceActive && 'bg-destructive animate-pulse-gentle'
          )}
          disabled={disabled || isVoiceLoading}
          style={{ touchAction: 'none' }}
        >
          {isVoiceLoading ? (
            <Loader2 className="w-4 h-4 sm:w-6 sm:h-6 animate-spin" />
          ) : isVoiceActive ? (
            <MicOff className="w-4 h-4 sm:w-6 sm:h-6" />
          ) : (
            <Mic className="w-4 h-4 sm:w-6 sm:h-6" />
          )}
        </Button>

        {/* Send Button */}
        <Button
          variant="default"
          size="icon"
          onClick={handleSend}
          disabled={disabled || (!message.trim() && images.length === 0)}
          className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full"
        >
          <Send className="w-4 h-4 sm:w-5 sm:h-5" />
        </Button>
      </div>
    </div>
  );
}
