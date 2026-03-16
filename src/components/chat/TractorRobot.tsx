import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import roosterAvatar from '@/assets/rooster-avatar.png';

interface TractorRobotProps {
  isVisible: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  message?: string;
}

export function TractorRobot({ isVisible, isSpeaking, isListening, message }: TractorRobotProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 100 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 100 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed bottom-28 right-3 sm:bottom-32 sm:right-6 z-50 flex flex-col items-center gap-1.5 sm:gap-3"
        >
          {/* Speech Bubble */}
          {message && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-2xl px-4 py-3 shadow-lg max-w-xs relative"
            >
              <p className="text-sm text-foreground">{message}</p>
              <div className="absolute -bottom-2 right-8 w-4 h-4 bg-card border-r border-b border-border transform rotate-45" />
            </motion.div>
          )}

          {/* Rooster Avatar */}
          <motion.div
            animate={isSpeaking ? { scale: [1, 1.08, 1] } : isListening ? { scale: [1, 1.03, 1] } : {}}
            transition={{ repeat: Infinity, duration: isSpeaking ? 0.5 : 1 }}
            className={cn(
              'relative w-16 h-16 sm:w-24 sm:h-24 rounded-full shadow-xl overflow-hidden',
              'ring-4 ring-primary/30',
              isSpeaking && 'ring-accent animate-pulse',
              isListening && 'ring-destructive'
            )}
          >
            <img
              src={roosterAvatar}
              alt="Κόκορας avatar"
              className="w-full h-full object-cover"
            />

            {/* Status Icon */}
            <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-2 shadow-md border border-border">
              {isSpeaking ? (
                <Volume2 className="w-4 h-4 text-accent animate-pulse" />
              ) : isListening ? (
                <Mic className="w-4 h-4 text-destructive animate-pulse" />
              ) : (
                <div className="w-4 h-4 rounded-full bg-muted" />
              )}
            </div>
          </motion.div>

          {/* Sound Waves when speaking */}
          {isSpeaking && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 1, opacity: 0.5 }}
                  animate={{ scale: 2, opacity: 0 }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.5,
                    delay: i * 0.3,
                  }}
                  className="absolute w-16 h-16 sm:w-24 sm:h-24 rounded-full border-2 border-accent"
                />
              ))}
            </div>
          )}

          {/* Status Label */}
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn(
              'text-xs font-medium px-3 py-1 rounded-full',
              isSpeaking && 'bg-accent/20 text-accent',
              isListening && 'bg-destructive/20 text-destructive',
              !isSpeaking && !isListening && 'bg-muted text-muted-foreground'
            )}
          >
            {isSpeaking ? 'Μιλάω...' : isListening ? 'Ακούω...' : 'Τρακτεράς'}
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
