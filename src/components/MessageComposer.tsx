import React, { useState, useRef, useEffect } from 'react';
import { Send, AlertCircle, Clock, Ban, VolumeX } from 'lucide-react';
import { ChatSession } from '../types';

interface MessageComposerProps {
  session: ChatSession | null;
  onSendMessage: (text: string) => Promise<{ success: boolean; error?: string }>;
  moderationStatus: {
    isBanned: boolean;
    isMuted: boolean;
    reason?: string;
    expiresAt?: string | null;
    remainingSeconds?: number;
  };
  maxLength?: number;
  onTyping?: (isTyping: boolean) => void;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  session,
  onSendMessage,
  moderationStatus,
  maxLength = 500,
  onTyping,
}) => {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus textarea on mount if user is active
  useEffect(() => {
    if (session && !moderationStatus.isBanned && !moderationStatus.isMuted) {
      textareaRef.current?.focus();
    }
  }, [session, moderationStatus.isBanned, moderationStatus.isMuted]);

  // Clean up typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      onTyping?.(false);
    };
  }, [onTyping]);

  // Handle auto-resizing textarea and typing trigger
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= maxLength) {
      setText(val);
      if (errorMessage) setErrorMessage(null);

      if (session && !moderationStatus.isBanned && !moderationStatus.isMuted) {
        if (val.trim().length > 0) {
          onTyping?.(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            onTyping?.(false);
          }, 3000);
        } else {
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          onTyping?.(false);
        }
      }
    }
  };

  const handleBlur = () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    onTyping?.(false);
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || isSending || moderationStatus.isBanned || moderationStatus.isMuted) {
      return;
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    onTyping?.(false);

    if (cooldownRemaining > 0) {
      setErrorMessage(`Please wait ${cooldownRemaining}s before sending.`);
      return;
    }

    setIsSending(true);
    setErrorMessage(null);

    try {
      const result = await onSendMessage(trimmed);
      if (result.success) {
        setText('');
        // Start client cooldown (2s)
        setCooldownRemaining(2);
        const timer = setInterval(() => {
          setCooldownRemaining((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setErrorMessage(result.error || 'Failed to send message.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error occurred.');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // If user is banned
  if (moderationStatus.isBanned) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-950/40 border-t border-red-200 dark:border-red-900/50">
        <div className="flex items-center gap-2.5 max-w-2xl mx-auto text-red-700 dark:text-red-300">
          <Ban className="w-5 h-5 shrink-0" />
          <div>
            <div className="font-semibold text-sm">Session Banned</div>
            <div className="text-xs">
              {moderationStatus.reason || 'This session has been banned for violating community rules.'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If user is muted
  if (moderationStatus.isMuted) {
    return (
      <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border-t border-amber-200 dark:border-amber-900/50">
        <div className="flex items-center justify-between max-w-2xl mx-auto text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-2.5">
            <VolumeX className="w-5 h-5 shrink-0" />
            <div>
              <div className="font-semibold text-sm">You are temporarily muted</div>
              <div className="text-xs text-amber-700 dark:text-amber-400">
                {moderationStatus.reason || 'Rapid messaging or language violation.'} You can continue reading the chat.
              </div>
            </div>
          </div>
          {moderationStatus.remainingSeconds && (
            <div className="flex items-center gap-1 text-xs font-semibold px-2 py-1 bg-amber-100 dark:bg-amber-900/60 rounded-md">
              <Clock className="w-3.5 h-3.5" />
              <span>{Math.ceil(moderationStatus.remainingSeconds / 60)}m left</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  const charCount = text.length;
  const isNearLimit = charCount > maxLength * 0.85;

  return (
    <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-3 sm:px-6 py-3 transition-colors">
      <div className="max-w-4xl mx-auto space-y-2">
        {/* Error message toast banner if rejected */}
        {errorMessage && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400 font-medium animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-red-600 font-bold ml-2 text-sm"
            >
              ×
            </button>
          </div>
        )}

        {/* Input box and action buttons */}
        <div className="flex items-end gap-2 bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl p-1.5 border border-zinc-300/80 dark:border-zinc-700/80 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={
              session
                ? `Say something, ${session.nickname}... (Enter to send)`
                : 'Join chat to send messages...'
            }
            disabled={!session || isSending}
            rows={1}
            className="flex-1 px-3 py-2 text-sm bg-transparent border-0 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-hidden resize-none max-h-32 min-h-[40px] leading-relaxed"
          />

          <div className="flex items-center gap-2 pb-1 pr-1 shrink-0">
            {/* Character counter */}
            {charCount > 0 && (
              <span
                className={`text-[11px] font-mono px-1.5 py-0.5 rounded ${
                  isNearLimit
                    ? 'text-amber-600 dark:text-amber-400 font-bold'
                    : 'text-zinc-400 dark:text-zinc-500'
                }`}
              >
                {charCount}/{maxLength}
              </span>
            )}

            {/* Send button */}
            <button
              type="button"
              onClick={handleSend}
              aria-label="Send message"
              disabled={!text.trim() || isSending || !session || cooldownRemaining > 0}
              className="w-10 h-10 min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition shrink-0"
              title={cooldownRemaining > 0 ? `Wait ${cooldownRemaining}s` : 'Send message (Enter)'}
            >
              {cooldownRemaining > 0 ? (
                <span className="text-xs font-bold font-mono">{cooldownRemaining}</span>
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Helpful keyboard shortcut hints for desktop */}
        <div className="flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500 px-1">
          <span className="hidden sm:inline">
            <kbd className="font-mono bg-zinc-200 dark:bg-zinc-800 px-1 py-0.5 rounded text-[10px]">Enter</kbd> to send,{' '}
            <kbd className="font-mono bg-zinc-200 dark:bg-zinc-800 px-1 py-0.5 rounded text-[10px]">Shift+Enter</kbd> for new line
          </span>
          <span className="sm:hidden">
            Public chat • Keep it friendly
          </span>
          <span>Max 500 characters</span>
        </div>
      </div>
    </div>
  );
};
