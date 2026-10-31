import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { WelcomeModal } from './components/WelcomeModal';
import { ChatRoom } from './components/ChatRoom';
import { MessageComposer } from './components/MessageComposer';
import { ReportModal } from './components/ReportModal';
import { RulesModal } from './components/RulesModal';
import { PrivacyModal } from './components/PrivacyModal';
import { AboutModal } from './components/AboutModal';
import { AdminDashboard } from './components/AdminDashboard';
import { ChatService } from './lib/chatStore';
import { ChatMessage, ChatSession, ReportReason, TypingUser } from './types';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import {
  playIncomingMessageSound,
  playSentMessageSound,
  isSoundEnabled,
  setSoundEnabled,
} from './lib/soundEffects';

export default function App() {
  const chatService = ChatService.getInstance();

  // Core App State
  const [session, setSession] = useState<ChatSession | null>(chatService.getSession());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineCount, setOnlineCount] = useState<number>(4);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connected');
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

  // Theme State ('light' | 'dark')
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('sayhola_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    } catch {
      return 'light';
    }
  });

  // Sound Notification State
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => isSoundEnabled());
  const isInitialLoadRef = useRef(true);
  const prevMessagesCountRef = useRef(0);
  const currentSessionRef = useRef(session);
  currentSessionRef.current = session;

  // Modal / Route Views
  const [showWelcome, setShowWelcome] = useState<boolean>(!chatService.getSession());
  const [reportingMessage, setReportingMessage] = useState<ChatMessage | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  // Apply Theme to DOM
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('sayhola_theme', theme);
    } catch {}

    // Sync mobile native status bar if running inside Capacitor Android app
    if (Capacitor.isNativePlatform()) {
      try {
        if (theme === 'dark') {
          StatusBar.setStyle({ style: Style.Dark });
          StatusBar.setBackgroundColor({ color: '#09090b' });
        } else {
          StatusBar.setStyle({ style: Style.Light });
          StatusBar.setBackgroundColor({ color: '#ffffff' });
        }
      } catch (err) {
        console.warn('Native status bar update skipped', err);
      }
    }
  }, [theme]);

  // Handle Android hardware/gesture back button cleanly
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const backListenerPromise = CapacitorApp.addListener('backButton', () => {
      // Prioritize closing active modals first
      if (reportingMessage) {
        setReportingMessage(null);
      } else if (showRules) {
        setShowRules(false);
      } else if (showPrivacy) {
        setShowPrivacy(false);
      } else if (showAbout) {
        setShowAbout(false);
      } else if (showAdmin) {
        setShowAdmin(false);
      } else {
        // Exit or minimize app
        CapacitorApp.exitApp();
      }
    });

    return () => {
      backListenerPromise.then((handle) => handle.remove()).catch(() => {});
    };
  }, [reportingMessage, showRules, showPrivacy, showAbout, showAdmin]);

  // Check URL path for deep links (/admin, /rules, /privacy, /about, /faq)
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/admin') {
      setShowAdmin(true);
    } else if (path === '/rules') {
      setShowRules(true);
    } else if (path === '/privacy') {
      setShowPrivacy(true);
    } else if (path === '/about' || path === '/faq') {
      setShowAbout(true);
    }
  }, []);

  // Subscribe to ChatService events
  useEffect(() => {
    const unsubMessages = chatService.subscribeToMessages((newMsgs) => {
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
        prevMessagesCountRef.current = newMsgs.length;
      } else if (newMsgs.length > prevMessagesCountRef.current) {
        const latestMsg = newMsgs[newMsgs.length - 1];
        // Play notification sound if the message was sent by someone else and is not deleted
        if (
          latestMsg &&
          latestMsg.session_id !== currentSessionRef.current?.id &&
          !latestMsg.deleted_at
        ) {
          playIncomingMessageSound();
        }
        prevMessagesCountRef.current = newMsgs.length;
      } else {
        prevMessagesCountRef.current = newMsgs.length;
      }

      setMessages(newMsgs);
    });

    const unsubPresence = chatService.subscribeToPresence((count) => {
      setOnlineCount(count);
    });

    const unsubStatus = chatService.subscribeToStatus((status) => {
      setConnectionStatus(status);
    });

    const unsubTyping = chatService.subscribeToTyping((users) => {
      setTypingUsers(users);
    });

    return () => {
      unsubMessages();
      unsubPresence();
      unsubStatus();
      unsubTyping();
    };
  }, []);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleToggleSound = () => {
    setSoundEnabledState((prev) => {
      const next = !prev;
      setSoundEnabled(next);
      if (next) {
        playIncomingMessageSound();
      }
      return next;
    });
  };

  const handleJoinChat = (nickname: string) => {
    const result = chatService.setSession(nickname);
    if (result.success) {
      setSession(chatService.getSession());
      setShowWelcome(false);
    }
    return result;
  };

  const handleLeaveChat = () => {
    chatService.leaveChat();
    setSession(null);
    setShowWelcome(true);
  };

  const handleSendMessage = async (text: string) => {
    const result = await chatService.sendMessage(text);
    if (result.success) {
      playSentMessageSound();
    }
    return result;
  };

  const handleSubmitReport = async (
    messageId: string,
    reason: ReportReason,
    details?: string
  ) => {
    return await chatService.reportMessage(messageId, reason, details);
  };

  // Get current session moderation status (mute/ban)
  const moderationStatus = chatService.checkModerationStatus();

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans select-none antialiased">
      {/* Header Bar */}
      <Header
        session={session}
        onlineCount={onlineCount}
        connectionStatus={connectionStatus}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onOpenRules={() => setShowRules(true)}
        onOpenPrivacy={() => setShowPrivacy(true)}
        onOpenAbout={() => setShowAbout(true)}
        onOpenAdmin={() => setShowAdmin(true)}
        onLeaveChat={handleLeaveChat}
      />

      {/* Main Public Chat Room */}
      <main className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
        <ChatRoom
          messages={messages}
          currentSession={session}
          connectionStatus={connectionStatus}
          onReportMessage={(msg) => setReportingMessage(msg)}
          typingUsers={typingUsers}
          onReactToMessage={(messageId, emojiKey) => chatService.toggleReaction(messageId, emojiKey)}
          onPromptJoin={() => setShowWelcome(true)}
        />

        {/* Message Composer Area */}
        <MessageComposer
          session={session}
          onSendMessage={handleSendMessage}
          moderationStatus={moderationStatus}
          maxLength={chatService.getSettings().max_message_length}
          onTyping={(isTyping) => chatService.setTyping(isTyping)}
        />
      </main>

      {/* Website Footer with exact statement */}
      <footer className="px-3 sm:px-6 py-2 sm:py-2.5 pt-2 pb-[max(0.625rem,calc(0.625rem+env(safe-area-inset-bottom,0px)))] pl-[max(0.75rem,calc(0.75rem+env(safe-area-inset-left,0px)))] pr-[max(0.75rem,calc(0.75rem+env(safe-area-inset-right,0px)))] bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 shrink-0 transition-colors">
        {/* MK Labs Branding Link */}
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <a
            href="https://www.linkedin.com/company/mk-labs-2026/"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 hover:opacity-90 transition-opacity"
            title="Visit MK Labs on LinkedIn"
          >
            <img
              src="/assets/aistudio/MK_Labs_703312e1.jpg"
              alt="MK Labs logo"
              className="w-4 h-4 sm:w-5 sm:h-5 rounded-md object-cover border border-zinc-300 dark:border-zinc-700 bg-black shrink-0 shadow-xs group-hover:ring-2 group-hover:ring-blue-500/50 transition-all"
            />
            <span className="font-semibold text-zinc-700 dark:text-zinc-300 truncate">
              A product by{' '}
              <span className="text-zinc-950 dark:text-zinc-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 font-bold underline underline-offset-2 transition-colors">
                MK Labs
              </span>
            </span>
          </a>
        </div>

        {/* Action Links - Touch friendly and wrap cleanly on small mobile viewports */}
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-1 sm:gap-2 text-[11px] sm:text-xs">
          <button
            onClick={() => setShowAbout(true)}
            className="px-2 py-1 min-h-[32px] sm:min-h-[30px] rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition active:scale-95 flex items-center"
            title="About SayHola & Frequently Asked Questions"
          >
            About &amp; FAQ
          </button>
          <span className="opacity-30 hidden sm:inline" aria-hidden="true">•</span>
          <button
            onClick={() => setShowRules(true)}
            className="px-2 py-1 min-h-[32px] sm:min-h-[30px] rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition active:scale-95 flex items-center"
            title="Community Rules"
          >
            Rules
          </button>
          <span className="opacity-30 hidden sm:inline" aria-hidden="true">•</span>
          <button
            onClick={() => setShowPrivacy(true)}
            className="px-2 py-1 min-h-[32px] sm:min-h-[30px] rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition active:scale-95 flex items-center"
            title="Privacy Policy"
          >
            Privacy
          </button>
          <span className="opacity-30 hidden sm:inline" aria-hidden="true">•</span>
          <button
            onClick={() => setShowAdmin(true)}
            className="px-2 py-1 min-h-[32px] sm:min-h-[30px] rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium text-zinc-700 dark:text-zinc-300 transition active:scale-95 flex items-center"
            title="Admin Portal"
          >
            Admin
          </button>
        </div>
      </footer>

      {/* MODALS */}
      {/* 1. Welcome / Nickname Chooser */}
      {showWelcome && <WelcomeModal onJoin={handleJoinChat} />}

      {/* 2. Report Message Modal */}
      {reportingMessage && (
        <ReportModal
          message={reportingMessage}
          onClose={() => setReportingMessage(null)}
          onSubmitReport={handleSubmitReport}
        />
      )}

      {/* 3. Community Rules Modal */}
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}

      {/* 4. Privacy Modal */}
      {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}

      {/* 5. About & FAQ Modal */}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}

      {/* 6. Admin Dashboard Portal (Houses Diagnostics & Developer Settings for Verified Admins Only) */}
      {showAdmin && (
        <AdminDashboard
          onClose={() => setShowAdmin(false)}
          onlineCount={onlineCount}
        />
      )}
    </div>
  );
}
