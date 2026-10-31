import React, { useEffect, useRef, useState } from 'react';
import {
  Flag,
  Copy,
  Check,
  Trash2,
  VolumeX,
  Ban,
  ArrowDown,
  Info,
  RefreshCw,
  ShieldCheck,
  Megaphone,
  UserPlus,
  Smile,
} from 'lucide-react';
import {
  ChatMessage,
  ChatSession,
  TypingUser,
  AVAILABLE_REACTIONS,
  getEmojiForReactionKey,
} from '../types';
import { UserAvatar } from './UserAvatar';

interface ChatRoomProps {
  messages: ChatMessage[];
  currentSession: ChatSession | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  onReportMessage: (message: ChatMessage) => void;
  isAdmin?: boolean;
  onAdminDeleteMessage?: (messageId: string) => void;
  onAdminMuteUser?: (sessionId: string, nickname: string) => void;
  onAdminBanUser?: (sessionId: string, nickname: string) => void;
  typingUsers?: TypingUser[];
  onReactToMessage?: (messageId: string, emojiKey: string) => void;
  onPromptJoin?: () => void;
}

// Safely parse and render URLs inside text without raw dangerouslySetInnerHTML
function renderFormattedText(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-semibold hover:text-amber-600 dark:hover:text-amber-400 break-all transition"
        >
          {part}
        </a>
      );
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

