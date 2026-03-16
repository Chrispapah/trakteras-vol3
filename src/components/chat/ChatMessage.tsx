import { ChatMessage as ChatMessageType } from '@/types';
import { cn } from '@/lib/utils';
import { User, Volume2, VolumeX, Loader2 } from 'lucide-react';
import roosterAvatar from '@/assets/rooster-avatar.png';
import { Button } from '@/components/ui/button';

interface ChatMessageProps {
  message: ChatMessageType;
  onSpeak?: (text: string, messageId: string) => void;
  isPlaying?: boolean;
  isLoadingAudio?: boolean;
  currentPlayingId?: string | null;
}

export function ChatMessage({ 
  message, 
  onSpeak, 
  isPlaying, 
  isLoadingAudio,
  currentPlayingId 
}: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isThisPlaying = isPlaying && currentPlayingId === message.id;
  const isThisLoading = isLoadingAudio && currentPlayingId === message.id;

  return (
    <div
      className={cn(
        'flex gap-2 sm:gap-3 animate-fade-in',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center',
          isUser
            ? 'bg-secondary text-secondary-foreground'
            : 'bg-primary text-primary-foreground'
        )}
      >
        {isUser ? <User className="w-4 h-4 sm:w-5 sm:h-5" /> : <img src={roosterAvatar} alt="Κόκορας" className="w-full h-full object-cover rounded-full" />}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          'max-w-[85%] sm:max-w-[80%] rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-card text-card-foreground shadow-card rounded-bl-md'
        )}
      >
        {/* Images */}
        {message.images && message.images.length > 0 && (
          <div className="flex gap-1.5 mb-2 flex-wrap">
            {message.images.map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt={`Εικόνα ${idx + 1}`}
                className="w-20 h-20 sm:w-32 sm:h-32 object-cover rounded-lg"
              />
            ))}
          </div>
        )}

        {/* Asset Context Badge */}
        {message.assetContext && (
          <div className="text-[11px] opacity-70 mb-1 flex items-center gap-1">
            📍 {message.assetContext}
          </div>
        )}

        {/* Text Content */}
        <div className="text-[13px] sm:text-sm leading-relaxed whitespace-pre-wrap">
          {formatMessage(message.content)}
        </div>

        {/* Footer with timestamp and speak button */}
        <div className={cn(
          'flex items-center gap-1.5 mt-1.5 sm:mt-2',
          isUser ? 'justify-end' : 'justify-between'
        )}>
          {/* Speak Button - only for assistant messages */}
          {!isUser && onSpeak && message.id !== 'welcome' && (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-6 sm:h-7 px-1.5 sm:px-2 gap-1 text-[11px] sm:text-xs',
                isThisPlaying && 'text-primary'
              )}
              onClick={() => onSpeak(message.content, message.id)}
              disabled={isThisLoading}
            >
              {isThisLoading ? (
                <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin" />
              ) : isThisPlaying ? (
                <VolumeX className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              ) : (
                <Volume2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              )}
              <span className="hidden sm:inline">{isThisPlaying ? 'Σταμάτα' : 'Ακρόαση'}</span>
            </Button>
          )}

          {/* Timestamp */}
          <span className="text-[10px] sm:text-xs opacity-50">
            {new Date(message.timestamp).toLocaleTimeString('el-GR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

function formatMessage(content: string): React.ReactNode {
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}
