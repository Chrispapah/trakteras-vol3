import { useRef, useEffect, useState } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { TractorRobot } from './TractorRobot';
import { ChatMessage as ChatMessageType } from '@/types';
import { Loader2 } from 'lucide-react';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';

interface ChatPanelProps {
  messages: ChatMessageType[];
  isLoading: boolean;
  onSend: (message: string, images?: string[]) => void;
  onVoiceSend?: (audioBlob: Blob) => Promise<void>;
  assetContext?: string;
  readOnly?: boolean;
}

export function ChatPanel({ messages, isLoading, onSend, onVoiceSend, assetContext, readOnly = false }: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isListening, setIsListening] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const lastMessageIdRef = useRef<string | null>(null);
  const { speak, stop, isPlaying, isLoading: isLoadingAudio, currentMessageId } = useTextToSpeech();
  
  const isRobotVisible = isListening || isPlaying || isLoadingAudio;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-speak new AI messages only after user has interacted
  useEffect(() => {
    if (!hasUserInteracted || isLoading) return;
    
    const lastMessage = messages[messages.length - 1];
    if (
      lastMessage &&
      lastMessage.role === 'assistant' &&
      lastMessage.id !== lastMessageIdRef.current
    ) {
      lastMessageIdRef.current = lastMessage.id;
      speak(lastMessage.content, lastMessage.id);
    }
  }, [messages, hasUserInteracted, isLoading, speak]);

  const handleSend = (msg: string, imgs?: string[]) => {
    setHasUserInteracted(true);
    onSend(msg, imgs);
  };

  const handleVoiceStateChange = (listening: boolean) => {
    if (listening) setHasUserInteracted(true);
    setIsListening(listening);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-2 sm:p-4 space-y-2.5 sm:space-y-4 overscroll-contain"
      >
        {/* Welcome spacer for visual breathing room */}
        {messages.length <= 1 && <div className="h-4" />}

        {messages.map((message) => (
          <ChatMessage 
            key={message.id} 
            message={message}
            onSpeak={speak}
            isPlaying={isPlaying}
            isLoadingAudio={isLoadingAudio}
            currentPlayingId={currentMessageId}
          />
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-2.5 animate-fade-in">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-card rounded-2xl rounded-bl-md px-3.5 py-2.5 shadow-card">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {/* Bottom scroll anchor */}
        <div className="h-1" />
      </div>

      {/* Input Area */}
      {!readOnly && (
        <ChatInput
          onSend={handleSend}
          onVoiceSend={onVoiceSend}
          disabled={isLoading}
          assetContext={assetContext}
          onVoiceStateChange={handleVoiceStateChange}
        />
      )}

      {/* Tractor Robot Popup */}
      <TractorRobot
        isVisible={isRobotVisible}
        isSpeaking={isPlaying}
        isListening={isListening}
        message={isListening ? "Σε ακούω..." : isPlaying ? "Απαντάω..." : undefined}
      />
    </div>
  );
}