export const ChatRoom: React.FC<ChatRoomProps> = ({
  messages,
  currentSession,
  connectionStatus,
  onReportMessage,
  isAdmin = false,
  onAdminDeleteMessage,
  onAdminMuteUser,
  onAdminBanUser,
  typingUsers = [],
  onReactToMessage,
  onPromptJoin,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activePickerMsgId, setActivePickerMsgId] = useState<string | null>(null);
  const isNearBottomRef = useRef(true);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!activePickerMsgId) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setActivePickerMsgId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [activePickerMsgId]);

  const handleToggleReaction = (messageId: string, emojiKey: string) => {
    if (!currentSession) {
      onPromptJoin?.();
      return;
    }
    onReactToMessage?.(messageId, emojiKey);
    setActivePickerMsgId(null);
  };

  const getReactionsList = (reactions?: Record<string, Record<string, string>>) => {
    if (!reactions || typeof reactions !== 'object') return [];
    const list: {
      key: string;
      emoji: string;
      count: number;
      nicknames: string[];
      userReacted: boolean;
    }[] = [];

    for (const [key, sessionMap] of Object.entries(reactions)) {
      if (!sessionMap || typeof sessionMap !== 'object') continue;
      const sessionIds = Object.keys(sessionMap);
      if (sessionIds.length === 0) continue;
      const nicknames = Object.values(sessionMap);
      const userReacted = Boolean(currentSession && sessionMap[currentSession.id]);
      list.push({
        key,
        emoji: getEmojiForReactionKey(key),
        count: sessionIds.length,
        nicknames,
        userReacted,
      });
    }

    return list;
  };

  // Filter out deleted messages for normal view unless admin
  const visibleMessages = messages.filter((m) => isAdmin || !m.deleted_at);

  // Monitor scroll position to determine whether to auto-scroll
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isAtBottom = distanceFromBottom < 80;
    isNearBottomRef.current = isAtBottom;

    if (isAtBottom) {
      setShowScrollBottom(false);
      setUnreadCount(0);
    } else {
      setShowScrollBottom(true);
    }
  };

  // Scroll to bottom when new messages arrive if user was already at bottom
  useEffect(() => {
    if (isNearBottomRef.current) {
      bottomAnchorRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      setUnreadCount((prev) => prev + 1);
    }
  }, [messages.length]);

  // Scroll to bottom when someone starts typing if user was already at bottom
  useEffect(() => {
    if (typingUsers.length > 0 && isNearBottomRef.current) {
      bottomAnchorRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [typingUsers.length]);

  // Initial scroll to bottom
  useEffect(() => {
    bottomAnchorRef.current?.scrollIntoView({ behavior: 'auto' });
  }, []);

  const formatTypingText = (users: TypingUser[]) => {
    if (users.length === 0) return '';
    if (users.length === 1) return `${users[0].nickname} is typing...`;
    if (users.length === 2) return `${users[0].nickname} and ${users[1].nickname} are typing...`;
    return `${users[0].nickname}, ${users[1].nickname} and ${users.length - 2} more are typing...`;
  };

  const scrollToBottom = () => {
    bottomAnchorRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollBottom(false);
    setUnreadCount(0);
    isNearBottomRef.current = true;
  };

  const handleCopyMessage = (text: string, id: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => {
        setCopiedId(null);
      }, 1500);
    } catch {}
  };

  const formatTimestamp = (isoDate: string) => {
    try {
      const date = new Date(isoDate);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="relative flex-1 flex flex-col min-h-0 bg-zinc-50 dark:bg-zinc-950 transition-colors">
      {/* Connection Banner */}
      {connectionStatus !== 'connected' && (
        <div className="bg-amber-500/10 dark:bg-amber-500/20 border-b border-amber-200 dark:border-amber-800 px-3 py-1.5 text-center text-xs text-amber-800 dark:text-amber-200 flex items-center justify-center gap-2 shrink-0">
          <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
          <span className="truncate">
            {connectionStatus === 'connecting'
              ? 'Connecting to chat room...'
              : 'Connection lost. Reconnecting automatically...'}
          </span>
        </div>
      )}

      {/* Message List Scroll Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-2 sm:px-6 py-3 sm:py-4 space-y-3 sm:space-y-3.5 overscroll-contain"
      >
        {/* Welcome announcement banner */}
        <div className="max-w-xl mx-auto my-2 p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs text-center text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
          <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center justify-center gap-1.5">
            <Info className="w-4 h-4 text-blue-500 shrink-0" />
            <span>Welcome to SayHola Public Room</span>
          </div>
          <p className="leading-relaxed">
            This is an open public text room. All online participants can read messages here. No login required.
          </p>
        </div>

        {/* Empty state */}
        {visibleMessages.length === 0 && (
          <div className="text-center py-12 text-zinc-400 dark:text-zinc-600 text-xs sm:text-sm">
            <p>No messages yet. Be the first to say hola!</p>
          </div>
        )}

        {/* Message items */}
        {visibleMessages.map((msg) => {
          const isMe = currentSession?.id === msg.session_id;
          const isSystem = msg.is_system;
          const isAdminMsg = Boolean(msg.is_admin || msg.message_type === 'announcement');
          const isJoinNotice = msg.message_type === 'join' || (isSystem && msg.message_text.includes('joined'));
          const isDeleted = Boolean(msg.deleted_at);

          // 1. Join Notification / System message layout
          if (isJoinNotice) {
            return (
              <div
                key={msg.id}
                className="flex items-center justify-center my-1.5 px-2 animate-fade-in"
              >
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-200/70 dark:bg-zinc-800/80 text-[11px] font-medium text-zinc-600 dark:text-zinc-400 border border-zinc-300/50 dark:border-zinc-700/50 max-w-sm text-center shadow-2xs">
                  <UserPlus className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span className="truncate">{msg.message_text}</span>
                </div>
              </div>
            );
          }

          if (isSystem && !isAdminMsg) {
            return (
              <div
                key={msg.id}
                className="flex items-center justify-center my-1.5 px-2"
              >
                <div className="px-3 py-1 rounded-full bg-zinc-200/80 dark:bg-zinc-800/80 text-[11px] font-medium text-zinc-600 dark:text-zinc-400 border border-zinc-300/50 dark:border-zinc-700/50 max-w-md text-center">
                  {msg.message_text}
                </div>
              </div>
            );
          }

          // 2. Admin Announcement Message Layout
          if (isAdminMsg) {
            return (
              <div
                key={msg.id}
                className="max-w-2xl mx-auto my-3 p-3.5 sm:p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/30 border-2 border-amber-400/60 dark:border-amber-600/50 shadow-md shadow-amber-500/5 transition"
              >
                <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-amber-200/60 dark:border-amber-800/60 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
                    <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>SayHola Admin Announcement</span>
                  </div>
                  <span className="text-[10px] text-amber-800/70 dark:text-amber-300/70">
                    {formatTimestamp(msg.created_at)}
                  </span>
                </div>
                <div className="text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap break-words select-text">
                  {renderFormattedText(msg.message_text)}
                </div>
                {/* Admin controls if admin is viewing */}
                {isAdmin && (
                  <div className="flex items-center justify-end gap-1 mt-2 pt-1 border-t border-amber-200/40 dark:border-amber-800/40">
                    <button
                      onClick={() => handleCopyMessage(msg.message_text, msg.id)}
                      className="p-1 text-amber-700 dark:text-amber-300 hover:text-amber-900 rounded text-[11px] flex items-center gap-1"
                    >
                      {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>Copy</span>
                    </button>
                    <button
                      onClick={() => onAdminDeleteMessage?.(msg.id)}
                      className="p-1 text-red-600 dark:text-red-400 hover:text-red-800 rounded text-[11px] flex items-center gap-1 ml-2"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            );
          }

          // 3. Regular User message layout
          return (
            <div
              key={msg.id}
              className={`group flex items-start gap-2 sm:gap-2.5 max-w-full sm:max-w-3xl ${
                isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              {/* User Avatar */}
              <UserAvatar
                nickname={msg.nickname_snapshot}
                size="sm"
                className="sm:w-8 sm:h-8"
              />

              {/* Message Content Bubble */}
              <div
                className={`flex flex-col min-w-0 max-w-[88%] sm:max-w-[75%] ${
                  isMe ? 'items-end' : 'items-start'
                }`}
              >
                {/* Meta header: Nickname & Time */}
                <div
                  className={`flex items-center gap-1.5 mb-1 px-1 text-[11px] text-zinc-500 dark:text-zinc-400 max-w-full ${
                    isMe ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[140px] sm:max-w-[200px]">
                    {msg.nickname_snapshot}
                  </span>
                  {isMe && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 shrink-0">
                      You
                    </span>
                  )}
                  <span className="text-[10px] opacity-75 shrink-0">
                    {formatTimestamp(msg.created_at)}
                  </span>
                </div>

                {/* Bubble Container */}
                <div
                  className={`relative px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed break-words shadow-xs border transition ${
                    isDeleted
                      ? 'bg-zinc-100 dark:bg-zinc-800/50 text-zinc-400 dark:text-zinc-500 border-zinc-200 dark:border-zinc-800 italic'
                      : isMe
                      ? 'bg-blue-600 text-white border-blue-600 dark:border-blue-700 rounded-tr-xs'
                      : 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-800 rounded-tl-xs'
                  }`}
                >
                  {isDeleted ? (
                    <span className="text-xs">
                      [This message was removed by moderator]
                    </span>
                  ) : (
                    <span className="whitespace-pre-wrap select-text break-words">
                      {renderFormattedText(msg.message_text)}
                    </span>
                  )}
                </div>

                {/* Reactions Display */}
                {!isDeleted && (() => {
                  const reactionsList = getReactionsList(msg.reactions);
                  if (reactionsList.length === 0) return null;
                  return (
                    <div
                      className={`flex flex-wrap items-center gap-1.5 mt-1.5 ${
                        isMe ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {reactionsList.map(({ key, emoji, count, nicknames, userReacted }) => (
                        <button
                          key={key}
                          onClick={() => handleToggleReaction(msg.id, key)}
                          title={nicknames.length > 0 ? `${nicknames.join(', ')} reacted with ${emoji}` : ''}
                          aria-label={`${count} ${key} reactions`}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition border active:scale-95 cursor-pointer shadow-2xs select-none ${
                            userReacted
                              ? 'bg-blue-50 dark:bg-blue-950/70 border-blue-400 dark:border-blue-600 text-blue-700 dark:text-blue-300 font-bold'
                              : 'bg-white/90 dark:bg-zinc-800/90 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/80'
                          }`}
                        >
                          <span className="leading-none text-xs sm:text-sm">{emoji}</span>
                          <span className="text-[10px] sm:text-[11px] font-semibold">{count}</span>
                        </button>
                      ))}
                    </div>
                  );
                })()}

                {/* Action Toolbar */}
                {!isDeleted && (
                  <div
                    className={`flex items-center gap-1 mt-1 opacity-70 sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity ${
                      isMe ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {/* Add Emoji Reaction Button & Picker */}
                    <div className="relative">
                      <button
                        onClick={() =>
                          setActivePickerMsgId((prev) => (prev === msg.id ? null : msg.id))
                        }
                        aria-label="Add reaction"
                        className={`p-1 sm:p-1.5 min-h-[30px] min-w-[30px] flex items-center justify-center rounded transition ${
                          activePickerMsgId === msg.id
                            ? 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                            : 'text-zinc-400 hover:text-amber-500 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800'
                        }`}
                        title="Add reaction"
                      >
                        <Smile className="w-3.5 h-3.5" />
                      </button>

                      {/* Floating Quick Reaction Picker */}
                      {activePickerMsgId === msg.id && (
                        <div
                          ref={pickerRef}
                          className={`absolute bottom-full mb-1.5 z-40 flex items-center gap-0.5 sm:gap-1 p-1 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-full shadow-lg border border-zinc-200 dark:border-zinc-700 animate-in fade-in zoom-in-95 duration-150 ${
                            isMe ? 'right-0' : 'left-0'
                          }`}
                          role="dialog"
                          aria-label="Choose reaction"
                        >
                          {AVAILABLE_REACTIONS.map((r) => {
                            const isSelected = Boolean(
                              msg.reactions?.[r.id]?.[currentSession?.id || '']
                            );
                            return (
                              <button
                                key={r.id}
                                onClick={() => handleToggleReaction(msg.id, r.id)}
                                className={`p-1.5 hover:scale-130 active:scale-95 transition-all rounded-full flex items-center justify-center text-sm sm:text-base leading-none ${
                                  isSelected
                                    ? 'bg-blue-100 dark:bg-blue-900/50 ring-1 ring-blue-400'
                                    : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                }`}
                                title={r.label}
                                aria-label={`React with ${r.label}`}
                              >
                                <span>{r.emoji}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Copy action */}
                    <button
                      onClick={() => handleCopyMessage(msg.message_text, msg.id)}
                      aria-label="Copy text"
                      className="p-1 sm:p-1.5 min-h-[30px] min-w-[30px] flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition"
                      title="Copy text"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Report action (not shown for own messages) */}
                    {!isMe && (
                      <button
                        onClick={() => onReportMessage(msg)}
                        aria-label="Report message"
                        className="p-1 sm:p-1.5 min-h-[30px] min-w-[30px] flex items-center justify-center text-zinc-400 hover:text-rose-500 dark:hover:text-rose-400 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition"
                        title="Report message"
                      >
                        <Flag className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Admin Actions */}
                    {isAdmin && (
                      <div className="flex items-center gap-0.5 ml-1 border-l border-zinc-200 dark:border-zinc-800 pl-1">
                        <button
                          onClick={() => onAdminDeleteMessage?.(msg.id)}
                          aria-label="Delete message"
                          className="p-1 sm:p-1.5 min-h-[30px] min-w-[30px] flex items-center justify-center text-red-500 hover:text-red-700 rounded hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                          title="Delete message (Admin)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {!isMe && (
                          <>
                            <button
                              onClick={() =>
                                onAdminMuteUser?.(msg.session_id, msg.nickname_snapshot)
                              }
                              aria-label="Mute user 15 minutes"
                              className="p-1 sm:p-1.5 min-h-[30px] min-w-[30px] flex items-center justify-center text-amber-500 hover:text-amber-700 rounded hover:bg-amber-50 dark:hover:bg-amber-950/40 transition"
                              title="Mute user 15m (Admin)"
                            >
                              <VolumeX className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                onAdminBanUser?.(msg.session_id, msg.nickname_snapshot)
                              }
                              aria-label="Ban user"
                              className="p-1 sm:p-1.5 min-h-[30px] min-w-[30px] flex items-center justify-center text-rose-600 hover:text-rose-800 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                              title="Ban user (Admin)"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Real-time Typing Indicator Bubble */}
        {typingUsers && typingUsers.length > 0 && (
          <div
            className="flex items-center gap-2.5 px-3 py-2 self-start text-xs text-zinc-600 dark:text-zinc-300 bg-white/95 dark:bg-zinc-800/95 backdrop-blur-xs border border-zinc-200/90 dark:border-zinc-700/80 rounded-2xl rounded-bl-xs shadow-xs animate-in fade-in slide-in-from-bottom-1 duration-200 mt-1"
            role="status"
            aria-live="polite"
          >
            {/* Animated three bouncing dots */}
            <div className="flex items-center gap-1 shrink-0 px-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-bounce"></span>
            </div>

            <span className="font-medium truncate max-w-[240px] sm:max-w-md">
              {formatTypingText(typingUsers)}
            </span>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={bottomAnchorRef} className="h-1" />
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          aria-label="Scroll to latest messages"
          className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg text-xs font-medium transition-all active:scale-95"
        >
          <ArrowDown className="w-3.5 h-3.5 shrink-0" />
          <span>
            {unreadCount > 0 ? `${unreadCount} new message${unreadCount > 1 ? 's' : ''}` : 'Latest'}
          </span>
        </button>
      )}
    </div>
  );
};
